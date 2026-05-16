/**
 * NaviX Cloudflare Worker — entrypoint.
 *
 * Routes (CORS-enabled, JSON):
 *   GET  /health                       Worker + service status
 *   GET  /weather?lat&lon              Live weather for a coordinate
 *   GET  /nearby?lat&lon&limit         Nearest places from D1 (Haversine)
 *   POST /chat                         Multi-agent answer pipeline
 *
 * The API contract intentionally matches the legacy FastAPI backend so the
 * frontend only needs VITE_API_BASE_URL pointed at this Worker.
 */

import { classifyIntent } from "./agents/intent";
import { runResponseAgent, toVoiceScript } from "./agents/response";
import { runTourismAgent } from "./agents/tourism";
import { runWeatherAgent } from "./agents/weather";
import {
  findNearestPlaces,
  findPlaceByName,
  searchPlacesByName,
} from "./db";
import {
  ChatRequest,
  ChatResponse,
  Coordinates,
  Env,
  HttpError,
  IntentResult,
  NearbyPlace,
  WeatherResponse,
} from "./types";
import { getWeather } from "./weather";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function parseNearbyRadiusMeters(url: URL): number {
  const radiusRaw = (url.searchParams.get("radius") ?? "").trim().toLowerCase();
  const unit = (url.searchParams.get("unit") ?? "").trim().toLowerCase();

  if (!radiusRaw) {
    throw new Error("radius is required");
  }

  const kmSuffix = radiusRaw.endsWith("km");
  const mSuffix = radiusRaw.endsWith("m");
  const numericPart = radiusRaw.replace(/km$|m$/g, "");
  const numeric = Number(numericPart);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("radius must be a positive number");
  }

  if (kmSuffix || unit === "km") {
    return numeric * 1000;
  }
  if (mSuffix || unit === "m" || unit === "meter" || unit === "meters") {
    return numeric;
  }

  // If no unit provided, treat small values as km and larger values as meters.
  return numeric <= 100 ? numeric * 1000 : numeric;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    try {
      switch (url.pathname) {
        case "/":
        case "/health":
          return json(await healthHandler(env));
        case "/weather":
          return json(await weatherHandler(env, url));
        case "/nearby":
          return json(await nearbyHandler(env, url));
        case "/chat": {
          if (request.method !== "POST") {
            throw new HttpError(405, "Use POST for /chat.");
          }
          return json(await chatHandler(env, request));
        }
        default:
          throw new HttpError(404, `Route not found: ${url.pathname}`);
      }
    } catch (err) {
      return errorResponse(err);
    }
  },
};

// ───────────────────────────────────────── Handlers

async function healthHandler(env: Env): Promise<Record<string, unknown>> {
  const d1 = env.DB ? "configured" : "missing";
  return {
    status: "ok",
    services: {
      worker: "ok",
      d1,
      openai: env.OPENAI_API_KEY ? "configured" : "missing",
      gemini: env.GEMINI_API_KEY ? "configured" : "missing",
      weather: env.WEATHER_API_KEY ? "configured" : "mock",
    },
  };
}

async function weatherHandler(env: Env, url: URL): Promise<WeatherResponse> {
  const lat = requireFloat(url.searchParams.get("lat"), "lat");
  const lon = requireFloat(url.searchParams.get("lon"), "lon");
  return getWeather(env, lat, lon);
}

async function nearbyHandler(env: Env, url: URL): Promise<NearbyPlace[]> {
  const lat = requireFloat(url.searchParams.get("lat"), "lat");
  const lon = requireFloat(url.searchParams.get("lon"), "lon");
  const limit = Math.min(
    20,
    Math.max(1, Number(url.searchParams.get("limit") ?? 5) || 5)
  );
  const db = requireDb(env);
  return findNearestPlaces(db, lat, lon, limit);
}

async function chatHandler(env: Env, request: Request): Promise<ChatResponse> {
  const body = (await safeJson(request)) as ChatRequest;
  const query = (body.query ?? body.prompt ?? "").trim();
  if (!query) throw new HttpError(400, "Field 'query' (or 'prompt') is required.");

  const lat = parseOptionalFloat(body.lat);
  const lon = parseOptionalFloat(body.lon ?? body.lng);

  // Intent (best-effort with heuristic fallback inside the agent)
  const intent = await classifyIntent(env, query);

  // Nearby places — requires lat/lon and D1
  let nearby: NearbyPlace[] = [];
  if (lat !== null && lon !== null && env.DB) {
    try {
      nearby = await findNearestPlaces(env.DB, lat, lon, 5);
    } catch {
      nearby = [];
    }
  }

  // Weather — only if we have coords; never break the whole chat if it fails
  let weather: WeatherResponse | null = null;
  if (lat !== null && lon !== null) {
    try {
      weather = await getWeather(env, lat, lon);
    } catch {
      weather = null;
    }
  }

  // Tourism knowledge synthesis (LLM with fallback inside the agent)
  let tourismText = "";
  try {
    tourismText = await runTourismAgent(env, query, intent, nearby);
  } catch (e) {
    tourismText = nearby[0]?.deep_history.summary ?? "";
  }

  const weatherAdvice = runWeatherAgent(weather);

  // Final voice-friendly response (this one is allowed to surface 503)
  const answer = await runResponseAgent(
    env,
    query,
    intent,
    tourismText,
    weather,
    weatherAdvice,
    nearby
  );

  const matched = await resolveMatchedCoordinates(env, query, intent, nearby);

  return {
    answer,
    voice_script: toVoiceScript(answer),
    intent,
    weather,
    nearby,
    matched_location_coordinates: matched,
  };
}

// ───────────────────────────────────────── Helpers

async function resolveMatchedCoordinates(
  env: Env,
  query: string,
  intent: IntentResult,
  nearby: NearbyPlace[]
): Promise<Coordinates | null> {
  if (!env.DB) return nearby[0]?.coordinates ?? null;

  // 1. Try entities reported by intent agent
  const entityNames = Object.values(intent.entities ?? {})
    .filter((v): v is string => typeof v === "string" && v.length > 1);
  for (const name of entityNames) {
    const hit = await findPlaceByName(env.DB, name);
    if (hit) return hit.coordinates;
  }

  // 2. Try substring search against the query itself
  const cleaned = query.replace(/[^\w\s]/g, " ").trim();
  if (cleaned.length >= 3) {
    const matches = await searchPlacesByName(env.DB, cleaned, 1);
    if (matches.length > 0) return matches[0].coordinates;
  }

  // 3. Fall back to the closest nearby place
  return nearby[0]?.coordinates ?? null;
}

function requireDb(env: Env): D1Database {
  if (!env.DB) {
    throw new HttpError(
      503,
      "D1 binding 'DB' is not configured. Check wrangler.toml [[d1_databases]]."
    );
  }
  return env.DB;
}

function requireFloat(value: string | null, name: string): number {
  if (value === null || value === "") {
    throw new HttpError(400, `Query parameter '${name}' is required.`);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new HttpError(400, `Query parameter '${name}' must be a number.`);
  }
  return n;
}

function parseOptionalFloat(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function safeJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return json({ error: err.message, status: err.status }, err.status);
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  return json({ error: message, status: 500 }, 500);
}
