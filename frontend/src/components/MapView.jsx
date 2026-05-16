import { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  InfoWindow,
  MarkerF,
  PolylineF,
  useJsApiLoader,
} from "@react-google-maps/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { distanceKm } from "@/utils/geo";
import { MAPS_API_KEY, SRI_LANKA_CENTER } from "@/utils/constants";
import { getMarkerIcon, getPrimaryTag, getTagStyle } from "@/utils/mapConfig";

const mapContainerStyle = { width: "100%", height: "100%" };
const sriLankaBounds = {
  north: 9.95,
  south: 5.7,
  east: 82.1,
  west: 79.4,
};

const MapView = ({ userLocation, places = [], weather, selectedPlace, onPlaceSelect }) => {
  const mapRef = useRef(null);
  const [activePlace, setActivePlace] = useState(null);
  const { speak, speaking } = useSpeechSynthesis();
  const { isLoaded, loadError } = useJsApiLoader({
    id: "navix-map-script",
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

  useEffect(() => {
    if (!selectedPlace) return;
    setActivePlace(selectedPlace);
    if (mapRef.current && selectedPlace.coordinates) {
      mapRef.current.panTo(selectedPlace.coordinates);
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom() || 7, 9));
    }
  }, [selectedPlace]);

  useEffect(() => {
    if (!mapRef.current || places.length === 0 || !window.google?.maps?.LatLngBounds) {
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    places.forEach((place) => {
      if (place.coordinates) bounds.extend(place.coordinates);
    });
    mapRef.current.fitBounds(bounds);
  }, [places]);

  if (!MAPS_API_KEY) {
    return (
      <div className="tech-panel flex h-[460px] items-center justify-center p-6 text-center text-sm text-slate-600 dark:text-slate-300">
        Add `VITE_GOOGLE_MAPS_API_KEY` in `.env` to load the live NaviX map.
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
    <div className="tech-panel relative h-[460px] overflow-hidden md:h-[590px]">
      <div className="mono-label absolute left-3 top-3 z-10 rounded-md border border-cyan-500/40 bg-slate-900/80 px-2 py-1 text-[10px] text-cyan-200 backdrop-blur-md">
        Sri Lanka Grid
      </div>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={userLocation || SRI_LANKA_CENTER}
        zoom={userLocation ? 10 : 7}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        options={{
          zoomControl: true,
          fullscreenControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          clickableIcons: true,
          restriction: {
            latLngBounds: sriLankaBounds,
            strictBounds: false,
          },
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
            onClick={() => {
              setActivePlace(place);
              onPlaceSelect?.(place);
            }}
            icon={getMarkerIcon(window.google?.maps, getPrimaryTag(place))}
            label={{
              text: getTagStyle(getPrimaryTag(place)).shortCode,
              color: "#ffffff",
              fontSize: "9px",
              fontWeight: "700",
            }}
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
            <div className="max-w-72 space-y-2 text-sm">
              <p className="font-semibold">{activePlace.name}</p>
              <p className="mono-label text-[10px] text-slate-600">
                {getTagStyle(getPrimaryTag(activePlace)).label}
              </p>
              <div className="flex flex-wrap gap-1">
                {(activePlace.tags || []).slice(0, 6).map((tag) => {
                  const tagStyle = getTagStyle(tag);
                  return (
                    <span
                      key={tag}
                      className={`mono-label rounded-md border px-1.5 py-0.5 text-[9px] ${tagStyle.badgeClass}`}
                    >
                      {tagStyle.label}
                    </span>
                  );
                })}
              </div>
              {userLocation && (
                <p>{distanceKm(userLocation, activePlace.coordinates)} km away</p>
              )}
              <p className="text-xs font-medium text-slate-700">
                {activePlace?.deep_history?.summary}
              </p>
              <button
                type="button"
                onClick={() => speak(activePlace)}
                className="mono-label rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-700"
              >
                {speaking ? "Playing..." : "Listen"}
              </button>
              <p className="text-xs text-slate-600">
                {activePlace?.deep_history?.architectural_details}
              </p>
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
