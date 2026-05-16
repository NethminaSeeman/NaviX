import { useCallback, useEffect, useState } from "react";

export const useGeolocation = (autoFetch = true) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState("");
  const [permissionState, setPermissionState] = useState("prompt");

  const resolvePermission = useCallback(async () => {
    if (!navigator.permissions?.query) return;
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      setPermissionState(status.state);
      status.onchange = () => setPermissionState(status.state);
    } catch (_error) {
      // Some browsers block permission querying; keep graceful defaults.
    }
  }, []);

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
            ? "Location permission denied. Enable GPS access to discover nearby attractions."
            : err.code === 2
              ? "Location unavailable. Please check your device GPS."
              : err.code === 3
                ? "Location request timed out. Please retry."
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

  useEffect(() => {
    resolvePermission();
  }, [resolvePermission]);

  return { location, loading, error, permissionState, getCurrentLocation };
};
