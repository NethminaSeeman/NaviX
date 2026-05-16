from typing import Any, Literal

from pydantic import BaseModel, Field


IntentCategory = Literal[
    "HISTORY",
    "ROUTE",
    "FOOD",
    "WEATHER",
    "BEACH",
    "CULTURE",
    "GENERAL",
]


class ChatRequest(BaseModel):
    lat: float = Field(..., description="User latitude")
    lon: float = Field(..., description="User longitude")
    query: str = Field(..., min_length=1, description="User spoken question")


class WeatherResponse(BaseModel):
    temperature: float
    humidity: int
    condition: str
    rain: bool
    safety_hints: list[str]


class NearbyPlace(BaseModel):
    id: str
    name: str
    category: str
    tags: list[str] = []
    distance_km: float
    coordinates: dict[str, float]
    deep_history: dict[str, Any] = {}
    tts_hints: dict[str, Any] = {}


class IntentResult(BaseModel):
    intent: IntentCategory
    confidence: float = Field(ge=0, le=1)
    entities: dict[str, Any] = {}
    needs_weather: bool = False
    needs_nearby: bool = True


class ChatResponse(BaseModel):
    answer: str
    intent: IntentResult
    weather: WeatherResponse
    nearby: list[NearbyPlace]
    matched_location_coordinates: dict[str, float] | None = None
    voice_script: str
