import { useEffect, useState } from "react";
import MapView from "@/components/MapView";
import LoadingSpinner from "@/components/LoadingSpinner";
import WeatherCard from "@/components/WeatherCard";
import { useLocation } from "@/context/LocationContext";
import { useWeather } from "@/context/WeatherContext";
import { ceygoApi } from "@/services/ceygoApi";

const LiveMapPage = () => {
  const {
    location,
    loading: locating,
    error,
    permissionState,
    getCurrentLocation,
  } = useLocation();
  const { weather } = useWeather();
  const [places, setPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [placesError, setPlacesError] = useState("");

  useEffect(() => {
    const loadPlaces = async () => {
      setLoadingPlaces(true);
      setPlacesError("");
      try {
        const results = location
          ? await ceygoApi.nearby(location)
          : await ceygoApi.places();
        setPlaces(results);
      } catch (err) {
        setPlacesError(err.message);
      } finally {
        setLoadingPlaces(false);
      }
    };
    loadPlaces();
  }, [location]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">Live Map Explorer</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Discover nearby attractions, route lines, and location-aware weather.
          </p>
        </div>
        <button
          type="button"
          onClick={getCurrentLocation}
          className="rounded-full bg-ceygo-secondary px-4 py-2 text-sm font-semibold text-white"
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
      {placesError && <p className="text-sm text-red-500">{placesError}</p>}

      <MapView userLocation={location} places={places} weather={weather} />

      {loadingPlaces ? (
        <LoadingSpinner text="Finding nearby places..." />
      ) : (
        <div className="glass-card p-4">
          <h3 className="mb-2 font-semibold">Nearest Attractions</h3>
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-200">
            {places.slice(0, 5).map((place) => (
              <li key={place.id}>
                {place.name} {place.distanceKm ? `- ${place.distanceKm} km` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <WeatherCard weather={weather} />
    </section>
  );
};

export default LiveMapPage;
