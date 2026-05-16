import json
import os
from typing import Any, Dict, List, Literal, Optional

import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError


api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not set")
genai.configure(api_key=api_key)


class IntentAnalysis(BaseModel):
    category: Literal["HISTORY", "ROUTING", "WEATHER", "GENERAL"] = Field(
        description="Primary classification of user intent matrix."
    )
    entities: List[str] = Field(
        default_factory=list,
        description="Extracted key proper nouns, structures, or historical keywords.",
    )
    requires_immediate_action: bool = Field(
        description="Flags critical safety or navigation overrides."
    )


class WeatherConstraints(BaseModel):
    is_outdoor_viable: bool = Field(
        description="False if precipitation, UV index, or high warnings prohibit outdoor touring."
    )
    operational_override: Literal["NONE", "RECOMMEND_INDOOR", "SEEK_SHELTER"] = Field(
        description="Actionable behavioral boundary imposed by localized climate conditions."
    )
    advisory_snippet: str = Field(
        description="Ultra-dense audio snippet regarding gear or clothing adjustments."
    )


class GroundedHeritage(BaseModel):
    matched_landmark: str = Field(
        description="Exact historical site name matching the provided database payload."
    )
    factual_bulletin: str = Field(
        description="High-density historical validation data sourced strictly from the context."
    )
    etiquette_constraints: List[str] = Field(
        default_factory=list,
        description="Cultural rules, dress codes, or regional entry behaviors.",
    )


class NaviXEnginePayload(BaseModel):
    intent_agent: IntentAnalysis
    weather_agent: WeatherConstraints
    heritage_agent: GroundedHeritage
    voice_script: str = Field(
        description=(
            "Final synthesized audio script. Must be free of Markdown, bullets, and headers."
        )
    )


class NaviXRequest(BaseModel):
    message: str
    lat: float
    lng: float
    weather_data: Optional[Dict[str, Any]] = None


UNKNOWN_FALLBACK = (
    "I don't have the deep history on this specific spot yet, but let's explore what's nearby!"
)

NAVI_X_SYSTEM_INSTRUCTION = f"""
ROLE: You are the core multi-agent execution pipeline of NaviX, a localized real-time digital tour guide for Sri Lanka.

SUB-AGENT ALIGNMENT DIRECTIVES:
1) intent_extraction_agent:
   - Classify intent into HISTORY, ROUTING, WEATHER, or GENERAL.
   - Extract key entities.
   - Set requires_immediate_action for urgent safety/navigation concerns.

2) weather_analytics_agent:
   - Evaluate weather context.
   - Set is_outdoor_viable and one operational_override from NONE, RECOMMEND_INDOOR, SEEK_SHELTER.
   - Provide a concise advisory_snippet.

3) heritage_knowledge_agent:
   - Ground history strictly in database_context.
   - Never invent facts.
   - If context is missing/empty/mismatch, set matched_landmark to "Unknown".

4) voice_formatter_agent:
   - Return natural spoken text only (no markdown, no bullets, no headers).
   - If matched_landmark is "Unknown", voice_script MUST be exactly:
     "{UNKNOWN_FALLBACK}"

OUTPUT REQUIREMENT:
Return valid JSON ONLY matching this schema exactly.
"""


def _extract_json(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if len(lines) >= 3:
            return "\n".join(lines[1:-1]).strip()
    return stripped


def run_navix_pipeline(
    user_query: str, database_payload: Dict[str, Any], weather_payload: Dict[str, Any]
) -> NaviXEnginePayload:
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=NAVI_X_SYSTEM_INSTRUCTION,
    )

    execution_context = f"""
<state_vectors>
  <user_query>{user_query}</user_query>
  <database_context>{json.dumps(database_payload, ensure_ascii=True)}</database_context>
  <weather_context>{json.dumps(weather_payload, ensure_ascii=True)}</weather_context>
</state_vectors>
TASK: Return the compiled payload matching the strict schema.
"""

    response = model.generate_content(
        execution_context,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=NaviXEnginePayload.model_json_schema(),
            temperature=0.1,
            max_output_tokens=1200,
        ),
    )

    raw = _extract_json(response.text or "")
    if not raw:
        raise RuntimeError("Gemini returned an empty payload")

    try:
        payload = NaviXEnginePayload.model_validate_json(raw)
    except ValidationError as exc:
        raise RuntimeError(f"Structured response validation failed: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Gemini returned non-JSON content: {exc}") from exc

    if payload.heritage_agent.matched_landmark == "Unknown":
        payload.voice_script = UNKNOWN_FALLBACK

    return payload


app = FastAPI(title="NaviX Core Intelligence Engine")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/navix/chat")
async def process_tourist_interaction(payload: NaviXRequest) -> Dict[str, Any]:
    try:
        mock_mongodb_payload = {
            "nearest_site": "Sigiriya Rock Fortress",
            "district": "Matale",
            "distance_meters": 45,
            "verified_history": (
                "Built by King Kashyapa in the 5th century AD. Features a gateway shaped "
                "like an enormous lion, and advanced ancient hydraulic infrastructure."
            ),
            "cultural_rules": (
                "No graffiti allowed. Moderate climbing stamina required. Keep hold of loose "
                "personal belongings due to high winds and local wildlife."
            ),
        }

        weather_context = payload.weather_data or {
            "temp": 30.2,
            "condition": "Cloudy",
            "humidity": 80,
        }

        orchestration_result = run_navix_pipeline(
            user_query=payload.message,
            database_payload=mock_mongodb_payload,
            weather_payload=weather_context,
        )
        return {"status": "success", "payload": orchestration_result.model_dump()}
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"NaviX Pipeline Exception: {str(exc)}",
        ) from exc
