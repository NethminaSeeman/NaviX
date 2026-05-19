import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from agents.intent_agent import IntentAgent
from agents.nearby_agent import NearbyPlacesAgent
from agents.response_agent import FinalResponseAgent
from agents.tourism_agent import TourismKnowledgeAgent
from agents.weather_agent import WeatherAnalysisAgent
from agents.orchestrator import TripOrchestrator
from models.request_models import (
    ChatRequest,
    ChatResponse,
    IntentResult,
    NearbyPlace,
    WeatherResponse,
)
from services.location_service import LocationService
from services.agent_store import AgentStore
from services.maps_service import MapsService
from services.openai_service import OpenAIService
from services.weather_service import WeatherService


logger = logging.getLogger("navix.chat")

router = APIRouter()

openai_service = OpenAIService()
location_service = LocationService()
weather_service = WeatherService()
maps_service = MapsService()
agent_store = AgentStore()

intent_agent = IntentAgent(openai_service, agent_store)
nearby_agent = NearbyPlacesAgent(location_service, agent_store)
tourism_agent = TourismKnowledgeAgent(openai_service, agent_store)
weather_agent = WeatherAnalysisAgent(agent_store)
response_agent = FinalResponseAgent(openai_service, agent_store)
trip_orchestrator = TripOrchestrator(weather_service, location_service, agent_store)


async def _safe_intent(query: str) -> IntentResult:
    """Run the intent agent, falling back to GENERAL on failure."""
    try:
        return await intent_agent.run(query)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Intent agent failed, using fallback: %s", exc)
        return IntentResult(
            intent="GENERAL",
            confidence=0.5,
            entities={},
            needs_weather=False,
            needs_nearby=False,
        )


async def _safe_weather(
    lat: Optional[float], lon: Optional[float]
) -> Optional[WeatherResponse]:
    if lat is None or lon is None:
        return None
    try:
        return await weather_service.get_current_weather(lat, lon)
    except Exception as exc:
        logger.warning("Weather lookup failed: %s", exc)
        return None


def _safe_nearby(lat: Optional[float], lon: Optional[float]) -> list[NearbyPlace]:
    if lat is None or lon is None:
        return []
    try:
        return nearby_agent.run(lat, lon)
    except Exception as exc:
        logger.warning("Nearby lookup failed: %s", exc)
        return []


def _extract_location_entity(intent: IntentResult) -> Optional[str]:
    """Extract a location name from intent entities if present."""
    entities = intent.entities or {}
    for key in ("location", "district", "city", "place", "destination", "area"):
        value = entities.get(key)
        if isinstance(value, str) and len(value.strip()) > 1:
            return value.strip()
    return None


def _get_district_places(
    intent: IntentResult, query: str
) -> list[NearbyPlace]:
    """Look up places by district/name extracted from intent entities or query."""
    location_name = _extract_location_entity(intent)
    if location_name:
        places = location_service.search_by_district(location_name, limit=10)
        if places:
            return places

    # Try name-based search from the query itself for common Sri Lankan place names
    name_results = location_service.search_by_name(query, limit=5)
    return name_results


def _merge_nearby(
    gps_nearby: list[NearbyPlace],
    district_nearby: list[NearbyPlace],
) -> list[NearbyPlace]:
    """Merge GPS-nearby and district-search results, deduplicating by ID.
    District results come first (they're more relevant to the user's question)."""
    seen_ids: set[str] = set()
    merged: list[NearbyPlace] = []

    for place in district_nearby:
        if place.id not in seen_ids:
            seen_ids.add(place.id)
            merged.append(place)

    for place in gps_nearby:
        if place.id not in seen_ids:
            seen_ids.add(place.id)
            merged.append(place)

    return merged


async def _safe_tourism(query: str, intent: IntentResult, nearby: list[NearbyPlace]) -> str:
    try:
        return await tourism_agent.run(query, intent, nearby)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Tourism agent failed: %s", exc)
        return ""


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    query = request.query or request.prompt or ""

    intent = await _safe_intent(query)

    # GPS-based nearby places
    gps_nearby = _safe_nearby(request.lat, request.lon)

    # District/name-based search from intent entities
    district_nearby = _get_district_places(intent, query)

    # Merge: district results take priority over GPS results
    nearby = _merge_nearby(gps_nearby, district_nearby) if district_nearby else gps_nearby

    weather = await _safe_weather(request.lat, request.lon)
    tourism_text = await _safe_tourism(query, intent, nearby)
    weather_advice = weather_agent.run(weather) if weather else None

    # --- Trip Orchestration ---
    # If the user mentions a travel date and a location, run the orchestrator
    orchestrator_context = None
    try:
        orchestrator_context = await trip_orchestrator.run(query, intent, nearby)
    except Exception as exc:
        logger.warning("Trip orchestrator failed: %s", exc)

    try:
        answer = await response_agent.run(
            query,
            intent,
            tourism_text,
            weather,
            weather_advice,
            nearby,
            orchestrator_context,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Final response agent failed")
        raise HTTPException(
            status_code=502,
            detail=f"Response generation failed: {exc}",
        ) from exc

    matched = nearby[0].coordinates if nearby else None
    return ChatResponse(
        answer=answer,
        voice_script=answer,
        intent=intent,
        weather=weather,
        nearby=nearby,
        matched_location_coordinates=matched,
    )


@router.get("/weather")
async def weather(lat: float = Query(...), lon: float = Query(...)):
    try:
        return await weather_service.get_current_weather(lat, lon)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Weather lookup failed: {exc}") from exc


@router.get("/nearby")
async def nearby(lat: float = Query(...), lon: float = Query(...)):
    try:
        places = nearby_agent.run(lat, lon)
        return [
            {
                **place.model_dump(),
                "directions_url": maps_service.directions_url(
                    lat,
                    lon,
                    place.coordinates["lat"],
                    place.coordinates["lng"],
                ),
            }
            for place in places
        ]
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Nearby lookup failed: {exc}") from exc


@router.get("/health")
async def health():
    return {"status": "ok", "service": "navix-fastapi-agents"}


@router.get("/agents/logs")
async def agent_logs(limit: int = Query(50, ge=1, le=500)):
    return {"count": limit, "data": agent_store.recent(limit)}
