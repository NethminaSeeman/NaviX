from fastapi import APIRouter, HTTPException, Query

from agents.intent_agent import IntentAgent
from agents.nearby_agent import NearbyPlacesAgent
from agents.response_agent import FinalResponseAgent
from agents.tourism_agent import TourismKnowledgeAgent
from agents.weather_agent import WeatherAnalysisAgent
from models.request_models import ChatRequest, ChatResponse
from services.location_service import LocationService
from services.maps_service import MapsService
from services.openai_service import OpenAIService
from services.weather_service import WeatherService

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


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        intent = await intent_agent.run(request.query)
        weather = await weather_service.get_current_weather(request.lat, request.lon)
        nearby = nearby_agent.run(request.lat, request.lon)
        tourism_text = await tourism_agent.run(request.query, intent, nearby)
        weather_advice = weather_agent.run(weather)
        answer = await response_agent.run(
            request.query,
            intent,
            tourism_text,
            weather,
            weather_advice,
            nearby,
        )
        matched = nearby[0].coordinates if nearby else None
        return ChatResponse(
            answer=answer,
            voice_script=answer,
            intent=intent,
            weather=weather,
            nearby=nearby,
            matched_location_coordinates=matched,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat pipeline failed: {exc}") from exc


@router.get("/weather")
async def weather(lat: float = Query(...), lon: float = Query(...)):
    try:
        return await weather_service.get_current_weather(lat, lon)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Weather lookup failed: {exc}") from exc


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
        raise HTTPException(status_code=500, detail=f"Nearby lookup failed: {exc}") from exc


@router.get("/health")
async def health():
    return {"status": "ok", "service": "navix-fastapi-agents"}
