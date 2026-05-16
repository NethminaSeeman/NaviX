import { askGemini } from "./ai";
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
