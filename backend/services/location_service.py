import json
from pathlib import Path
from typing import Any

from models.request_models import NearbyPlace
from utils.haversine import haversine_km


class LocationService:
    def __init__(self, data_path: str = "data/tourism_data.json") -> None:
        path = Path(__file__).resolve().parents[1] / data_path
        with path.open("r", encoding="utf-8") as file:
            self.locations: list[dict[str, Any]] = json.load(file)

    @staticmethod
    def _coordinates(location: dict[str, Any]) -> dict[str, float]:
        lng, lat = location.get("coordinates", {}).get("coordinates", [None, None])
        return {"lat": float(lat), "lng": float(lng)}

    def nearest_places(
        self,
        lat: float,
        lon: float,
        limit: int = 5,
        radius_km: float | None = None,
    ) -> list[NearbyPlace]:
        ranked = []
        for location in self.locations:
            coords = self._coordinates(location)
            distance = haversine_km(lat, lon, coords["lat"], coords["lng"])
            if radius_km is not None and distance > radius_km:
                continue
            ranked.append((distance, location, coords))

        ranked.sort(key=lambda item: item[0])

        return [
            NearbyPlace(
                id=location.get("location_id", location.get("name", "unknown")),
                name=location.get("name", "Unknown location"),
                category=location.get("category", "attraction"),
                tags=location.get("tags", []),
                distance_km=distance,
                coordinates=coords,
                deep_history=location.get("deep_history", {}),
                tts_hints=location.get("tts_hints", {}),
            )
            for distance, location, coords in ranked[:limit]
        ]
