/**
 * LLM abstraction. Calls OpenAI (gpt-4o-mini) if OPENAI_API_KEY is set,
 * otherwise falls back to Google Gemini (gemini-1.5-flash). Uses raw
 * `fetch` so the Worker bundle stays small (no SDK dependencies).
 */

import { Env, HttpError } from "./types";

export interface CompleteOptions {
  temperature?: number;
  /** If true, instruct the model to return JSON only. */
  jsonMode?: boolean;
}

export type LlmProvider = "openai" | "gemini";

export async function complete(
  env: Env,
  systemPrompt: string,
  userPrompt: string,
  opts: CompleteOptions = {}
): Promise<{ text: string; provider: LlmProvider }> {
  if (env.OPENAI_API_KEY) {
    const text = await callOpenAI(env.OPENAI_API_KEY, systemPrompt, userPrompt, opts);
    return { text, provider: "openai" };
  }
  if (env.GEMINI_API_KEY) {
    const text = await callGemini(env.GEMINI_API_KEY, systemPrompt, userPrompt, opts);
    return { text, provider: "gemini" };
  }
  throw new HttpError(
    503,
    "No LLM configured on the Worker. Set OPENAI_API_KEY or GEMINI_API_KEY as a Cloudflare secret."
  );
}

// ─────────────────────────────────────────────────────────────────────
// OpenAI (Chat Completions)

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  opts: CompleteOptions
): Promise<string> {
  const body: Record<string, unknown> = {
    model: "gpt-4o-mini",
    temperature: opts.temperature ?? 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new HttpError(502, `OpenAI error ${res.status}: ${truncate(detail, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new HttpError(502, "OpenAI returned an empty response.");
  return text;
}

// ─────────────────────────────────────────────────────────────────────
// Google Gemini

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  opts: CompleteOptions
): Promise<string> {
  const merged = `${systemPrompt}\n\nUser:\n${userPrompt}${
    opts.jsonMode ? "\n\nRespond with valid JSON only." : ""
  }`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: merged }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.3,
        ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new HttpError(502, `Gemini error ${res.status}: ${truncate(detail, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new HttpError(502, "Gemini returned an empty response.");
  return text;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}...` : s;
}

/** Robust JSON extraction from LLM output that may include fences/prose. */
export function extractJsonObject<T>(text: string, fallback: T): T {
  if (!text) return fallback;
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(candidate.slice(first, last + 1)) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}
