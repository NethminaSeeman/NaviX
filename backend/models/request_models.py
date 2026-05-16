from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, model_validator


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
    """Chat input. `lat`/`lon` are optional so users can ask general
    questions without granting geolocation. `prompt` is accepted as an alias
    for `query` to keep the older frontend payload working."""

    lat: Optional[float] = Field(default=None, description="User latitude (optional)")
    lon: Optional[float] = Field(default=None, description="User longitude (optional)")
    query: Optional[str] = Field(default=None, min_length=1, description="User spoken question")
    prompt: Optional[str] = Field(default=None, min_length=1, description="Alias for query")
    context: Optional[Any] = Field(default=None, description="Free-form client context (ignored server-side)")

    @model_validator(mode="after")
    def _coerce_query(self) -> "ChatRequest":
        if not self.query and self.prompt:
            self.query = self.prompt
        if not self.query:
            raise ValueError("Either 'query' or 'prompt' is required.")
        return self


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
    weather: Optional[WeatherResponse] = None
    nearby: list[NearbyPlace] = []
    matched_location_coordinates: Optional[dict[str, float]] = None
    voice_script: str
