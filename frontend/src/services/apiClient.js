import axios from "axios";
import { API_BASE_URL } from "@/utils/constants";
import { normalizeError } from "@/utils/errorHandling";
import {
  clearStoredToken,
  emitAuthEvent,
  getStoredToken,
} from "@/services/authStorage";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set multipart boundary for FormData uploads.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    if (status === 401) {
      clearStoredToken();
      emitAuthEvent("unauthorized", { status, data });
    } else if (status === 402) {
      emitAuthEvent("subscription_required", { status, data });
    }

    const wrapped = new Error(normalizeError(error));
    wrapped.status = status ?? null;
    wrapped.data = data ?? null;
    wrapped.code = error?.code ?? null;
    return Promise.reject(wrapped);
  }
);
