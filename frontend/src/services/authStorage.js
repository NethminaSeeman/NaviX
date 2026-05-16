const TOKEN_KEY = "navix.token";

const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

export const getStoredToken = () => {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token) => {
  if (!isBrowser()) return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage disabled (private mode, etc.) — best-effort only */
  }
};

export const clearStoredToken = () => setStoredToken(null);

/**
 * Cross-component bus for auth lifecycle events.
 * Subscribers (AuthContext, ChatBox, etc.) listen via `subscribe()`;
 * the apiClient interceptor publishes via `emit()`.
 *
 * Events:
 *   "unauthorized"           token rejected by server (401)
 *   "subscription_required"  authenticated but no active trial/sub (402)
 */
const listeners = new Map(); // event -> Set<fn>

export const subscribeAuthEvent = (event, fn) => {
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  set.add(fn);
  return () => set.delete(fn);
};

export const emitAuthEvent = (event, payload) => {
  const set = listeners.get(event);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(payload);
    } catch {
      /* swallow individual handler errors */
    }
  }
};
