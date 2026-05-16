export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const sanitizeApiKey = (value) => {
  if (!value) return "";
  const normalized = `${value}`.trim().replace(/^['"]|['"]$/g, "");
  if (!normalized || normalized === "your_google_maps_api_key") return "";
  return normalized;
};

export const MAPS_API_KEY = sanitizeApiKey(
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_MAPS_API_KEY ||
    import.meta.env.GOOGLE_MAPS_API_KEY ||
    ""
);

export const SUGGESTED_PROMPTS = [
  "Plan a 3-day trip in Kandy",
  "Best beaches near Galle today",
  "Suggest places with less rain now",
  "Tell me the history of Sigiriya",
];

export const WEATHER_LABELS = {
  hot: "Stay hydrated and schedule indoor stops at noon.",
  rainy: "Carry a rain jacket and prioritize covered attractions.",
  pleasant: "Great weather for long walks and outdoor photography.",
};
