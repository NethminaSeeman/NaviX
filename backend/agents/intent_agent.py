from models.request_models import IntentResult
from services.openai_service import OpenAIService
from utils.response_parser import extract_json_object


SYSTEM_PROMPT = """
You are the NaviX Intent Detection Agent for Sri Lankan tourism.
Classify the user's travel query into one category:
HISTORY, ROUTE, FOOD, WEATHER, BEACH, CULTURE, GENERAL.
Return only JSON with: intent, confidence, entities, needs_weather, needs_nearby.
Stay tourism-focused and do not invent entities.
"""


class IntentAgent:
    def __init__(self, openai_service: OpenAIService) -> None:
        self.openai = openai_service

    async def run(self, query: str) -> IntentResult:
        fallback = {
            "intent": "GENERAL",
            "confidence": 0.55,
            "entities": {},
            "needs_weather": True,
            "needs_nearby": True,
        }
        text = await self.openai.complete(SYSTEM_PROMPT, query, temperature=0)
        parsed = extract_json_object(text, fallback)
        return IntentResult(**{**fallback, **parsed})
