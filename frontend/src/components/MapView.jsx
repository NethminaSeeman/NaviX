import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { distanceKm } from "@/utils/geo";
import {
  GEOAPIFY_API_KEY,
  MAPS_API_KEY,
  SRI_LANKA_CENTER,
} from "@/utils/constants";
import { getPrimaryTag, getTagStyle } from "@/utils/mapConfig";

const sriLankaBounds = L.latLngBounds(
  [5.7, 79.4],
  [9.95, 82.1]
);

const circleIcon = (color, label = "") =>
  L.divIcon({
    className: "navix-map-marker",
    html: `<div style="
      width:22px;height:22px;border-radius:999px;
      background:${color};border:2px solid #0f172a;
      box-shadow:0 1px 4px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
      color:#fff;font:700 9px/1 ui-monospace,monospace;
    ">${label}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });

const FitBounds = ({ places, userLocation }) => {
  const map = useMap();
  useEffect(() => {
    const pts = [];
    if (userLocation?.lat != null && userLocation?.lng != null) {
      pts.push([userLocation.lat, userLocation.lng]);
    }
    places.forEach((p) => {
      if (p?.coordinates?.lat != null && p?.coordinates?.lng != null) {
        pts.push([p.coordinates.lat, p.coordinates.lng]);
      }
    });
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], 10);
      return;
    }
    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 11 });
  }, [map, places, userLocation]);
  return null;
};

const FocusPlace = ({ place }) => {
  const map = useMap();
  useEffect(() => {
    if (!place?.coordinates) return;
    map.panTo([place.coordinates.lat, place.coordinates.lng]);
    map.setZoom(Math.max(map.getZoom() || 7, 9));
  }, [map, place]);
  return null;
};

const MapView = ({
  userLocation,
  places = [],
  weather,
  selectedPlace,
  onPlaceSelect,
}) => {
  const { speak, speaking, stop: stopSpeech } = useSpeechSynthesis();
  const apiKey = GEOAPIFY_API_KEY || MAPS_API_KEY;

  // Always halt narration when the selected pin changes or the map unmounts.
  useEffect(() => {
    stopSpeech();
    return () => stopSpeech();
  }, [selectedPlace?.id, stopSpeech]);

  const nearestPlace = useMemo(() => {
    if (!userLocation || places.length === 0) return null;
    return [...places]
      .map((place) => ({
        ...place,
        dist: distanceKm(userLocation, place.coordinates),
      }))
      .sort((a, b) => a.dist - b.dist)[0];
  }, [userLocation, places]);

  const tileUrl = apiKey
    ? `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const attribution = apiKey
    ? 'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> | © OpenStreetMap'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [SRI_LANKA_CENTER.lat, SRI_LANKA_CENTER.lng];

  const handleMarkerOpen = (place) => {
    stopSpeech();
    onPlaceSelect?.(place);
  };

  const handleListenToggle = (place) => {
    if (speaking) {
      stopSpeech();
      return;
    }
    speak(place, { soft: true });
  };

  return (
    <div className="tech-panel relative h-[460px] overflow-hidden md:h-[590px]">
      <div className="mono-label absolute left-3 top-3 z-[1000] rounded-md border border-cyan-500/40 bg-slate-900/80 px-2 py-1 text-[10px] text-cyan-200 backdrop-blur-md">
        Sri Lanka Grid
      </div>
      <MapContainer
        center={center}
        zoom={userLocation ? 10 : 7}
        style={{ width: "100%", height: "100%" }}
        maxBounds={sriLankaBounds.pad(0.15)}
        maxBoundsViscosity={0.75}
        scrollWheelZoom
      >
        <TileLayer url={tileUrl} attribution={attribution} maxZoom={18} />
        <FitBounds places={places} userLocation={userLocation} />
        {selectedPlace && <FocusPlace place={selectedPlace} />}

        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={circleIcon("#0077B6", "You")}
          >
            <Popup>Your location</Popup>
          </Marker>
        )}

        {places.map((place) => {
          if (!place?.coordinates) return null;
          const style = getTagStyle(getPrimaryTag(place));
          return (
            <Marker
              key={place.id}
              position={[place.coordinates.lat, place.coordinates.lng]}
              icon={circleIcon(style.markerColor, style.shortCode)}
              eventHandlers={{
                click: () => handleMarkerOpen(place),
              }}
            >
              <Popup
                eventHandlers={{
                  remove: () => stopSpeech(),
                }}
              >
                <div className="max-w-72 space-y-2 text-sm text-slate-800">
                  <p className="font-semibold">{place.name}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    {style.label}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(place.tags || []).slice(0, 6).map((tag) => {
                      const tagStyle = getTagStyle(tag);
                      return (
                        <span
                          key={tag}
                          className={`rounded-md border px-1.5 py-0.5 text-[9px] ${tagStyle.badgeClass}`}
                        >
                          {tagStyle.label}
                        </span>
                      );
                    })}
                  </div>
                  {userLocation && (
                    <p>{distanceKm(userLocation, place.coordinates)} km away</p>
                  )}
                  <p className="text-xs">{place?.deep_history?.summary}</p>
                  <button
                    type="button"
                    onClick={() => handleListenToggle(place)}
                    className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-700"
                  >
                    {speaking ? "Stop" : "Listen"}
                  </button>
                  <p className="text-xs text-slate-600">
                    {place?.deep_history?.architectural_details}
                  </p>
                  {weather?.description && (
                    <p className="text-xs text-slate-500">
                      Weather context: {weather.description}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {userLocation && nearestPlace?.coordinates && (
          <Polyline
            positions={[
              [userLocation.lat, userLocation.lng],
              [nearestPlace.coordinates.lat, nearestPlace.coordinates.lng],
            ]}
            pathOptions={{ color: "#00A99D", weight: 4, opacity: 0.85 }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;
