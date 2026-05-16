import os

import httpx

from models.request_models import WeatherResponse


class WeatherService:
    BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

    async def get_current_weather(self, lat: float, lon: float) -> WeatherResponse:
        api_key = os.getenv("OPENWEATHER_API_KEY")
        if not api_key:
            raise RuntimeError("OPENWEATHER_API_KEY is not configured.")

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                self.BASE_URL,
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
