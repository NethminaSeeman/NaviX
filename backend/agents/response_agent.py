import json
from typing import Optional

from models.request_models import IntentResult, NearbyPlace, WeatherResponse
from services.openai_service import OpenAIService


SYSTEM_PROMPT = """
You are the NaviX Final Response Formatter Agent for a Sri Lankan tourism assistant.
Combine all agent outputs into one natural, conversational, voice-friendly response.
No markdown. No bullet lists. No robotic formatting.
Keep it practical, short, warm, and tourism-focused.
Mention nearest attractions when useful and adapt advice to weather.
If `weather` is null, do not invent weather facts -- just answer the user's question generally.
If `nearby_places` is empty, do not invent attractions; offer general Sri Lankan suggestions instead.
Always reply in the same language as the user's query.
"""


class FinalResponseAgent:
    def __init__(self, openai_service: OpenAIService) -> None:
        self.openai = openai_service

    async def run(
        self,
        query: str,
        intent: IntentResult,
        tourism_text: str,
        weather: Optional[WeatherResponse],
        weather_advice: Optional[str],
        nearby: list[NearbyPlace],
    ) -> str:
        payload = {
            "query": query,
            "intent": intent.model_dump(),
            "tourism_agent_output": tourism_text,
            "weather": weather.model_dump() if weather else None,
            "weather_advice": weather_advice,
            "nearby_places": [place.model_dump() for place in nearby],
        }
        return await self.openai.complete(
            SYSTEM_PROMPT,
            json.dumps(payload, ensure_ascii=False),
            temperature=0.45,
        )
