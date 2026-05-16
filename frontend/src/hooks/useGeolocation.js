import { useCallback, useEffect, useState } from "react";

export const useGeolocation = (autoFetch = true) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState("");

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this browser.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        const message =
          err.code === 1
            ? "Location permission denied."
            : "Unable to fetch current location.";
        setError(message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (autoFetch) getCurrentLocation();
  }, [autoFetch, getCurrentLocation]);

  return { location, loading, error, getCurrentLocation };
};
