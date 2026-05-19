import { apiClient } from "@/services/apiClient";
import {
  clearStoredToken,
  setStoredToken,
} from "@/services/authStorage";

/**
 * Maps a /auth/* response into the shape AuthContext stores in state
 * and persists the bearer token in localStorage when present.
 */
const persistAndShape = (data) => {
  if (data?.token) setStoredToken(data.token);
  return {
    user: data?.user ?? null,
    subscription: data?.subscription ?? null,
    access: data?.access ?? null,
  };
};

export const authApi = {
  async register({ email, password, name }) {
    const { data } = await apiClient.post("/auth/register", {
      email,
      password,
      name,
    });
    return persistAndShape(data);
  },

  async login({ email, password }) {
    const { data } = await apiClient.post("/auth/login", { email, password });
    return persistAndShape(data);
  },

  async loginWithGoogle(idToken) {
    const { data } = await apiClient.post("/auth/google", {
      id_token: idToken,
    });
    return persistAndShape(data);
  },

  async me() {
    const { data } = await apiClient.get("/auth/me");
    return {
      user: data?.user ?? null,
      subscription: data?.subscription ?? null,
      access: data?.access ?? null,
    };
  },

  async logout() {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      /* token may already be invalid; client-side clear is still safe */
    }
    clearStoredToken();
  },
};
