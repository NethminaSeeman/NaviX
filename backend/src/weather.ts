/**
 * OpenWeatherMap integration. Returns NaviX-shaped weather (temperature,
 * humidity, condition, rain flag, safety hints). If WEATHER_API_KEY is
 * absent we fall back to a deterministic mock so the chat pipeline still
 * works end-to-end during local dev.
 */

import { Env, HttpError, WeatherResponse } from "./types";

interface OwmResponse {
  main?: { temp?: number; humidity?: number };
  weather?: Array<{ main?: string; description?: string }>;
  rain?: Record<string, number>;
}

export async function getWeather(
  env: Env,
  lat: number,
  lon: number
): Promise<WeatherResponse> {
  if (!env.WEATHER_API_KEY) {
    return mockWeather(lat, lon);
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("appid", env.WEATHER_API_KEY);
  url.searchParams.set("units", "metric");

  const res = await fetch(url.toString(), {
    cf: { cacheTtl: 300, cacheEverything: true },
  } as RequestInit);
  if (!res.ok) {
    const detail = await res.text();
    throw new HttpError(
      502,
      `OpenWeatherMap error ${res.status}: ${detail.slice(0, 200)}`
    );
  }

  const data = (await res.json()) as OwmResponse;
  const temperature = Number(data.main?.temp ?? 28);
  const humidity = Number(data.main?.humidity ?? 70);
  const condition = data.weather?.[0]?.description ?? data.weather?.[0]?.main ?? "clear";
  const rain = Boolean(
    data.rain &&
      Object.values(data.rain).some((v) => typeof v === "number" && v > 0)
  ) || /rain|shower|drizzle|thunder/i.test(condition);

  return {
    temperature: round(temperature),
    humidity: Math.round(humidity),
    condition: capitalize(condition),
    rain,
    safety_hints: buildSafetyHints(temperature, humidity, rain, condition),
  };
}

function mockWeather(lat: number, lon: number): WeatherResponse {
  const seed = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233));
  const temperature = round(26 + seed * 6);
  const humidity = 60 + Math.round(seed * 30);
  const rain = seed > 0.7;
  const condition = rain ? "Light rain" : "Partly cloudy";
  return {
    temperature,
    humidity,
    condition,
    rain,
    safety_hints: buildSafetyHints(temperature, humidity, rain, condition),
  };
}

function buildSafetyHints(
  temperature: number,
  humidity: number,
  rain: boolean,
  condition: string
): string[] {
  const hints: string[] = [];
  if (rain) {
    hints.push("Carry a light rain jacket or umbrella.");
    hints.push("Roads can be slippery — drive carefully outside cities.");
  }
  if (temperature >= 32) {
    hints.push("Stay hydrated and avoid long midday sun exposure.");
  }
  if (humidity >= 80) {
    hints.push("High humidity — wear breathable clothing.");
  }
  if (/thunder/i.test(condition)) {
    hints.push("Thunderstorms possible — avoid exposed beaches and ridgelines.");
  }
  if (hints.length === 0) {
    hints.push("Pleasant conditions — great time to be outdoors.");
  }
  return hints;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
