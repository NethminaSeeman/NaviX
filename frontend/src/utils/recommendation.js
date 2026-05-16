import { WEATHER_LABELS } from "@/utils/constants";

export const weatherTravelAdvice = (weather) => {
  if (!weather) return WEATHER_LABELS.pleasant;
  const text = `${weather.description || ""}`.toLowerCase();
  const temp = Number(weather.temperature || weather.temp || 0);

  if (text.includes("rain") || Number(weather.rainChance || 0) > 45) {
    return WEATHER_LABELS.rainy;
  }
  if (temp >= 31) return WEATHER_LABELS.hot;
  return WEATHER_LABELS.pleasant;
};
