import { useMemo, useState } from "react";
import {
  GoogleMap,
  InfoWindow,
  MarkerF,
  PolylineF,
  useJsApiLoader,
} from "@react-google-maps/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import { distanceKm } from "@/utils/geo";
import { MAPS_API_KEY, SRI_LANKA_CENTER } from "@/utils/constants";

const mapContainerStyle = { width: "100%", height: "100%" };

const MapView = ({ userLocation, places = [], weather }) => {
  const [activePlace, setActivePlace] = useState(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "ceygo-map-script",
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
  }, [userLocation, places]);

  if (!MAPS_API_KEY) {
    return (
      <div className="glass-card flex h-[440px] items-center justify-center p-6 text-center text-sm text-slate-600 dark:text-slate-300">
        Add `VITE_GOOGLE_MAPS_API_KEY` in `.env` to load the live CeyGo map.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="glass-card flex h-[440px] items-center justify-center p-6 text-sm text-red-500">
        Google Maps failed to load. Please check API key restrictions and billing.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="glass-card flex h-[440px] items-center justify-center">
        <LoadingSpinner text="Loading Google Map..." />
      </div>
    );
  }

  return (
    <div className="glass-card h-[440px] overflow-hidden md:h-[520px]">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={userLocation || SRI_LANKA_CENTER}
        zoom={userLocation ? 10 : 7}
        options={{
          zoomControl: true,
          fullscreenControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          clickableIcons: true,
        }}
      >
        {userLocation && (
          <MarkerF
            position={userLocation}
            label={{ text: "You", color: "#ffffff", fontWeight: "700" }}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: "#0077B6",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 8,
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
            options={{
              strokeColor: "#00A99D",
              strokeOpacity: 0.85,
              strokeWeight: 4,
            }}
          />
        )}

        {activePlace && (
          <InfoWindow
            position={activePlace.coordinates}
            onCloseClick={() => setActivePlace(null)}
          >
            <div className="max-w-56 space-y-1 text-sm">
              <p className="font-semibold">{activePlace.name}</p>
              <p className="text-xs text-slate-600">{activePlace.district}</p>
              {userLocation && (
                <p>{distanceKm(userLocation, activePlace.coordinates)} km away</p>
              )}
              {weather?.description && (
                <p className="text-xs text-slate-500">
                  Weather context: {weather.description}
                </p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default MapView;
