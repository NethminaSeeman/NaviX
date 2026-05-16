import { useMemo, useState } from "react";
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

const MapContainer = ({ userLocation, places = [], weather }) => {
  const [activePlace, setActivePlace] = useState(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "ceygo-map",
    googleMapsApiKey: MAPS_API_KEY,
  });

  const nearestPlace = useMemo(() => {
    if (!userLocation || places.length === 0) return null;
    return [...places]
      .map((place) => ({
        ...place,
        dist: distanceKm(userLocation, place.coordinates),
      }))
      .sort((a, b) => a.dist - b.dist)[0];
  }, [places, userLocation]);

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
        center={userLocation || defaultCenter}
        zoom={userLocation ? 10 : 7}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
        }}
      >
        {userLocation && (
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

        {places.map((place) => (
          <MarkerF
            key={place.id}
            position={place.coordinates}
            onClick={() => setActivePlace(place)}
          />
        ))}

        {userLocation && nearestPlace && (
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
              {userLocation && (
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
