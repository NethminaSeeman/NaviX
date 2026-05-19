import json

from models.request_models import IntentResult, NearbyPlace
from services.agent_store import AgentStore
from services.openai_service import OpenAIService


SYSTEM_PROMPT = """
You are the NaviX Tourism Knowledge Agent.
Use Sri Lankan tourism context, nearby attractions, and cultural sensitivity.
Give practical recommendations, historical context, activity ideas, and local tips.
Avoid hallucinating facts that are not supported by the provided nearby context.
Write concise, voice-ready text.

IMPORTANT: When the user asks about a specific district or city (e.g. "Colombo", "Kandy", "Galle"),
you MUST prioritise the locations from the provided context that are actually in or near that
district. Mention them by name and give concrete details from their summaries. Do NOT give
generic advice when specific locations are available in the context.
"""


class TourismKnowledgeAgent:
    def __init__(
        self, openai_service: OpenAIService, agent_store: AgentStore | None = None
    ) -> None:
        self.openai = openai_service
        self.agent_store = agent_store

    async def run(self, query: str, intent: IntentResult, nearby: list[NearbyPlace]) -> str:
        context = {
            "intent": intent.model_dump(),
            "nearby_places": [place.model_dump() for place in nearby],
        }
        prompt = f"User query: {query}\nTourism context JSON: {json.dumps(context, ensure_ascii=False)}"
        try:
            output = await self.openai.complete(
                SYSTEM_PROMPT,
                prompt,
                temperature=0.35,
            )
            if self.agent_store:
                self.agent_store.log(
                    "tourism_agent",
                    query,
                    context,
                    {"text": output},
                    status="success",
                )
            return output
        except Exception as exc:
            if self.agent_store:
                self.agent_store.log(
                    "tourism_agent",
                    query,
                    context,
                    {"text": ""},
                    status="error",
                    error_text=str(exc),
                )
            raise
