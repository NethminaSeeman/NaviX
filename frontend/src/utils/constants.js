const PROD_WORKER_URL = "https://navix-api.nethminamalshan5.workers.dev";
const isLocalHost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.NEXT_PUBLIC_API_URL ||
  (isLocalHost ? "http://127.0.0.1:8787" : PROD_WORKER_URL);

export const MAPS_API_KEY =
  import.meta.env.VITE_GEOAPIFY_API_KEY ||
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  "";

/** Prefer Geoapify (this project’s key) over Google Maps JS. */
export const GEOAPIFY_API_KEY =
  import.meta.env.VITE_GEOAPIFY_API_KEY ||
  (String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").startsWith("AIza")
    ? ""
    : import.meta.env.VITE_GOOGLE_MAPS_API_KEY) ||
  "";

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  import.meta.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "";
export const SRI_LANKA_CENTER = { lat: 7.8731, lng: 80.7718 };
export const APP_NAME = "NaviX";

export const PLAN_PRICING = {
  monthly: { id: "monthly", label: "Monthly", price: 8, period: "month" },
  yearly: { id: "yearly", label: "Yearly", price: 60, period: "year" },
};

export const SUGGESTED_PROMPTS = [
  "Plan a 4-day cultural trip across Kandy and Sigiriya",
  "What are the best sunset beaches near Galle today?",
  "Suggest rainy-day activities around Colombo",
  "Tell me the history behind Sigiriya frescoes",
];

export const WEATHER_LABELS = {
  hot: "Stay hydrated and schedule indoor stops at noon.",
  rainy: "Carry a rain jacket and prioritize covered attractions.",
  pleasant: "Great weather for long walks and outdoor photography.",
};
