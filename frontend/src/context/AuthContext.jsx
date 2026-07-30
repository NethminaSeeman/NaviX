import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { authApi } from "@/services/authApi";
import {
  clearStoredToken,
  getStoredToken,
  subscribeAuthEvent,
} from "@/services/authStorage";

const AuthContext = createContext(null);

const emptyAccess = {
  allowed: false,
  is_paid: false,
  is_trial: false,
  trial_days_left: 0,
  trial_ends_at: null,
  plan: null,
  status: "none",
};

const devBypass = import.meta.env.VITE_DEV_AUTH_BYPASS === "true";

const buildDevSession = () => ({
  user: {
    id: "dev",
    email: "dev@local",
    name: "Dev Mode",
  },
  subscription: null,
  access: {
    ...emptyAccess,
    allowed: true,
    is_trial: true,
    trial_days_left: 7,
    trial_ends_at: null,
    plan: "dev",
    status: "dev",
  },
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [access, setAccess] = useState(emptyAccess);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscriptionRequired, setSubscriptionRequired] = useState(false);
  const mounted = useRef(true);

  const applySession = useCallback((next) => {
    setUser(next?.user ?? null);
    setSubscription(next?.subscription ?? null);
    setAccess(next?.access ?? emptyAccess);
    if (next?.access?.allowed) setSubscriptionRequired(false);
  }, []);

  const refresh = useCallback(async () => {
    if (devBypass) {
      const devSession = buildDevSession();
      applySession(devSession);
      return devSession;
    }
    if (!getStoredToken()) {
      applySession(null);
      return null;
    }
    try {
      const next = await authApi.me();
      if (!mounted.current) return next;
      applySession(next);
      return next;
    } catch {
      if (!mounted.current) return null;
      applySession(null);
      return null;
    }
  }, [applySession]);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      await refresh();
      if (mounted.current) setLoading(false);
    })();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (devBypass) {
      return () => {};
    }
    const offUnauth = subscribeAuthEvent("unauthorized", () => {
      clearStoredToken();
      applySession(null);
    });
    const offSubReq = subscribeAuthEvent("subscription_required", (payload) => {
      const next = payload?.data?.access ?? null;
      if (next) setAccess((prev) => ({ ...prev, ...next }));
      setSubscriptionRequired(true);
    });
    return () => {
      offUnauth();
      offSubReq();
    };
  }, [applySession]);

  const register = useCallback(
    async ({ email, password, name }) => {
      setError("");
      if (devBypass) {
        const devSession = buildDevSession();
        applySession(devSession);
        return devSession;
      }
      const next = await authApi.register({ email, password, name });
      applySession(next);
      return next;
    },
    [applySession]
  );

  const login = useCallback(
    async ({ email, password }) => {
      setError("");
      if (devBypass) {
        const devSession = buildDevSession();
        applySession(devSession);
        return devSession;
      }
      const next = await authApi.login({ email, password });
      applySession(next);
      return next;
    },
    [applySession]
  );

  const loginWithGoogle = useCallback(
    async (idToken) => {
      setError("");
      if (devBypass) {
        const devSession = buildDevSession();
        applySession(devSession);
        return devSession;
      }
      const next = await authApi.loginWithGoogle(idToken);
      applySession(next);
      return next;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    if (devBypass) {
      applySession(buildDevSession());
      setSubscriptionRequired(false);
      return;
    }
    await authApi.logout();
    applySession(null);
    setSubscriptionRequired(false);
  }, [applySession]);

  const dismissSubscriptionRequired = useCallback(
    () => setSubscriptionRequired(false),
    []
  );

  const value = useMemo(
    () => ({
      user,
      subscription,
      access,
      loading,
      error,
      isAuthenticated: !!user,
      subscriptionRequired,
      register,
      login,
      loginWithGoogle,
      logout,
      refresh,
      setError,
      dismissSubscriptionRequired,
    }),
    [
      user,
      subscription,
      access,
      loading,
      error,
      subscriptionRequired,
      register,
      login,
      loginWithGoogle,
      logout,
      refresh,
      dismissSubscriptionRequired,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider.");
  return ctx;
};
