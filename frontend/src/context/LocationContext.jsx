import { createContext, useContext, useMemo } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";

const LocationContext = createContext(null);

export const LocationProvider = ({ children }) => {
  const { location, loading, error, getCurrentLocation } = useGeolocation(true);

  const value = useMemo(
    () => ({ location, loading, error, getCurrentLocation }),
    [location, loading, error, getCurrentLocation]
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within LocationProvider.");
  }
  return context;
};
