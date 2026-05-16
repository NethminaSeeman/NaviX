import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({
    id: "guest",
    name: "Guest Traveler",
    isAuthenticated: false,
  });

  const loginAsGuest = () =>
    setUser((prev) => ({ ...prev, isAuthenticated: true, name: "CeyGo Explorer" }));

  const value = useMemo(() => ({ user, setUser, loginAsGuest }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
};
