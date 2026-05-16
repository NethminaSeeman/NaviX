import json
from typing import Any


def extract_json_object(text: str, fallback: dict[str, Any]) -> dict[str, Any]:
    """Parse strict JSON from model output, with a defensive fallback."""
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else fallback
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                parsed = json.loads(text[start : end + 1])
                return parsed if isinstance(parsed, dict) else fallback
            except json.JSONDecodeError:
                return fallback
        return fallback
