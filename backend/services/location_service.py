import json
from pathlib import Path
from typing import Any

from models.request_models import NearbyPlace
from utils.haversine import haversine_km


# Mapping of Sri Lankan districts to approximate center coordinates
DISTRICT_COORDINATES: dict[str, dict[str, float]] = {
    "colombo": {"lat": 6.9271, "lng": 79.8612},
    "gampaha": {"lat": 7.0840, "lng": 80.0098},
    "kalutara": {"lat": 6.5854, "lng": 80.1140},
    "kandy": {"lat": 7.2906, "lng": 80.6337},
    "matale": {"lat": 7.4711, "lng": 80.6234},
    "nuwara eliya": {"lat": 6.9497, "lng": 80.7891},
    "galle": {"lat": 6.0535, "lng": 80.2210},
    "matara": {"lat": 5.9549, "lng": 80.5550},
    "hambantota": {"lat": 6.1429, "lng": 81.1212},
    "jaffna": {"lat": 9.6615, "lng": 80.0255},
    "kilinochchi": {"lat": 9.3803, "lng": 80.3770},
    "mannar": {"lat": 8.9810, "lng": 79.9044},
    "mullaitivu": {"lat": 9.2671, "lng": 80.8142},
    "vavuniya": {"lat": 8.7514, "lng": 80.4971},
    "trincomalee": {"lat": 8.5874, "lng": 81.2152},
    "batticaloa": {"lat": 7.7310, "lng": 81.6747},
    "ampara": {"lat": 7.2975, "lng": 81.6820},
    "kurunegala": {"lat": 7.4863, "lng": 80.3647},
    "puttalam": {"lat": 8.0322, "lng": 79.8283},
    "anuradhapura": {"lat": 8.3114, "lng": 80.4037},
    "polonnaruwa": {"lat": 7.9403, "lng": 81.0003},
    "badulla": {"lat": 6.9934, "lng": 81.0550},
    "monaragala": {"lat": 6.8728, "lng": 81.3507},
    "ratnapura": {"lat": 6.6828, "lng": 80.3992},
    "kegalle": {"lat": 7.2513, "lng": 80.3464},
    "sigiriya": {"lat": 7.9570, "lng": 80.7603},
    "ella": {"lat": 6.8754, "lng": 81.0465},
    "dambulla": {"lat": 7.8568, "lng": 80.6491},
    "mirissa": {"lat": 5.9453, "lng": 80.4546},
    "negombo": {"lat": 7.2096, "lng": 79.8380},
    "bentota": {"lat": 6.4262, "lng": 79.9994},
    "hikkaduwa": {"lat": 6.1395, "lng": 80.1037},
    "unawatuna": {"lat": 6.0107, "lng": 80.2494},
    "arugam bay": {"lat": 6.8406, "lng": 81.8347},
    "tangalle": {"lat": 6.0243, "lng": 80.7946},
    "weligama": {"lat": 5.9740, "lng": 80.4292},
}


class LocationService:
    def __init__(self, data_path: str = "data/tourism_data.json") -> None:
        path = Path(__file__).resolve().parents[1] / data_path
        with path.open("r", encoding="utf-8") as file:
            self.locations: list[dict[str, Any]] = json.load(file)

    @staticmethod
    def _coordinates(location: dict[str, Any]) -> dict[str, float]:
        lng, lat = location.get("coordinates", {}).get("coordinates", [None, None])
        return {"lat": float(lat), "lng": float(lng)}

    def nearest_places(self, lat: float, lon: float, limit: int = 5) -> list[NearbyPlace]:
        ranked = []
        for location in self.locations:
            coords = self._coordinates(location)
            distance = haversine_km(lat, lon, coords["lat"], coords["lng"])
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

    def search_by_district(self, district: str, limit: int = 10) -> list[NearbyPlace]:
        """Search for places that match a district or city name.

        Looks at location name, tags, deep_history summary and category to find
        locations that are relevant to the given district/city.
        """
        query = district.lower().strip()
        if not query:
            return []

        # Get approximate center coordinates for the district if known
        center = DISTRICT_COORDINATES.get(query)

        matches: list[tuple[float, dict[str, Any], dict[str, float]]] = []
        for location in self.locations:
            coords = self._coordinates(location)
            score = self._district_relevance_score(location, query)
            if score > 0:
                if center:
                    distance = haversine_km(center["lat"], center["lng"], coords["lat"], coords["lng"])
                else:
                    distance = 0.0
                matches.append((distance, location, coords))

        # If no tag/name matches, fall back to proximity search around district center
        if not matches and center:
            return self.nearest_places(center["lat"], center["lng"], limit)

        matches.sort(key=lambda item: item[0])
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
            for distance, location, coords in matches[:limit]
        ]

    def search_by_name(self, query: str, limit: int = 5) -> list[NearbyPlace]:
        """Fuzzy text search across location names, tags, and summaries."""
        q = query.lower().strip()
        if not q:
            return []

        results: list[tuple[int, dict[str, Any], dict[str, float]]] = []
        for location in self.locations:
            coords = self._coordinates(location)
            score = 0

            name = (location.get("name") or "").lower()
            if q in name:
                score += 10
            if name.startswith(q):
                score += 5

            tags_str = " ".join(str(t).lower() for t in location.get("tags", []))
            if q in tags_str:
                score += 3

            summary = (location.get("deep_history", {}).get("summary") or "").lower()
            if q in summary:
                score += 1

            if score > 0:
                results.append((score, location, coords))

        results.sort(key=lambda item: item[0], reverse=True)
        return [
            NearbyPlace(
                id=location.get("location_id", location.get("name", "unknown")),
                name=location.get("name", "Unknown location"),
                category=location.get("category", "attraction"),
                tags=location.get("tags", []),
                distance_km=0.0,
                coordinates=coords,
                deep_history=location.get("deep_history", {}),
                tts_hints=location.get("tts_hints", {}),
            )
            for _, location, coords in results[:limit]
        ]

    @staticmethod
    def _district_relevance_score(location: dict[str, Any], district: str) -> int:
        """Score how relevant a location is to the given district/city name."""
        score = 0
        name = (location.get("name") or "").lower()
        tags = [str(t).lower() for t in location.get("tags", [])]
        summary = (location.get("deep_history", {}).get("summary") or "").lower()
        cultural = (location.get("deep_history", {}).get("cultural_significance") or "").lower()

        # Direct name match
        if district in name:
            score += 10

        # Tag match
        for tag in tags:
            if district in tag:
                score += 5

        # Summary mention
        if district in summary:
            score += 2

        # Cultural significance mention
        if district in cultural:
            score += 1

        return score
