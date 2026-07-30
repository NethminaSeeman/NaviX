/**
 * NaviX Cloudflare Worker — entrypoint.
 *
 * Routes (CORS-enabled, JSON):
 *   PUBLIC:
 *     GET  /health                       Worker + service status
 *     GET  /weather?lat&lon              Live weather for a coordinate
 *     GET  /places                       All places from D1 (map + home)
 *     POST /auth/register | login | google | logout
 *     GET  /auth/me                      Current user + access summary
 *     POST /billing/webhook              Stripe webhook (signature-verified)
 *
 *   GATED (require active trial or paid subscription):
 *     POST /chat                         Multi-agent answer pipeline
 *     POST /transcribe                   Whisper (or Gemini) speech-to-text
 *     POST /voice/token                  LiveKit room JWT for voice assistant
 *     GET  /nearby?lat&lon&limit         Nearest places from D1
 *     POST /billing/checkout | portal
 *     GET  /billing/status
 *
 * The chat/nearby contract intentionally matches the legacy FastAPI backend
 * so the frontend only needs VITE_API_BASE_URL pointed at this Worker.
 */

import { classifyIntent } from "./agents/intent";
import { runTripOrchestrator } from "./agents/orchestrator";
import { runResponseAgent, toVoiceScript } from "./agents/response";
import { runTourismAgent } from "./agents/tourism";
import { runWeatherAgent } from "./agents/weather";
import { computeAccess, requireActiveAccess } from "./auth/middleware";
import { loadSession } from "./auth/middleware";
import {
  findAllPlaces,
  findNearbyLocations,
  findNearestPlaces,
  findPlaceByName,
  searchPlacesByDistrict,
  searchPlacesByName,
} from "./db";
import { dispatchAuth } from "./routes/auth";
import { dispatchAdmin } from "./routes/admin";
import { dispatchBilling } from "./routes/billing";
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
import { transcribeAudio } from "./transcribe";
import { mintLiveKitToken } from "./voice/token";
import { getWeather, getWeatherForecast } from "./weather";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Stripe-Signature",
  "Access-Control-Expose-Headers": "WWW-Authenticate",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    try {
      // /auth/* — delegated module
      if (url.pathname.startsWith("/auth/")) {
        const payload = await dispatchAuth(env, request, url);
        if (payload === null) {
          throw new HttpError(404, `Route not found: ${url.pathname}`);
        }
        return json(payload);
      }

      if (url.pathname.startsWith("/admin/")) {
        const payload = await dispatchAdmin(env, request, url);
        if (payload === null) {
          throw new HttpError(404, `Route not found: ${url.pathname}`);
        }
        return json(payload);
      }

      // /billing/* — webhook returns its own Response (must not be re-wrapped),
      //               other endpoints return data we wrap with json().
      if (url.pathname.startsWith("/billing/")) {
        if (url.pathname === "/billing/webhook" && request.method === "POST") {
          const res = await dispatchBilling(env, request, url);
          if (res instanceof Response) {
            return withCors(res);
          }
        }
        const payload = await dispatchBilling(env, request, url);
        if (payload === null) {
          throw new HttpError(404, `Route not found: ${url.pathname}`);
        }
        if (payload instanceof Response) return withCors(payload);
        return json(payload);
      }

      switch (url.pathname) {
        case "/":
        case "/health":
          return json(await healthHandler(env));
        case "/weather":
          return json(await weatherHandler(env, url));
        case "/places":
          return json(await placesHandler(env));
        case "/nearby":
          return json(await nearbyHandler(env, url));
        case "/chat": {
          if (request.method !== "POST") {
            throw new HttpError(405, "Use POST for /chat.");
          }
          await requireActiveAccess(env, request);
          return json(await chatHandler(env, request));
        }
        case "/transcribe": {
          if (request.method !== "POST") {
            throw new HttpError(405, "Use POST for /transcribe.");
          }
          await requireActiveAccess(env, request);
          return json(await transcribeHandler(env, request));
        }
        case "/voice/token": {
          if (request.method !== "POST") {
            throw new HttpError(405, "Use POST for /voice/token.");
          }
          return json(await voiceTokenHandler(env, request));
        }
        default:
          throw new HttpError(404, `Route not found: ${url.pathname}`);
      }
    } catch (err) {
      return errorResponse(env, request, err);
    }
  },
};

// ───────────────────────────────────────── Handlers

async function healthHandler(env: Env): Promise<Record<string, unknown>> {
  let d1: string = env.DB ? "configured" : "missing";
  if (env.DB) {
    try {
      const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM places").first<{
        n: number;
      }>();
      d1 = row && typeof row.n === "number" ? `ok (${row.n} places)` : "ok";
    } catch (e) {
      d1 = `error: ${(e as Error).message}`;
    }
  }

  return {
    status: "ok",
    services: {
      worker: "ok",
      d1,
      openai: env.OPENAI_API_KEY ? "configured" : "missing",
      gemini: env.GEMINI_API_KEY ? "configured" : "missing",
      weather: env.WEATHER_API_KEY ? "configured" : "mock",
      google_auth: env.GOOGLE_CLIENT_ID ? "configured" : "missing",
      stripe: env.STRIPE_SECRET_KEY ? "configured" : "missing",
      stripe_webhook: env.STRIPE_WEBHOOK_SECRET ? "configured" : "missing",
      livekit: env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET && env.LIVEKIT_URL
        ? "configured"
        : "missing",
    },
  };
}

async function weatherHandler(env: Env, url: URL): Promise<WeatherResponse> {
  const lat = requireFloat(url.searchParams.get("lat"), "lat");
  const lon = requireFloat(url.searchParams.get("lon"), "lon");
  return getWeather(env, lat, lon);
}

async function placesHandler(env: Env) {
  requireDb(env);
  const places = await findAllPlaces(env.DB!);
  // Shape expected by frontend normalizePlace / MapView
  return places.map((p) => ({
    id: p.id,
    location_id: p.id,
    name: p.name,
    category: p.category,
    era: p.era,
    tags: p.tags,
    coordinates: { lat: p.coordinates.lat, lng: p.coordinates.lng },
    lat: p.coordinates.lat,
    lng: p.coordinates.lng,
    deep_history: p.deep_history,
    tts_hints: p.tts_hints,
    history: p.deep_history?.summary,
    description: p.deep_history?.summary,
  }));
}

async function voiceTokenHandler(env: Env, request: Request) {
  const session = await requireActiveAccess(env, request);
  const body = (await safeJson(request)) as {
    lat?: unknown;
    lon?: unknown;
    lng?: unknown;
  };

  const lat = parseOptionalFloat(body.lat);
  const lon = parseOptionalFloat(body.lon ?? body.lng);
  const authHeader = request.headers.get("Authorization") || "";
  const navixToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  const roomName = `navix-${session.user.id}-${crypto.randomUUID().slice(0, 8)}`;
  const identity = `user-${session.user.id}`;

  return mintLiveKitToken(env, {
    identity,
    name: session.user.name || session.user.email,
    roomName,
    metadata: {
      navixToken: navixToken || undefined,
      lat,
      lon,
    },
  });
}

function parseNearbyRadiusMeters(url: URL): number {
  const radiusRaw = (url.searchParams.get("radius") ?? "").trim().toLowerCase();
  const unit = (url.searchParams.get("unit") ?? "").trim().toLowerCase();

  if (!radiusRaw) {
    throw new HttpError(400, "radius is required");
  }

  const kmSuffix = radiusRaw.endsWith("km");
  const mSuffix = radiusRaw.endsWith("m");
  const numericPart = radiusRaw.replace(/km$|m$/g, "");
  const numeric = Number(numericPart);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new HttpError(400, "radius must be a positive number");
  }

  if (kmSuffix || unit === "km") return numeric * 1000;
  if (mSuffix || unit === "m" || unit === "meter" || unit === "meters") {
    return numeric;
  }

  // No explicit unit: small values interpreted as km, larger as meters.
  return numeric <= 100 ? numeric * 1000 : numeric;
}

async function nearbyHandler(env: Env, url: URL) {
  const lat = requireFloat(url.searchParams.get("lat"), "lat");
  const lonRaw =
    url.searchParams.get("lon") ?? url.searchParams.get("lng");
  if (lonRaw === null) {
    throw new HttpError(400, "Query parameter 'lon' (or 'lng') is required.");
  }
  const lon = Number(lonRaw);
  if (!Number.isFinite(lon)) {
    throw new HttpError(400, "Query parameter 'lon' must be a number.");
  }

  const radiusMeters = parseNearbyRadiusMeters(url);
  const limit = Math.min(
    500,
    Math.max(1, Number(url.searchParams.get("limit") ?? 500) || 500)
  );

  requireDb(env);
  const rows = await findNearbyLocations(env, lat, lon, radiusMeters, limit);
  return { count: rows.length, radius_meters: radiusMeters, data: rows };
}

// ───────────────────────────────────────── Handlers

async function transcribeHandler(
  env: Env,
  request: Request
): Promise<{ text: string; provider: string }> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    throw new HttpError(400, "Send multipart/form-data with an `audio` file field.");
  }

  const form = await request.formData();
  const file = form.get("audio");
  if (!(file instanceof File)) {
    throw new HttpError(400, "Missing `audio` file field.");
  }

  const buffer = await file.arrayBuffer();
  return transcribeAudio(
    env,
    buffer,
    file.type || "application/octet-stream",
    file.name || "speech.webm"
  );
}

async function chatHandler(env: Env, request: Request): Promise<ChatResponse> {
  const body = (await safeJson(request)) as ChatRequest;
  const query = (body.query ?? body.prompt ?? "").trim();
  if (!query) throw new HttpError(400, "Field 'query' (or 'prompt') is required.");

  const lat = parseOptionalFloat(body.lat);
  const lon = parseOptionalFloat(body.lon ?? body.lng);

  const intent = await classifyIntent(env, query);

  // GPS-based nearby places
  let gpsNearby: NearbyPlace[] = [];
  if (lat !== null && lon !== null && env.DB) {
    try {
      gpsNearby = await findNearestPlaces(env.DB, lat, lon, 5);
    } catch {
      gpsNearby = [];
    }
  }

  // District/entity-based search — find places relevant to the named location
  let districtNearby: NearbyPlace[] = [];
  if (env.DB) {
    const locationEntity = extractLocationEntity(intent);
    if (locationEntity) {
      try {
        districtNearby = await searchPlacesByDistrict(env.DB, locationEntity, 10);
      } catch {
        districtNearby = [];
      }
    }
  }

  // Merge: district results first (more relevant to the question), then GPS
  const nearby = mergeNearby(districtNearby, gpsNearby);

  let weather: WeatherResponse | null = null;
  if (lat !== null && lon !== null) {
    try {
      weather = await getWeather(env, lat, lon);
    } catch {
      weather = null;
    }
  }

  let tourismText = "";
  try {
    tourismText = await runTourismAgent(env, query, intent, nearby);
  } catch {
    tourismText = nearby[0]?.deep_history.summary ?? "";
  }

  const weatherAdvice = runWeatherAgent(weather);

  // Trip orchestration — weather-aware planning for future trips
  let orchestratorContext: Record<string, unknown> | null = null;
  try {
    orchestratorContext = await runTripOrchestrator(env, query, intent, nearby);
  } catch {
    orchestratorContext = null;
  }

  const answer = await runResponseAgent(
    env,
    query,
    intent,
    tourismText,
    weather,
    weatherAdvice,
    nearby,
    orchestratorContext
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

/** Extract a location/district name from intent entities. */
function extractLocationEntity(intent: IntentResult): string | null {
  const entities = intent.entities ?? {};
  for (const key of ["location", "district", "city", "place", "destination", "area"]) {
    const value = entities[key];
    if (typeof value === "string" && value.trim().length > 1) {
      return value.trim();
    }
  }
  return null;
}

/** Merge district-search and GPS-nearby results, deduplicating by ID. */
function mergeNearby(district: NearbyPlace[], gps: NearbyPlace[]): NearbyPlace[] {
  const seen = new Set<string>();
  const merged: NearbyPlace[] = [];
  for (const p of [...district, ...gps]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      merged.push(p);
    }
  }
  return merged;
}

// ───────────────────────────────────────── Helpers

async function resolveMatchedCoordinates(
  env: Env,
  query: string,
  intent: IntentResult,
  nearby: NearbyPlace[]
): Promise<Coordinates | null> {
  if (!env.DB) return nearby[0]?.coordinates ?? null;

  const entityNames = Object.values(intent.entities ?? {})
    .filter((v): v is string => typeof v === "string" && v.length > 1);
  for (const name of entityNames) {
    try {
      const hit = await findPlaceByName(env.DB, name.slice(0, 96));
      if (hit) return hit.coordinates;
    } catch {
      // Ignore lookup errors and continue with safer fallbacks.
    }
  }

  const cleaned = query.replace(/[^\w\s]/g, " ").trim();
  if (cleaned.length >= 3) {
    try {
      const matches = await searchPlacesByName(env.DB, cleaned, 1);
      if (matches.length > 0) return matches[0].coordinates;
    } catch {
      // Ignore search errors and use nearby fallback below.
    }
  }

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

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

async function errorResponse(
  env: Env,
  request: Request,
  err: unknown
): Promise<Response> {
  if (err instanceof HttpError) {
    // Special-case 402 so the frontend can show the upgrade UI with context.
    if (err.status === 402 && err.message === "subscription_required") {
      const session = await loadSession(env, request).catch(() => null);
      const access = session
        ? computeAccess(session.user, session.subscription)
        : null;
      return json(
        {
          error: "subscription_required",
          status: 402,
          trial_expired: access ? !access.is_trial && !access.is_paid : true,
          access,
        },
        402
      );
    }
    return json({ error: err.message, status: err.status }, err.status);
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  return json({ error: message, status: 500 }, 500);
}
