import json

from models.request_models import IntentResult, NearbyPlace
from services.openai_service import OpenAIService


SYSTEM_PROMPT = """
You are the NaviX Tourism Knowledge Agent.
Use Sri Lankan tourism context, nearby attractions, and cultural sensitivity.
Give practical recommendations, historical context, activity ideas, and local tips.
Avoid hallucinating facts that are not supported by the provided nearby context.
Write concise, voice-ready text.
"""


class TourismKnowledgeAgent:
    def __init__(self, openai_service: OpenAIService) -> None:
        self.openai = openai_service

    async def run(self, query: str, intent: IntentResult, nearby: list[NearbyPlace]) -> str:
        context = {
            "intent": intent.model_dump(),
            "nearby_places": [place.model_dump() for place in nearby],
        }
        return await self.openai.complete(
            SYSTEM_PROMPT,
            f"User query: {query}\nTourism context JSON: {json.dumps(context, ensure_ascii=False)}",
            temperature=0.35,
        )
