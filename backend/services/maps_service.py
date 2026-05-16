import os
from urllib.parse import quote_plus


class MapsService:
    def directions_url(self, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> str:
        """Return a Google Maps directions URL; frontend can open this directly."""
        api_key = os.getenv("GOOGLE_MAPS_API_KEY", "")
        origin = quote_plus(f"{origin_lat},{origin_lon}")
        destination = quote_plus(f"{dest_lat},{dest_lon}")
        key_param = f"&key={api_key}" if api_key else ""
        return (
            "https://www.google.com/maps/dir/?api=1"
            f"&origin={origin}&destination={destination}&travelmode=driving{key_param}"
        )
