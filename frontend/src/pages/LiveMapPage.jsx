import { useEffect, useMemo, useState } from "react";
import MapView from "@/components/MapView";
import LoadingSpinner from "@/components/LoadingSpinner";
import WeatherCard from "@/components/WeatherCard";
import { useLocation } from "@/context/LocationContext";
import { useWeather } from "@/context/WeatherContext";
import { ceygoApi } from "@/services/ceygoApi";
import { getTagStyle } from "@/utils/mapConfig";
import {
  getProvinceFromCoordinates,
  resolveProvince,
  resolveDistrict,
  SRI_LANKA_PROVINCES,
} from "@/utils/sriLankaProvinces";
import { SRI_LANKA_CENTER } from "@/utils/constants";

const LiveMapPage = () => {
  const { location, loading: locating, error, permissionState, getCurrentLocation } =
    useLocation();
  const { weather } = useWeather();

  const [allPlaces, setAllPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("All Provinces");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [provinceAutoSet, setProvinceAutoSet] = useState(false);

  // Auto-detect user's province from GPS and pre-select it (only once)
  useEffect(() => {
    if (!location || provinceAutoSet) return;
    const detected = getProvinceFromCoordinates(location);
    if (detected && detected !== "Unknown Province") {
      setSelectedProvince(detected);
      setProvinceAutoSet(true);
    }
  }, [location, provinceAutoSet]);

  // Load all Sri Lanka locations once on mount
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setFetchError("");
      try {
        const places = await ceygoApi.nearby({
          lat: SRI_LANKA_CENTER.lat,
          lng: SRI_LANKA_CENTER.lng,
          radius: 1000000,
          limit: 500,
        });
        if (alive) setAllPlaces(places);
      } catch {
        if (alive) setFetchError("Failed to load locations. Please refresh.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  // Enrich every place with a resolved province
  const enrichedPlaces = useMemo(
    () =>
      allPlaces.map((place) => ({
        ...place,
        province: resolveProvince(place),
        district: resolveDistrict(place),
      })),
    [allPlaces]
  );

  const provinceOptions = useMemo(
    () => ["All Provinces", ...SRI_LANKA_PROVINCES],
    []
  );

  // Apply search + province filter
  const filteredPlaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedPlaces.filter((place) => {
      if (selectedProvince !== "All Provinces" && place.province !== selectedProvince)
        return false;
      if (!q) return true;
      return (
        place.name?.toLowerCase().includes(q) ||
        (place.tags || []).some((t) => String(t).toLowerCase().includes(q))
      );
    });
  }, [enrichedPlaces, searchQuery, selectedProvince]);

  // Group filtered places by province, alphabetical
  const provinceGroups = useMemo(() => {
    const map = {};
    for (const place of filteredPlaces) {
      const prov = place.province || "Unknown Province";
      if (!map[prov]) map[prov] = [];
      map[prov].push(place);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPlaces]);

  // Clear selected place if it's no longer in view
  useEffect(() => {
    if (selectedPlace && !filteredPlaces.some((p) => p.id === selectedPlace.id)) {
      setSelectedPlace(null);
    }
  }, [filteredPlaces, selectedPlace]);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="tech-panel flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-5">
        <div>
          <h1 className="section-title">Live Map Explorer</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {selectedProvince !== "All Provinces"
              ? `Showing locations in ${selectedProvince}`
              : "All Sri Lanka heritage & tourism locations, grouped by province."}
          </p>
          {selectedProvince !== "All Provinces" && (
            <button
              type="button"
              onClick={() => { setSelectedProvince("All Provinces"); setSearchQuery(""); }}
              className="mt-1 text-xs text-cyan-600 underline hover:text-cyan-500 dark:text-cyan-400"
            >
              Show all provinces
            </button>
          )}
        </div>
        <button type="button" onClick={getCurrentLocation} className="tech-button">
          Refresh My Location
        </button>
      </div>

      {permissionState === "denied" && (
        <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          GPS permission denied. Location-aware features are disabled.
        </p>
      )}
      {locating && <LoadingSpinner text="Detecting your location..." />}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {fetchError && <p className="text-sm text-red-500">{fetchError}</p>}

      {/* Map — shows filtered locations as pins */}
      <MapView
        userLocation={location}
        places={filteredPlaces}
        weather={weather}
        selectedPlace={selectedPlace}
        onPlaceSelect={setSelectedPlace}
      />

      {/* Search + Province filter + Province-grouped location list */}
      <div className="tech-panel p-4">
        {/* Controls row */}
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations by name or tag..."
            className="w-full rounded-lg border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-800 outline-none ring-cyan-500/40 backdrop-blur-md focus:ring-2 dark:border-cyan-500/30 dark:bg-slate-900/50 dark:text-slate-100"
          />
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="w-full rounded-lg border border-slate-300/80 bg-white/80 px-3 py-2 text-sm text-slate-800 outline-none ring-cyan-500/40 backdrop-blur-md focus:ring-2 dark:border-cyan-500/30 dark:bg-slate-900/50 dark:text-slate-100 md:w-64"
          >
            {provinceOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <p className="mono-label mb-3 text-[11px] text-slate-500 dark:text-cyan-300/80">
          {filteredPlaces.length} location{filteredPlaces.length !== 1 ? "s" : ""} found
          {selectedProvince !== "All Provinces" ? ` in ${selectedProvince}` : " across Sri Lanka"}
        </p>

        {loading ? (
          <LoadingSpinner text="Loading all locations..." />
        ) : (
          <div className="space-y-3">
            {provinceGroups.map(([province, places]) => (
              <div
                key={province}
                className="rounded-lg border border-slate-200/70 dark:border-slate-700/60"
              >
                {/* Province header */}
                <div className="flex items-center justify-between rounded-t-lg bg-slate-50/80 px-3 py-2 dark:bg-slate-800/50">
                  <p className="mono-label text-[10px] text-slate-600 dark:text-cyan-300/90">
                    {province}
                  </p>
                  <span className="mono-label rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] text-cyan-700 dark:text-cyan-300">
                    {places.length}
                  </span>
                </div>

                {/* Location cards */}
                <ul className="grid gap-2 p-2 text-sm text-slate-600 dark:text-slate-200 md:grid-cols-2">
                  {places.map((place) => (
                    <li
                      key={place.id}
                      className="cursor-pointer rounded-md border border-slate-200 px-3 py-2 hover:border-cyan-500/40 hover:bg-cyan-500/5 dark:border-slate-700 dark:hover:border-cyan-500/40"
                      onClick={() => setSelectedPlace(place)}
                    >
                      <p className="font-medium leading-snug">{place.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="mono-label rounded border border-teal-400/40 bg-teal-50/60 px-1.5 py-0.5 text-[9px] text-teal-700 dark:border-teal-500/30 dark:bg-teal-900/20 dark:text-teal-300">
                          {place.district}
                        </span>
                        <span className="mono-label rounded border border-violet-400/40 bg-violet-50/60 px-1.5 py-0.5 text-[9px] text-violet-700 dark:border-violet-500/30 dark:bg-violet-900/20 dark:text-violet-300">
                          {place.province}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(place.tags || []).slice(0, 3).map((tag) => {
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
            ))}

            {!provinceGroups.length && (
              <p className="text-sm text-slate-500 dark:text-slate-300">
                No locations matched your search or filter.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Selected place detail */}
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
          <div className="flex flex-wrap gap-1.5">
            {selectedPlace.district && (
              <span className="mono-label rounded border border-teal-400/40 bg-teal-50/60 px-2 py-0.5 text-[9px] text-teal-700 dark:border-teal-500/30 dark:bg-teal-900/20 dark:text-teal-300">
                {selectedPlace.district} District
              </span>
            )}
            {selectedPlace.province && (
              <span className="mono-label rounded border border-violet-400/40 bg-violet-50/60 px-2 py-0.5 text-[9px] text-violet-700 dark:border-violet-500/30 dark:bg-violet-900/20 dark:text-violet-300">
                {selectedPlace.province}
              </span>
            )}
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
