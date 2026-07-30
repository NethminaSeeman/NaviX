/**
 * LLM abstraction. Prefers Google Gemini when GEMINI_API_KEY is set
 * (NaviX default after OpenAI quota exhaustion). Falls back to OpenAI
 * only if Gemini is missing. Uses raw `fetch` (no SDK).
 */

import { Env, HttpError } from "./types";

export interface CompleteOptions {
  temperature?: number;
  /** If true, instruct the model to return JSON only. */
  jsonMode?: boolean;
}

export type LlmProvider = "openai" | "gemini";

const GEMINI_MODELS = [
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

export async function complete(
  env: Env,
  systemPrompt: string,
  userPrompt: string,
  opts: CompleteOptions = {}
): Promise<{ text: string; provider: LlmProvider }> {
  let lastError: HttpError | null = null;

  if (env.GEMINI_API_KEY?.trim()) {
    try {
      const text = await callGemini(env.GEMINI_API_KEY.trim(), systemPrompt, userPrompt, opts);
      return { text, provider: "gemini" };
    } catch (err) {
      lastError = err instanceof HttpError ? err : new HttpError(502, String(err));
      // Only fall through to OpenAI if Gemini truly failed and OpenAI exists.
      if (!env.OPENAI_API_KEY?.trim()) throw lastError;
    }
  }

  if (env.OPENAI_API_KEY?.trim()) {
    try {
      const text = await callOpenAI(
        env.OPENAI_API_KEY.trim(),
        systemPrompt,
        userPrompt,
        opts
      );
      return { text, provider: "openai" };
    } catch (err) {
      lastError = err instanceof HttpError ? err : new HttpError(502, String(err));
      throw lastError;
    }
  }

  throw (
    lastError ||
    new HttpError(
      503,
      "No LLM configured on the Worker. Set GEMINI_API_KEY (recommended) or OPENAI_API_KEY in backend/.dev.vars."
    )
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
  const userText = `${userPrompt}${
    opts.jsonMode ? "\n\nRespond with valid JSON only." : ""
  }`;

  let lastDetail = "";
  for (const model of GEMINI_MODELS) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${model}:generateContent`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });

    if (!res.ok) {
      lastDetail = await res.text();
      // Try next model when this one is retired / not found / overloaded.
      if (
        res.status === 404 ||
        res.status === 503 ||
        res.status === 429 ||
        /not found|NOT_FOUND|is not found|no longer available|deprecated|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(
          lastDetail
        )
      ) {
        continue;
      }
      throw new HttpError(
        502,
        `Gemini error ${res.status} (${model}): ${truncate(lastDetail, 300)}`
      );
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      promptFeedback?: { blockReason?: string };
    };

    if (data.promptFeedback?.blockReason) {
      throw new HttpError(
        502,
        `Gemini blocked the prompt (${data.promptFeedback.blockReason}).`
      );
    }

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts
      ?.map((p) => p.text || "")
      .join("")
      .trim();

    if (!text) {
      const reason = candidate?.finishReason || "empty";
      // Some models return empty on transient issues — try next.
      if (/SAFETY|RECITATION|OTHER|MAX_TOKENS/i.test(reason)) {
        lastDetail = `finishReason=${reason}`;
        continue;
      }
      lastDetail = `empty candidate (${reason})`;
      continue;
    }
    return text;
  }

  throw new HttpError(
    502,
    `Gemini error: no supported model responded. ${truncate(lastDetail, 220)}`
  );
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
