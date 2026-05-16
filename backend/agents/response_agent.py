import json

from models.request_models import IntentResult, NearbyPlace, WeatherResponse
from services.openai_service import OpenAIService


SYSTEM_PROMPT = """
You are the NaviX Final Response Formatter Agent.
Combine all agent outputs into one natural, conversational, voice-friendly response.
No markdown. No bullet lists. No robotic formatting.
Keep it practical, short, warm, and tourism-focused.
Mention nearest attractions when useful and adapt advice to weather.
"""


class FinalResponseAgent:
    def __init__(self, openai_service: OpenAIService) -> None:
        self.openai = openai_service

    async def run(
        self,
        query: str,
        intent: IntentResult,
        tourism_text: str,
        weather: WeatherResponse,
        weather_advice: str,
        nearby: list[NearbyPlace],
    ) -> str:
        payload = {
            "query": query,
            "intent": intent.model_dump(),
            "tourism_agent_output": tourism_text,
            "weather": weather.model_dump(),
            "weather_advice": weather_advice,
            "nearby_places": [place.model_dump() for place in nearby],
        }
        return await self.openai.complete(
            SYSTEM_PROMPT,
            json.dumps(payload, ensure_ascii=False),
            temperature=0.45,
        )
