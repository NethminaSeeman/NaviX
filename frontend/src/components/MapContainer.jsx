import { useCallback, useMemo, useState } from "react";
import {
  GoogleMap,
  InfoWindow,
  MarkerF,
  PolylineF,
  useJsApiLoader,
} from "@react-google-maps/api";
import { MAPS_API_KEY } from "@/utils/constants";
import { distanceKm } from "@/utils/geo";
import LoadingSpinner from "@/components/LoadingSpinner";

const mapContainerStyle = { width: "100%", height: "100%" };

const defaultCenter = { lat: 7.8731, lng: 80.7718 };
const sriLankaBounds = {
  north: 9.95,
  south: 5.7,
  east: 82.1,
  west: 79.4,
};

const isWithinSriLankaBounds = (point) => {
  if (!point) return false;
  return (
    point.lat >= sriLankaBounds.south &&
    point.lat <= sriLankaBounds.north &&
    point.lng >= sriLankaBounds.west &&
    point.lng <= sriLankaBounds.east
  );
};

const MapContainer = ({ userLocation, places = [], weather }) => {
  const [activePlace, setActivePlace] = useState(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "ceygo-map",
    googleMapsApiKey: MAPS_API_KEY,
  });
  const placesInSriLanka = useMemo(
    () => places.filter((place) => isWithinSriLankaBounds(place.coordinates)),
    [places]
  );

  const nearestPlace = useMemo(() => {
    if (!userLocation || placesInSriLanka.length === 0) return null;
    return [...placesInSriLanka]
      .map((place) => ({
        ...place,
        dist: distanceKm(userLocation, place.coordinates),
      }))
      .sort((a, b) => a.dist - b.dist)[0];
  }, [placesInSriLanka, userLocation]);
  const userInSriLanka = isWithinSriLankaBounds(userLocation);

  const handleMapLoad = useCallback(
    (map) => {
      if (!window.google?.maps?.LatLngBounds) return;

      const bounds = new window.google.maps.LatLngBounds(
        { lat: sriLankaBounds.south, lng: sriLankaBounds.west },
        { lat: sriLankaBounds.north, lng: sriLankaBounds.east }
      );
      map.fitBounds(bounds);
    },
    []
  );

  if (!MAPS_API_KEY) {
    return (
      <div className="glass-card flex h-[440px] items-center justify-center p-6 text-center text-sm text-slate-600 dark:text-slate-300">
        Add `VITE_GOOGLE_MAPS_API_KEY` to `frontend/.env.local` and restart
        the Vite server to enable live map rendering.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="glass-card p-4 text-sm text-red-500">
        Failed to load Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="glass-card flex h-[440px] items-center justify-center">
        <LoadingSpinner text="Loading live map..." />
      </div>
    );
  }

  return (
    <div className="glass-card h-[440px] overflow-hidden md:h-[520px]">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        defaultCenter={defaultCenter}
        defaultZoom={6}
        onLoad={handleMapLoad}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          restriction: {
            latLngBounds: sriLankaBounds,
            strictBounds: true,
          },
          minZoom: 5,
        }}
      >
        {userInSriLanka && (
          <MarkerF
            position={userLocation}
            label={{ text: "You", color: "#ffffff" }}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: "#0077B6",
              fillOpacity: 1,
              scale: 8,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            }}
          />
        )}

        {placesInSriLanka.map((place) => (
          <MarkerF
            key={place.id}
            position={place.coordinates}
            onClick={() => setActivePlace(place)}
          />
        ))}

        {userInSriLanka && nearestPlace && (
          <PolylineF
            path={[userLocation, nearestPlace.coordinates]}
            options={{ strokeColor: "#00A99D", strokeOpacity: 0.9, strokeWeight: 4 }}
          />
        )}

        {activePlace && (
          <InfoWindow
            position={activePlace.coordinates}
            onCloseClick={() => setActivePlace(null)}
          >
            <div className="max-w-52 space-y-1 text-sm">
              <p className="font-semibold">{activePlace.name}</p>
              <p>{activePlace.district}</p>
              {userInSriLanka && (
                <p>
                  {distanceKm(userLocation, activePlace.coordinates)} km away from
                  your location
                </p>
              )}
              {weather && (
                <p className="text-xs text-slate-600">
                  Current weather: {weather.description}
                </p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default MapContainer;
