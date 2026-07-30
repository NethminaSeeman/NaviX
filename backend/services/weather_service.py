import os
from datetime import datetime, timedelta, timezone
from math import sin
from typing import Optional

import httpx

from models.request_models import WeatherResponse


class WeatherService:
    CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"
    FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"

    @staticmethod
    def _get_api_key() -> Optional[str]:
        key = os.getenv("OPENWEATHER_API_KEY", "").strip()
        return key if key else None

    async def get_current_weather(self, lat: float, lon: float) -> WeatherResponse:
        api_key = self._get_api_key()
        if not api_key:
            return self._mock_weather(lat, lon)

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                self.CURRENT_URL,
                params={"lat": lat, "lon": lon, "appid": api_key, "units": "metric"},
            )
            response.raise_for_status()
            data = response.json()

        condition = data["weather"][0]["description"]
        rain = "rain" in condition.lower() or bool(data.get("rain"))
        temp = float(data["main"]["temp"])
        humidity = int(data["main"]["humidity"])

        hints = []
        if rain:
            hints.append("Carry a raincoat and prioritize indoor or covered attractions.")
        if temp >= 31:
            hints.append("Plan outdoor visits early morning or late afternoon and stay hydrated.")
        if humidity >= 80:
            hints.append("Expect humid conditions; wear light breathable clothing.")
        if not hints:
            hints.append("Weather looks suitable for outdoor sightseeing.")

        return WeatherResponse(
            temperature=temp,
            humidity=humidity,
            condition=condition,
            rain=rain,
            safety_hints=hints,
        )

    async def get_forecast(
        self, lat: float, lon: float, target_date: Optional[str] = None
    ) -> WeatherResponse:
        """Fetch a weather forecast for a future date.

        Uses the OpenWeatherMap 5-day/3-hour forecast API. Falls back to mock
        data when no API key is configured. `target_date` should be ISO format
        (YYYY-MM-DD). If omitted, defaults to tomorrow.
        """
        if target_date is None:
            target = datetime.now(timezone.utc) + timedelta(days=1)
        else:
            try:
                target = datetime.fromisoformat(target_date).replace(tzinfo=timezone.utc)
            except ValueError:
                target = datetime.now(timezone.utc) + timedelta(days=1)

        api_key = self._get_api_key()
        if not api_key:
            return self._mock_forecast(lat, lon, target)

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                self.FORECAST_URL,
                params={"lat": lat, "lon": lon, "appid": api_key, "units": "metric"},
            )
            response.raise_for_status()
            data = response.json()

        # Find the forecast entry closest to noon on the target date
        target_noon = target.replace(hour=12, minute=0, second=0, microsecond=0)
        best_entry = None
        best_diff = float("inf")

        for entry in data.get("list", []):
            entry_time = datetime.fromtimestamp(entry["dt"], tz=timezone.utc)
            diff = abs((entry_time - target_noon).total_seconds())
            if diff < best_diff:
                best_diff = diff
                best_entry = entry

        if not best_entry:
            return self._mock_forecast(lat, lon, target)

        condition = best_entry["weather"][0]["description"]
        rain = "rain" in condition.lower() or bool(best_entry.get("rain"))
        temp = float(best_entry["main"]["temp"])
        humidity = int(best_entry["main"]["humidity"])

        hints = []
        if rain:
            hints.append("Rain is forecast — carry a raincoat and have indoor backup plans.")
        if temp >= 31:
            hints.append("Expect hot weather — plan early morning or sunset activities.")
        if humidity >= 80:
            hints.append("High humidity expected; wear breathable clothing.")
        if not hints:
            hints.append("Forecast looks good for outdoor sightseeing.")

        return WeatherResponse(
            temperature=temp,
            humidity=humidity,
            condition=condition,
            rain=rain,
            safety_hints=hints,
        )

    @staticmethod
    def _mock_weather(lat: float, lon: float) -> WeatherResponse:
        """Deterministic mock for local dev when no API key is set."""
        seed = abs(sin(lat * 12.9898 + lon * 78.233))
        temperature = round(26 + seed * 6, 1)
        humidity = 60 + round(seed * 30)
        rain = seed > 0.7
        condition = "Light rain" if rain else "Partly cloudy"

        hints = []
        if rain:
            hints.append("Carry a light rain jacket or umbrella.")
        if temperature >= 31:
            hints.append("Stay hydrated and avoid long midday sun exposure.")
        if humidity >= 80:
            hints.append("High humidity — wear breathable clothing.")
        if not hints:
            hints.append("Pleasant conditions — great time to be outdoors.")

        return WeatherResponse(
            temperature=temperature,
            humidity=humidity,
            condition=condition,
            rain=rain,
            safety_hints=hints,
        )

    @staticmethod
    def _mock_forecast(
        lat: float, lon: float, target: datetime
    ) -> WeatherResponse:
        """Deterministic mock forecast for a future date."""
        day_seed = abs(sin(lat * 12.9898 + lon * 78.233 + target.day * 3.14))
        temperature = round(25 + day_seed * 8, 1)
        humidity = 55 + round(day_seed * 35)
        rain = day_seed > 0.6
        condition = "Light rain showers" if rain else "Mostly sunny"

        hints = []
        if rain:
            hints.append("Rain is in the forecast — carry a raincoat and plan indoor alternatives.")
        if temperature >= 31:
            hints.append("Warm day ahead — plan early starts and hydration breaks.")
        if humidity >= 80:
            hints.append("Humid conditions expected — dress lightly.")
        if not hints:
            hints.append("Good weather forecast for outdoor activities.")

        return WeatherResponse(
            temperature=temperature,
            humidity=humidity,
            condition=condition,
            rain=rain,
            safety_hints=hints,
        )
