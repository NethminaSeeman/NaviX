import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from agents.intent_agent import IntentAgent
from agents.nearby_agent import NearbyPlacesAgent
from agents.response_agent import FinalResponseAgent
from agents.tourism_agent import TourismKnowledgeAgent
from agents.weather_agent import WeatherAnalysisAgent
from models.request_models import (
    ChatRequest,
    ChatResponse,
    IntentResult,
    NearbyPlace,
    WeatherResponse,
)
from services.location_service import LocationService
from services.maps_service import MapsService
from services.openai_service import OpenAIService
from services.weather_service import WeatherService


logger = logging.getLogger("navix.chat")

router = APIRouter()

openai_service = OpenAIService()
location_service = LocationService()
weather_service = WeatherService()
maps_service = MapsService()

intent_agent = IntentAgent(openai_service)
nearby_agent = NearbyPlacesAgent(location_service)
tourism_agent = TourismKnowledgeAgent(openai_service)
weather_agent = WeatherAnalysisAgent()
response_agent = FinalResponseAgent(openai_service)


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
    weather = await _safe_weather(request.lat, request.lon)
    nearby = _safe_nearby(request.lat, request.lon)
    tourism_text = await _safe_tourism(query, intent, nearby)
    weather_advice = weather_agent.run(weather) if weather else None

    try:
        answer = await response_agent.run(
            query,
            intent,
            tourism_text,
            weather,
            weather_advice,
            nearby,
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
