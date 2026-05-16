/**
 * Final response formatter agent. Composes the conversational, voice-friendly
 * answer that the frontend reads aloud. Receives all upstream agent outputs
 * and returns plain text (no markdown, no lists).
 */

import { complete } from "../llm";
import {
  Env,
  IntentResult,
  NearbyPlace,
  WeatherResponse,
} from "../types";

const SYSTEM_PROMPT = `You are the NaviX Final Response Formatter for a Sri Lankan tourism assistant.

Combine all agent outputs into one natural, conversational, voice-friendly reply.

Strict rules:
- No markdown, no bullet lists, no headings, no emoji.
- Keep it warm, practical, and short (3-6 sentences, under ~110 words).
- Mention the nearest attraction when useful and include its distance naturally.
- Adapt advice to the weather; if "weather" is null, do not invent weather facts.
- If "nearby_places" is empty, give general Sri Lankan suggestions instead of inventing specifics.
- Always reply in the same language as the user's query.
- Output plain text only — this string is sent directly to text-to-speech.`;

interface ResponsePayload {
  query: string;
  intent: IntentResult;
  tourism_agent_output: string;
  weather: WeatherResponse | null;
  weather_advice: string | null;
  nearby_places: Array<{
    name: string;
    category: string;
    distance_km: number;
    tags: string[];
  }>;
}

export async function runResponseAgent(
  env: Env,
  query: string,
  intent: IntentResult,
  tourismText: string,
  weather: WeatherResponse | null,
  weatherAdvice: string | null,
  nearby: NearbyPlace[]
): Promise<string> {
  const payload: ResponsePayload = {
    query,
    intent,
    tourism_agent_output: tourismText,
    weather,
    weather_advice: weatherAdvice,
    nearby_places: nearby.slice(0, 3).map((p) => ({
      name: p.name,
      category: p.category,
      distance_km: p.distance_km,
      tags: p.tags,
    })),
  };

  const { text } = await complete(env, SYSTEM_PROMPT, JSON.stringify(payload), {
    temperature: 0.45,
  });
  return text;
}

/**
 * Strip markdown / list characters so the answer plays well with TTS.
 * Used to produce voice_script from the answer.
 */
export function toVoiceScript(text: string): string {
  return text
    .replace(/[*_`#>~\[\]\(\)]/g, "")
    .replace(/^\s*[-•]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
