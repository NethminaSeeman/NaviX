/**
 * NaviX Cloudflare Worker — entrypoint.
 *
 * Routes (CORS-enabled, JSON):
 *   PUBLIC:
 *     GET  /health                       Worker + service status
 *     GET  /weather?lat&lon              Live weather for a coordinate
 *     POST /auth/register | login | google | logout
 *     GET  /auth/me                      Current user + access summary
 *     POST /billing/webhook              Stripe webhook (signature-verified)
 *
 *   GATED (require active trial or paid subscription):
 *     POST /chat                         Multi-agent answer pipeline
 *     GET  /nearby?lat&lon&limit         Nearest places from D1
 *     POST /billing/checkout | portal
 *     GET  /billing/status
 *
 * The chat/nearby contract intentionally matches the legacy FastAPI backend
 * so the frontend only needs VITE_API_BASE_URL pointed at this Worker.
 */

import { classifyIntent } from "./agents/intent";
import { runResponseAgent, toVoiceScript } from "./agents/response";
import { runTourismAgent } from "./agents/tourism";
import { runWeatherAgent } from "./agents/weather";
import { computeAccess, requireActiveAccess } from "./auth/middleware";
import { loadSession } from "./auth/middleware";
import {
  findNearestPlaces,
  findPlaceByName,
  searchPlacesByName,
} from "./db";
import { dispatchAuth } from "./routes/auth";
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
import { getWeather } from "./weather";

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
        case "/nearby": {
          await requireActiveAccess(env, request);
          return json(await nearbyHandler(env, url));
        }
        case "/chat": {
          if (request.method !== "POST") {
            throw new HttpError(405, "Use POST for /chat.");
          }
          await requireActiveAccess(env, request);
          return json(await chatHandler(env, request));
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

  const intent = await classifyIntent(env, query);

  let nearby: NearbyPlace[] = [];
  if (lat !== null && lon !== null && env.DB) {
    try {
      nearby = await findNearestPlaces(env.DB, lat, lon, 5);
    } catch {
      nearby = [];
    }
  }

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

  const entityNames = Object.values(intent.entities ?? {})
    .filter((v): v is string => typeof v === "string" && v.length > 1);
  for (const name of entityNames) {
    const hit = await findPlaceByName(env.DB, name);
    if (hit) return hit.coordinates;
  }

  const cleaned = query.replace(/[^\w\s]/g, " ").trim();
  if (cleaned.length >= 3) {
    const matches = await searchPlacesByName(env.DB, cleaned, 1);
    if (matches.length > 0) return matches[0].coordinates;
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
