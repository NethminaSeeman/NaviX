/**
 * Pure-logic weather advice agent. Takes the WeatherResponse and returns
 * a single short advice sentence suitable for the final voice script.
 * No LLM call required — keeps the chat pipeline cheap and predictable.
 */

import { WeatherResponse } from "../types";

export function runWeatherAgent(weather: WeatherResponse | null): string | null {
  if (!weather) return null;

  const { temperature, humidity, rain, condition } = weather;
  const parts: string[] = [];

  if (rain) {
    parts.push("Expect showers — pack a light rain jacket.");
  } else if (/thunder/i.test(condition)) {
    parts.push("Thunderstorms are possible later; plan indoor backups.");
  } else if (temperature >= 32) {
    parts.push("It's hot today — start early and stay hydrated.");
  } else if (temperature <= 18) {
    parts.push("Cooler than usual — a light layer helps in the evening.");
  } else {
    parts.push("Weather looks fine for sightseeing.");
  }

  if (!rain && humidity >= 85) {
    parts.push("It's quite humid, so take regular shade breaks.");
  }

  return parts.join(" ");
}
