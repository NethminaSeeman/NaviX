const PROD_WORKER_URL = "https://navix-api.nethminamalshan5.workers.dev";
const isLocalHost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.NEXT_PUBLIC_API_URL ||
  (isLocalHost ? "http://localhost:8000" : PROD_WORKER_URL);

export const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
export const SRI_LANKA_CENTER = { lat: 7.8731, lng: 80.7718 };
export const APP_NAME = "NaviX";

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
