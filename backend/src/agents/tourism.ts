/**
 * Tourism knowledge agent. Grounded on the nearest places retrieved from
 * D1 plus the classified intent. Returns a tight, factual paragraph the
 * final response agent can rephrase for voice output.
 */

import { complete } from "../llm";
import { Env, IntentResult, NearbyPlace } from "../types";

const SYSTEM_PROMPT = `You are the NaviX Tourism Knowledge Agent for Sri Lanka.

Goal: produce 2-4 grounded sentences with practical, factual tourism information.

Rules:
- Use ONLY the provided "nearby_places" context for specific place facts.
- If the user asks about a place that is NOT in the context, you may give general
  Sri Lanka knowledge but must not invent specific attractions, hours, or prices.
- Tailor depth to the intent: HISTORY -> emphasise era + cultural significance;
  ROUTE -> highlight distance and travel logistics; BEACH/CULTURE/FOOD -> match tone.
- Keep it concise; the response agent will reformat for voice later.
- Never use markdown, bullet lists, or headings.

IMPORTANT: When the user asks about a specific district or city (e.g. "Colombo", "Kandy"),
you MUST prioritise the locations from the provided context that belong to that district.
Mention them by name and give concrete details from their summaries.`;

interface Payload {
  query: string;
  intent: IntentResult;
  nearby_places: Array<
    Pick<NearbyPlace, "name" | "category" | "tags" | "distance_km"> & {
      summary: string;
      cultural_significance: string;
      era?: string;
    }
  >;
}

export async function runTourismAgent(
  env: Env,
  query: string,
  intent: IntentResult,
  nearby: NearbyPlace[]
): Promise<string> {
  const payload: Payload = {
    query,
    intent,
    nearby_places: nearby.slice(0, 5).map((p) => ({
      name: p.name,
      category: p.category,
      tags: p.tags,
      distance_km: p.distance_km,
      era: p.era,
      summary: p.deep_history.summary,
      cultural_significance: p.deep_history.cultural_significance,
    })),
  };

  try {
    const { text } = await complete(env, SYSTEM_PROMPT, JSON.stringify(payload), {
      temperature: 0.35,
    });
    return text;
  } catch {
    if (nearby.length === 0) {
      return "Sri Lanka offers an extraordinary mix of ancient cities, hill country, beaches and wildlife. Tell me where you are or what you're interested in and I can be more specific.";
    }
    const lead = nearby[0];
    return `${lead.name} is one of the closest highlights right now (${lead.distance_km} km away). ${lead.deep_history.summary || "It's a worthwhile stop in this region."}`;
  }
}
