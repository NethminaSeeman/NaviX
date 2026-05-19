import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from models.request_models import IntentResult, NearbyPlace, WeatherResponse
from services.agent_store import AgentStore
from services.location_service import LocationService, DISTRICT_COORDINATES
from services.weather_service import WeatherService

logger = logging.getLogger("navix.orchestrator")


class TripOrchestrator:
    """Coordinates weather and tourism agents for trip-planning queries.

    When a user says something like "I want to go to Colombo tomorrow", this
    orchestrator:
      1. Detects the travel_date and location from intent entities.
      2. Fetches the weather forecast for that location + date.
      3. If the forecast is bad (rain), finds alternative locations with
         better weather and recommends them.
    """

    def __init__(
        self,
        weather_service: WeatherService,
        location_service: LocationService,
        agent_store: AgentStore | None = None,
    ) -> None:
        self.weather = weather_service
        self.locations = location_service
        self.agent_store = agent_store

    async def run(
        self,
        query: str,
        intent: IntentResult,
        nearby: list[NearbyPlace],
    ) -> Optional[dict[str, Any]]:
        """Run orchestration. Returns context dict or None if not applicable."""
        travel_date = self._extract_travel_date(intent)
        location_name = self._extract_location(intent)

        if not travel_date or not location_name:
            return None

        # Resolve coordinates for the target location
        target_coords = self._resolve_coordinates(location_name, nearby)
        if not target_coords:
            return None

        # Fetch forecast for the target location
        target_forecast = await self._safe_forecast(
            target_coords["lat"], target_coords["lng"], travel_date
        )
        if not target_forecast:
            return None

        result: dict[str, Any] = {
            "trip_planning": True,
            "target_location": location_name,
            "travel_date": travel_date,
            "target_forecast": {
                "temperature": target_forecast.temperature,
                "humidity": target_forecast.humidity,
                "condition": target_forecast.condition,
                "rain": target_forecast.rain,
                "safety_hints": target_forecast.safety_hints,
            },
            "weather_is_bad": target_forecast.rain,
            "alternatives": [],
        }

        # If weather is bad, find alternative locations with better weather
        if target_forecast.rain:
            alternatives = await self._find_sunny_alternatives(
                location_name, travel_date
            )
            result["alternatives"] = alternatives

        if self.agent_store:
            self.agent_store.log(
                "trip_orchestrator",
                query,
                {
                    "location": location_name,
                    "travel_date": travel_date,
                    "target_coords": target_coords,
                },
                result,
                status="success",
            )

        return result

    def _extract_travel_date(self, intent: IntentResult) -> Optional[str]:
        """Extract and normalize the travel date from intent entities."""
        entities = intent.entities or {}
        raw_date = entities.get("travel_date")
        if not raw_date:
            return None

        raw = str(raw_date).lower().strip()
        now = datetime.now(timezone.utc)

        if raw == "today":
            return now.strftime("%Y-%m-%d")
        elif raw == "tomorrow":
            return (now + timedelta(days=1)).strftime("%Y-%m-%d")
        elif raw in ("this weekend",):
            # Find next Saturday
            days_ahead = 5 - now.weekday()  # Saturday = 5
            if days_ahead <= 0:
                days_ahead += 7
            return (now + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        elif raw in ("next week",):
            return (now + timedelta(days=7)).strftime("%Y-%m-%d")
        else:
            # Try to parse as ISO date
            try:
                parsed = datetime.fromisoformat(raw)
                return parsed.strftime("%Y-%m-%d")
            except ValueError:
                # Default to tomorrow for any unrecognized date reference
                return (now + timedelta(days=1)).strftime("%Y-%m-%d")

    def _extract_location(self, intent: IntentResult) -> Optional[str]:
        """Extract a location name from intent entities."""
        entities = intent.entities or {}
        for key in ("location", "district", "city", "place", "destination"):
            value = entities.get(key)
            if isinstance(value, str) and len(value.strip()) > 1:
                return value.strip()
        return None

    def _resolve_coordinates(
        self, location_name: str, nearby: list[NearbyPlace]
    ) -> Optional[dict[str, float]]:
        """Get coordinates for a location name."""
        # Check district coordinates lookup table
        key = location_name.lower().strip()
        if key in DISTRICT_COORDINATES:
            return DISTRICT_COORDINATES[key]

        # Check nearby places for a name match
        for place in nearby:
            if location_name.lower() in place.name.lower():
                return place.coordinates

        # Try the location service
        results = self.locations.search_by_name(location_name, limit=1)
        if results:
            return results[0].coordinates

        return None

    async def _safe_forecast(
        self, lat: float, lng: float, date_str: str
    ) -> Optional[WeatherResponse]:
        """Fetch forecast, returning None on any error."""
        try:
            return await self.weather.get_forecast(lat, lng, date_str)
        except Exception as exc:
            logger.warning("Forecast fetch failed: %s", exc)
            return None

    async def _find_sunny_alternatives(
        self, exclude_location: str, travel_date: str, max_alternatives: int = 3
    ) -> list[dict[str, Any]]:
        """Find locations in different areas that have good weather on the target date."""
        exclude_key = exclude_location.lower().strip()

        # Pick candidate districts that are geographically spread across Sri Lanka
        candidates = [
            ("Kandy", DISTRICT_COORDINATES.get("kandy")),
            ("Galle", DISTRICT_COORDINATES.get("galle")),
            ("Sigiriya", DISTRICT_COORDINATES.get("sigiriya")),
            ("Ella", DISTRICT_COORDINATES.get("ella")),
            ("Negombo", DISTRICT_COORDINATES.get("negombo")),
            ("Trincomalee", DISTRICT_COORDINATES.get("trincomalee")),
            ("Anuradhapura", DISTRICT_COORDINATES.get("anuradhapura")),
            ("Nuwara Eliya", DISTRICT_COORDINATES.get("nuwara eliya")),
        ]

        alternatives: list[dict[str, Any]] = []
        for name, coords in candidates:
            if name.lower() == exclude_key or not coords:
                continue

            forecast = await self._safe_forecast(
                coords["lat"], coords["lng"], travel_date
            )
            if forecast and not forecast.rain:
                # Get top places in this area
                places = self.locations.search_by_district(name, limit=3)
                place_names = [p.name for p in places[:3]] if places else []

                alternatives.append({
                    "location": name,
                    "forecast": {
                        "temperature": forecast.temperature,
                        "condition": forecast.condition,
                        "rain": forecast.rain,
                    },
                    "top_attractions": place_names,
                })

                if len(alternatives) >= max_alternatives:
                    break

        return alternatives
