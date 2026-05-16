import type { Env } from "./index";

export type IntentCategory = "HISTORY" | "ROUTING" | "WEATHER" | "GENERAL";

export interface IntentAnalysis {
  category: IntentCategory;
  entities: string[];
  requires_immediate_action: boolean;
}

export interface WeatherConstraints {
  is_outdoor_viable: boolean;
  operational_override: "NONE" | "RECOMMEND_INDOOR" | "SEEK_SHELTER";
  advisory_snippet: string;
}

export interface GroundedHeritage {
  matched_landmark: string;
  factual_bulletin: string;
  etiquette_constraints: string[];
}

export interface NaviXEnginePayload {
  intent_agent: IntentAnalysis;
  weather_agent: WeatherConstraints;
  heritage_agent: GroundedHeritage;
  voice_script: string;
}

const UNKNOWN_FALLBACK =
  "I don't have the deep history on this specific spot yet, but let's explore what's nearby!";

const NAVI_X_SYSTEM_INSTRUCTION = `
ROLE: You are the core multi-agent execution pipeline of NaviX, an elite, localized real-time digital tour guide for Sri Lanka.

SUB-AGENT ALIGNMENT DIRECTIVES:
1) intent_extraction_agent:
- Classify user intent into one enum: HISTORY, ROUTING, WEATHER, GENERAL.
- Extract key entities.
- Set requires_immediate_action for any safety or route-critical urgency.

2) weather_analytics_agent:
- Evaluate weather context.
- Determine outdoor viability.
- Select one override enum: NONE, RECOMMEND_INDOOR, SEEK_SHELTER.
- Provide a short advisory snippet for spoken output.

3) heritage_knowledge_agent:
- Ground historical facts strictly in database_context only.
- Never invent history details.
- If context is empty/mismatched, set matched_landmark to "Unknown".

4) voice_formatter_agent:
- Generate a natural spoken script (no markdown, no bullets, no headers).
- If matched_landmark is "Unknown", voice_script MUST be exactly:
  "${UNKNOWN_FALLBACK}"

OUTPUT CONTRACT:
Return valid JSON only with this exact shape:
{
  "intent_agent": {
    "category": "HISTORY|ROUTING|WEATHER|GENERAL",
    "entities": ["..."],
    "requires_immediate_action": true
  },
  "weather_agent": {
    "is_outdoor_viable": true,
    "operational_override": "NONE|RECOMMEND_INDOOR|SEEK_SHELTER",
    "advisory_snippet": "..."
  },
  "heritage_agent": {
    "matched_landmark": "...",
    "factual_bulletin": "...",
    "etiquette_constraints": ["..."]
  },
  "voice_script": "..."
}
`;

export async function askGemini(
  env: Env,
  prompt: string,
  context?: string
): Promise<string> {
  const system = context
    ? `You are NaviX, a knowledgeable guide to Sri Lanka. Use this context:\n${context}`
    : "You are NaviX, a friendly and accurate guide to Sri Lanka's history, culture, and travel.";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${system}\n\nUser: ${prompt}` }],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

export async function runNaviXPipeline(
  env: Env,
  userQuery: string,
  databasePayload: Record<string, unknown>,
  weatherPayload: Record<string, unknown>
): Promise<NaviXEnginePayload> {
  const executionContext = `
<state_vectors>
  <user_query>${userQuery}</user_query>
  <database_context>${JSON.stringify(databasePayload)}</database_context>
  <weather_context>${JSON.stringify(weatherPayload)}</weather_context>
</state_vectors>
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${NAVI_X_SYSTEM_INSTRUCTION}\n\n${executionContext}` }],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Empty structured response from Gemini");

  const parsed = safeParseJson<NaviXEnginePayload>(extractJsonBlock(rawText));
  const validated = validatePayloadShape(parsed);

  if (validated.heritage_agent.matched_landmark === "Unknown") {
    validated.voice_script = UNKNOWN_FALLBACK;
  }

  return validated;
}

function extractJsonBlock(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1];
  return text.trim();
}

function safeParseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Model output was not valid JSON");
  }
}

function validatePayloadShape(input: unknown): NaviXEnginePayload {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid payload shape: root object missing");
  }
  const payload = input as Partial<NaviXEnginePayload>;
  const intent = payload.intent_agent;
  const weather = payload.weather_agent;
  const heritage = payload.heritage_agent;

  const validCategory =
    intent?.category === "HISTORY" ||
    intent?.category === "ROUTING" ||
    intent?.category === "WEATHER" ||
    intent?.category === "GENERAL";
  const validOverride =
    weather?.operational_override === "NONE" ||
    weather?.operational_override === "RECOMMEND_INDOOR" ||
    weather?.operational_override === "SEEK_SHELTER";

  if (
    !intent ||
    !weather ||
    !heritage ||
    !validCategory ||
    !validOverride ||
    !Array.isArray(intent.entities) ||
    typeof intent.requires_immediate_action !== "boolean" ||
    typeof weather.is_outdoor_viable !== "boolean" ||
    typeof weather.advisory_snippet !== "string" ||
    typeof heritage.matched_landmark !== "string" ||
    typeof heritage.factual_bulletin !== "string" ||
    !Array.isArray(heritage.etiquette_constraints) ||
    typeof payload.voice_script !== "string"
  ) {
    throw new Error("Invalid payload shape returned by model");
  }

  return {
    intent_agent: {
      category: intent.category,
      entities: intent.entities.map(String),
      requires_immediate_action: intent.requires_immediate_action,
    },
    weather_agent: {
      is_outdoor_viable: weather.is_outdoor_viable,
      operational_override: weather.operational_override,
      advisory_snippet: weather.advisory_snippet,
    },
    heritage_agent: {
      matched_landmark: heritage.matched_landmark,
      factual_bulletin: heritage.factual_bulletin,
      etiquette_constraints: heritage.etiquette_constraints.map(String),
    },
    voice_script: payload.voice_script,
  };
}
