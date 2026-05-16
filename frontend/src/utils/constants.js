export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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
