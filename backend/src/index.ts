import { askGemini, runNaviXPipeline } from "./ai";
import { getWeather } from "./weather";

export interface Env {
  GEMINI_API_KEY: string;
  MONGODB_URI: string;
  WEATHER_API_KEY?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/weather" && request.method === "GET") {
        const lat = Number(url.searchParams.get("lat"));
        const lon = Number(url.searchParams.get("lon"));
        const data = await getWeather(env, lat, lon);
        return json(data);
      }

      if (url.pathname === "/api/ask" && request.method === "POST") {
        const body = (await request.json()) as {
          prompt?: string;
          context?: string;
        };
        if (!body.prompt) {
          return json({ error: "prompt required" }, 400);
        }
        const answer = await askGemini(env, body.prompt, body.context);
        return json({ answer });
      }

      if (url.pathname === "/api/navix/chat" && request.method === "POST") {
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

        const mockMongodbPayload = {
          nearest_site: "Sigiriya Rock Fortress",
          district: "Matale",
          distance_meters: 45,
          verified_history:
            "Built by King Kashyapa in the 5th century AD. Features a gateway shaped like an enormous lion, and advanced ancient hydraulic infrastructure.",
          cultural_rules:
            "No graffiti allowed. Moderate climbing stamina required. Keep hold of loose personal belongings due to high winds and local wildlife.",
        };

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
          mockMongodbPayload,
          weatherContext
        );

        return json({
          status: "success",
          payload: orchestrationResult,
        });
      }

      if (url.pathname === "/health") {
        return json({ status: "ok" });
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
