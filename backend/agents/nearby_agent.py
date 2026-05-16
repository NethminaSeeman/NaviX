from models.request_models import NearbyPlace
from services.location_service import LocationService


class NearbyPlacesAgent:
    def __init__(self, location_service: LocationService) -> None:
        self.location_service = location_service

    def run(self, lat: float, lon: float) -> list[NearbyPlace]:
        return self.location_service.nearest_places(lat, lon, limit=5)
