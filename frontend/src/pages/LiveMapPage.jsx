import { useMemo, useState } from "react";
import MapView from "@/components/MapView";
import LoadingSpinner from "@/components/LoadingSpinner";
import WeatherCard from "@/components/WeatherCard";
import { useLocation } from "@/context/LocationContext";
import { useWeather } from "@/context/WeatherContext";
import { getTagStyle } from "@/utils/mapConfig";
import { localTourismPlaces } from "@/utils/localTourismData";

const LiveMapPage = () => {
  const {
    location,
    loading: locating,
    error,
    permissionState,
    getCurrentLocation,
  } = useLocation();
  const { weather } = useWeather();
  const places = useMemo(() => localTourismPlaces, []);
  const [selectedPlace, setSelectedPlace] = useState(null);

  return (
    <section className="space-y-4">
      <div className="tech-panel flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-5">
        <div>
          <h1 className="section-title">Live Map Explorer</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Discover nearby attractions, route lines, and location-aware weather.
          </p>
        </div>
        <button
          type="button"
          onClick={getCurrentLocation}
          className="tech-button"
        >
          Refresh GPS
        </button>
      </div>

      {permissionState === "denied" && (
        <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          GPS permission is currently denied in your browser.
        </p>
      )}
      {locating && <LoadingSpinner text="Detecting your location..." />}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <MapView
        userLocation={location}
        places={places}
        weather={weather}
        selectedPlace={selectedPlace}
        onPlaceSelect={setSelectedPlace}
      />

      <div className="tech-panel p-4">
        <h3 className="mono-label mb-2 text-[11px] text-slate-500 dark:text-cyan-300/80">
          Local Test Dataset ({places.length} Locations)
        </h3>
        <ul className="grid gap-2 text-sm text-slate-600 dark:text-slate-200 md:grid-cols-2">
          {places.map((place) => (
            <li
              key={place.id}
              className="cursor-pointer rounded-md border border-slate-200 px-3 py-2 hover:border-cyan-500/40 hover:bg-cyan-500/5 dark:border-slate-700"
              onClick={() => setSelectedPlace(place)}
            >
              <p className="font-medium">{place.name}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {(place.tags || []).slice(0, 4).map((tag) => {
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
            </li>
          ))}
        </ul>
      </div>

      {selectedPlace && (
        <div className="tech-panel space-y-2 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{selectedPlace.name}</h3>
            <button
              type="button"
              onClick={() => setSelectedPlace(null)}
              className="mono-label text-[10px] text-cyan-600 hover:underline dark:text-cyan-300"
            >
              Close
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-200">
            {selectedPlace?.deep_history?.summary}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {selectedPlace?.deep_history?.architectural_details}
          </p>
        </div>
      )}

      <WeatherCard weather={weather} />
    </section>
  );
};

export default LiveMapPage;
