/**
 * Intent classification agent. Maps the user's query to one of:
 *   HISTORY | ROUTE | FOOD | WEATHER | BEACH | CULTURE | GENERAL
 * and flags whether downstream agents need weather / nearby-places context.
 */

import { complete, extractJsonObject } from "../llm";
import { Env, IntentCategory, IntentResult } from "../types";

const VALID_CATEGORIES: IntentCategory[] = [
  "HISTORY",
  "ROUTE",
  "FOOD",
  "WEATHER",
  "BEACH",
  "CULTURE",
  "GENERAL",
];

const SYSTEM_PROMPT = `You are the NaviX Intent Classification Agent.
You receive a tourist's question about Sri Lanka and must return JSON only.

Rules:
- Classify "intent" as one of: HISTORY, ROUTE, FOOD, WEATHER, BEACH, CULTURE, GENERAL.
- Set "needs_weather" true for outdoor, beach, hike, route, weather, trip-timing, or any question mentioning a future date.
- Set "needs_nearby" true whenever location-relevant suggestions help (almost always).
- Extract entities (location names, food names) into "entities".
- Extract "travel_date" into entities if the user mentions when they want to go:
  - "today" → "today", "tomorrow" → "tomorrow"
  - A specific date → ISO string, "next week"/"this weekend" → the phrase as-is
- Confidence is between 0 and 1.

Respond with raw JSON only — no markdown, no commentary.

JSON schema:
{
  "intent": "HISTORY|ROUTE|FOOD|WEATHER|BEACH|CULTURE|GENERAL",
  "confidence": 0.0,
  "entities": {},
  "needs_weather": false,
  "needs_nearby": true
}`;

export async function classifyIntent(env: Env, query: string): Promise<IntentResult> {
  const fallback: IntentResult = heuristicIntent(query);

  try {
    const { text } = await complete(env, SYSTEM_PROMPT, query, {
      temperature: 0,
      jsonMode: true,
    });
    const parsed = extractJsonObject<Partial<IntentResult>>(text, {});
    return normalizeIntent(parsed, fallback);
  } catch {
    return fallback;
  }
}

function normalizeIntent(
  raw: Partial<IntentResult>,
  fallback: IntentResult
): IntentResult {
  const intent = VALID_CATEGORIES.includes(raw.intent as IntentCategory)
    ? (raw.intent as IntentCategory)
    : fallback.intent;

  const confidence =
    typeof raw.confidence === "number" && raw.confidence >= 0 && raw.confidence <= 1
      ? raw.confidence
      : fallback.confidence;

  return {
    intent,
    confidence,
    entities:
      raw.entities && typeof raw.entities === "object"
        ? (raw.entities as Record<string, unknown>)
        : fallback.entities,
    needs_weather:
      typeof raw.needs_weather === "boolean" ? raw.needs_weather : fallback.needs_weather,
    needs_nearby:
      typeof raw.needs_nearby === "boolean" ? raw.needs_nearby : fallback.needs_nearby,
  };
}

function heuristicIntent(query: string): IntentResult {
  const q = query.toLowerCase();
  let intent: IntentCategory = "GENERAL";
  if (/weather|rain|sun|temperature|climate|forecast/.test(q)) intent = "WEATHER";
  else if (/beach|surf|coast|swim|snorkel|dive/.test(q)) intent = "BEACH";
  else if (/food|eat|restaurant|cuisine|hopper|rice|curry|kottu/.test(q)) intent = "FOOD";
  else if (/route|drive|distance|travel time|how to get|directions/.test(q)) intent = "ROUTE";
  else if (/history|ancient|king|kingdom|stupa|fort|colonial|era/.test(q)) intent = "HISTORY";
  else if (/temple|culture|festival|dance|ritual|tradition/.test(q)) intent = "CULTURE";

  return {
    intent,
    confidence: 0.5,
    entities: {},
    needs_weather: ["WEATHER", "BEACH", "ROUTE"].includes(intent),
    needs_nearby: true,
  };
}
