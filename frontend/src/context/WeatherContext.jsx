import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ceygoApi } from "@/services/ceygoApi";
import { weatherTravelAdvice } from "@/utils/recommendation";
import { useLocation } from "@/context/LocationContext";

const WeatherContext = createContext(null);

export const WeatherProvider = ({ children }) => {
  const { location } = useLocation();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadWeather = useCallback(
    async (coords = location) => {
      if (!coords) return;
      setLoading(true);
      setError("");
      try {
        const result = await ceygoApi.weather({
          lat: coords.lat,
          lon: coords.lng,
        });
        setWeather({
          ...result,
          // Ensure both description and condition are available
          description: result.description || result.condition || "Partly cloudy",
          condition: result.condition || result.description || "Partly cloudy",
          recommendation: result.recommendation || weatherTravelAdvice(result),
        });
      } catch (err) {
        console.warn("Weather fetch failed, using defaults:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [location]
  );

  useEffect(() => {
    if (location) loadWeather(location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng]);

  const value = useMemo(
    () => ({ weather, loading, error, loadWeather }),
    [weather, loading, error, loadWeather]
  );

  return (
    <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>
  );
};

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (!context) throw new Error("useWeather must be used within WeatherProvider.");
  return context;
};
