from models.request_models import NearbyPlace
from services.agent_store import AgentStore
from services.location_service import LocationService


class NearbyPlacesAgent:
    def __init__(
        self, location_service: LocationService, agent_store: AgentStore | None = None
    ) -> None:
        self.location_service = location_service
        self.agent_store = agent_store

    def run(self, lat: float, lon: float) -> list[NearbyPlace]:
        try:
            results = self.location_service.nearest_places(lat, lon, limit=5)
            if self.agent_store:
                self.agent_store.log(
                    "nearby_agent",
                    None,
                    {"lat": lat, "lon": lon, "limit": 5},
                    [item.model_dump() for item in results],
                    status="success",
                )
            return results
        except Exception as exc:
            if self.agent_store:
                self.agent_store.log(
                    "nearby_agent",
                    None,
                    {"lat": lat, "lon": lon, "limit": 5},
                    [],
                    status="error",
                    error_text=str(exc),
                )
            raise
