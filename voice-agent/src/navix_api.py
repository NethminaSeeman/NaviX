"""HTTP helpers for calling the NaviX Cloudflare Worker from the voice agent."""

from __future__ import annotations

import logging
import os
from typing import Any

import aiohttp

logger = logging.getLogger("navix_api")


def api_base_url() -> str:
    return (os.getenv("NAVIX_API_BASE_URL") or "http://127.0.0.1:8787").rstrip("/")


async def _request(
    method: str,
    path: str,
    *,
    token: str | None = None,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
) -> Any:
    url = f"{api_base_url()}{path}"
    headers: dict[str, str] = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if json_body is not None:
        headers["Content-Type"] = "application/json"

    timeout = aiohttp.ClientTimeout(total=45)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.request(
            method, url, headers=headers, params=params, json=json_body
        ) as res:
            text = await res.text()
            if res.status >= 400:
                logger.warning(
                    "NaviX API %s %s failed: %s %s", method, path, res.status, text[:300]
                )
                return {
                    "error": True,
                    "status": res.status,
                    "message": text[:500] or res.reason,
                }
            if not text:
                return {}
            try:
                return await res.json(content_type=None)
            except Exception:
                return {"raw": text}


async def ask_chat(
    query: str,
    *,
    token: str | None,
    lat: float | None = None,
    lon: float | None = None,
) -> str:
    body: dict[str, Any] = {"query": query}
    if lat is not None:
        body["lat"] = lat
    if lon is not None:
        body["lon"] = lon

    data = await _request("POST", "/chat", token=token, json_body=body)
    if isinstance(data, dict) and data.get("error"):
        return (
            "I could not reach the NaviX guide right now. "
            f"{data.get('message') or 'Please try again in a moment.'}"
        )

    answer = ""
    if isinstance(data, dict):
        answer = (
            data.get("voice_script")
            or data.get("answer")
            or data.get("response")
            or data.get("message")
            or ""
        )
    return str(answer).strip() or "I did not get a clear answer from the guide."


async def get_weather(lat: float, lon: float) -> str:
    data = await _request("GET", "/weather", params={"lat": lat, "lon": lon})
    if isinstance(data, dict) and data.get("error"):
        return "Weather is unavailable right now."

    if not isinstance(data, dict):
        return "Weather is unavailable right now."

    condition = data.get("condition") or data.get("description") or "unknown"
    temp = data.get("temperature")
    humidity = data.get("humidity")
    rain = data.get("rain")
    hints = data.get("safety_hints") or []

    parts = [f"Current conditions: {condition}."]
    if temp is not None:
        parts.append(f"Temperature about {temp} degrees Celsius.")
    if humidity is not None:
        parts.append(f"Humidity {humidity} percent.")
    if rain is True:
        parts.append("Rain is likely.")
    elif rain is False:
        parts.append("No rain expected right now.")
    if hints:
        parts.append("Tips: " + "; ".join(str(h) for h in hints[:3]))
    return " ".join(parts)


async def find_places(
    lat: float,
    lon: float,
    *,
    radius_km: float = 25,
    limit: int = 8,
) -> str:
    data = await _request(
        "GET",
        "/nearby",
        params={
            "lat": lat,
            "lon": lon,
            "radius": f"{radius_km}km",
            "limit": limit,
        },
    )
    if isinstance(data, dict) and data.get("error"):
        return "I could not look up nearby places right now."

    rows: list[Any] = []
    if isinstance(data, list):
        rows = data
    elif isinstance(data, dict):
        payload = data.get("data")
        if isinstance(payload, list):
            rows = payload

    if not rows:
        return "I did not find nearby places in that area."

    lines: list[str] = []
    for row in rows[:limit]:
        if not isinstance(row, dict):
            continue
        name = row.get("name") or "Unknown place"
        category = row.get("category") or ""
        dist = row.get("distance_km") or row.get("distanceKm")
        bit = name
        if category:
            bit += f" ({category})"
        if dist is not None:
            bit += f", about {dist} kilometers away"
        lines.append(bit)

    if not lines:
        return "I did not find nearby places in that area."
    return "Nearby places: " + "; ".join(lines) + "."
