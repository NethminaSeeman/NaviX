import { askGemini, runNaviXPipeline } from "./ai";
import {
  findNearbyLocations,
  findNearestHeritage,
  findPlaces,
  type HeritageContext,
} from "./db";
import { getWeather } from "./weather";

export interface Env {
  DB?: D1Database;
  GEMINI_API_KEY: string;
  WEATHER_API_KEY?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const FALLBACK_HERITAGE: HeritageContext = {
  nearest_site: "Sigiriya Rock Fortress",
  district: "Matale",
  distance_meters: 45,
  verified_history:
    "Built by King Kashyapa in the 5th century AD. Features a gateway shaped like an enormous lion, and advanced ancient hydraulic infrastructure.",
  cultural_rules:
    "No graffiti allowed. Moderate climbing stamina required. Keep hold of loose personal belongings due to high winds and local wildlife.",
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
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      if (
        (url.pathname === "/api/weather" || url.pathname === "/weather") &&
        request.method === "GET"
      ) {
        const lat = Number(url.searchParams.get("lat"));
        const lon = Number(
          url.searchParams.get("lon") ?? url.searchParams.get("lng")
        );
        const data = await getWeather(env, lat, lon);
        return json({
          ...data,
          temperature: data.temp,
          description: data.description,
        });
      }

      if (
        (url.pathname === "/api/places" || url.pathname === "/places") &&
        request.method === "GET"
      ) {
        const places = await findPlaces(env);
        return json(places);
      }

      if (
        (url.pathname === "/api/nearby" || url.pathname === "/nearby") &&
        request.method === "GET"
      ) {
        const lat = Number(url.searchParams.get("lat"));
        const lng = Number(
          url.searchParams.get("lng") ?? url.searchParams.get("lon")
        );
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return json({ error: "lat and lng are required numbers" }, 400);
        }

        let radiusMeters: number;
        try {
          radiusMeters = parseNearbyRadiusMeters(url);
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : "invalid radius" },
            400
          );
        }

        const limitRaw = Number(url.searchParams.get("limit") ?? "500");
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 500;

        const rows = await findNearbyLocations(
          env,
          lat,
          lng,
          radiusMeters,
          limit
        );
        return json({
          count: rows.length,
          radius_meters: radiusMeters,
          data: rows,
        });
      }

      if (
        (url.pathname === "/api/ask" || url.pathname === "/chat") &&
        request.method === "POST"
      ) {
        const body = (await request.json()) as {
          prompt?: string;
          message?: string;
          context?: string;
        };
        const prompt = body.prompt || body.message;
        if (!prompt) {
          return json({ error: "prompt required" }, 400);
        }
        const answer = await askGemini(env, prompt, body.context);
        return json({ answer, response: answer, message: answer });
      }

      if (
        (url.pathname === "/api/navix/chat" || url.pathname === "/api/chat") &&
        request.method === "POST"
      ) {
        const body = (await request.json()) as {
          message?: string;
          lat?: number;
          lng?: number;
          weather_data?: Record<string, unknown>;
        };

        if (!body.message) {
          return json({ error: "message required" }, 400);
        }

        if (typeof body.lat !== "number" || typeof body.lng !== "number") {
          return json({ error: "lat and lng are required numbers" }, 400);
        }

        const heritageContext =
          (await findNearestHeritage(env, body.lat, body.lng)) ??
          FALLBACK_HERITAGE;

        let weatherContext: Record<string, unknown>;
        if (body.weather_data && typeof body.weather_data === "object") {
          weatherContext = body.weather_data;
        } else {
          const weather = await getWeather(env, body.lat, body.lng);
          weatherContext = {
            temp: weather.temp,
            condition: weather.description,
          };
        }

        const orchestrationResult = await runNaviXPipeline(
          env,
          body.message,
          heritageContext,
          weatherContext
        );

        return json({
          status: "success",
          payload: orchestrationResult,
          answer: orchestrationResult.voice_script,
          response: orchestrationResult.voice_script,
        });
      }

      if (url.pathname === "/health") {
        return json({
          status: "ok",
          services: {
            worker: true,
            d1: Boolean(env.DB),
          },
        });
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      return json({ error: message }, 500);
    }
  },
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
