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

/**
 * Fetch a weather forecast for a future date using the OWM 5-day/3-hour API.
 * Falls back to deterministic mock when WEATHER_API_KEY is absent.
 */
export async function getWeatherForecast(
  env: Env,
  lat: number,
  lon: number,
  targetDate?: string
): Promise<WeatherResponse> {
  // Resolve target date
  const now = new Date();
  let target: Date;
  if (!targetDate) {
    target = new Date(now.getTime() + 86400000); // tomorrow
  } else if (targetDate === "today") {
    target = now;
  } else if (targetDate === "tomorrow") {
    target = new Date(now.getTime() + 86400000);
  } else {
    target = new Date(targetDate);
    if (isNaN(target.getTime())) {
      target = new Date(now.getTime() + 86400000);
    }
  }

  if (!env.WEATHER_API_KEY) {
    return mockForecast(lat, lon, target);
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("appid", env.WEATHER_API_KEY);
  url.searchParams.set("units", "metric");

  const res = await fetch(url.toString(), {
    cf: { cacheTtl: 600, cacheEverything: true },
  } as RequestInit);
  if (!res.ok) {
    return mockForecast(lat, lon, target);
  }

  interface ForecastEntry {
    dt: number;
    main: { temp?: number; humidity?: number };
    weather: Array<{ description?: string; main?: string }>;
    rain?: Record<string, number>;
  }
  const data = (await res.json()) as { list?: ForecastEntry[] };

  // Find the entry closest to noon on the target date
  const targetNoon = new Date(target);
  targetNoon.setUTCHours(12, 0, 0, 0);
  const targetMs = targetNoon.getTime();

  let bestEntry: ForecastEntry | null = null;
  let bestDiff = Infinity;

  for (const entry of data.list ?? []) {
    const diff = Math.abs(entry.dt * 1000 - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestEntry = entry;
    }
  }

  if (!bestEntry) {
    return mockForecast(lat, lon, target);
  }

  const temperature = Number(bestEntry.main?.temp ?? 28);
  const humidity = Number(bestEntry.main?.humidity ?? 70);
  const condition = bestEntry.weather?.[0]?.description ?? "partly cloudy";
  const rain = Boolean(
    bestEntry.rain &&
      Object.values(bestEntry.rain).some((v) => typeof v === "number" && v > 0)
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

function mockForecast(lat: number, lon: number, target: Date): WeatherResponse {
  const daySeed = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233 + target.getDate() * 3.14));
  const temperature = round(25 + daySeed * 8);
  const humidity = 55 + Math.round(daySeed * 35);
  const rain = daySeed > 0.6;
  const condition = rain ? "Light rain showers" : "Mostly sunny";
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
