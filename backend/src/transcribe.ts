/**
 * Speech-to-text for the chat Voice button.
 * Prefers Gemini multimodal when configured; Whisper only if OPENAI_API_KEY is set.
 */

import { Env, HttpError } from "./types";

const MAX_BYTES = 25 * 1024 * 1024; // Whisper hard limit

export async function transcribeAudio(
  env: Env,
  audio: ArrayBuffer,
  mimeType: string,
  filename: string
): Promise<{ text: string; provider: "whisper" | "gemini" }> {
  if (!audio.byteLength) {
    throw new HttpError(400, "Empty audio upload.");
  }
  if (audio.byteLength > MAX_BYTES) {
    throw new HttpError(413, "Audio is too large. Keep recordings under ~60 seconds.");
  }

  const type = mimeType || "application/octet-stream";
  let lastError: HttpError | null = null;

  if (env.GEMINI_API_KEY?.trim()) {
    try {
      const text = await geminiTranscribe(env.GEMINI_API_KEY.trim(), audio, type);
      return { text, provider: "gemini" };
    } catch (err) {
      lastError = err instanceof HttpError ? err : new HttpError(502, String(err));
      if (!env.OPENAI_API_KEY?.trim()) throw lastError;
    }
  }

  if (env.OPENAI_API_KEY?.trim()) {
    try {
      const text = await whisperOpenAI(
        env.OPENAI_API_KEY.trim(),
        audio,
        type,
        filename
      );
      return { text, provider: "whisper" };
    } catch (err) {
      lastError = err instanceof HttpError ? err : new HttpError(502, String(err));
      throw lastError;
    }
  }

  if (lastError) throw lastError;
  throw new HttpError(
    503,
    "No speech-to-text configured. Set GEMINI_API_KEY (recommended) or OPENAI_API_KEY."
  );
}

async function whisperOpenAI(
  apiKey: string,
  audio: ArrayBuffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const form = new FormData();
  form.append("file", new File([audio], safeName(filename, mimeType), { type: mimeType }));
  form.append("model", "whisper-1");
  form.append("response_format", "json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new HttpError(502, `Whisper error ${res.status}: ${truncate(detail, 300)}`);
  }

  const data = (await res.json()) as { text?: string };
  const text = data.text?.trim();
  if (!text) throw new HttpError(502, "Whisper returned an empty transcript.");
  return text;
}

async function geminiTranscribe(
  apiKey: string,
  audio: ArrayBuffer,
  mimeType: string
): Promise<string> {
  const models = [
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
  ];
  let lastDetail = "";

  for (const model of models) {
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
        contents: [
          {
            role: "user",
            parts: [
              {
                inline_data: {
                  mime_type: mimeType.startsWith("audio/")
                    ? mimeType
                    : "audio/webm",
                  data: bufferToBase64(audio),
                },
              },
              {
                text:
                  "Transcribe this speech exactly in the original language " +
                  "(English, Sinhala, or Tamil). Return only the transcript text, " +
                  "with no quotes, labels, or commentary.",
              },
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
    });

    if (!res.ok) {
      lastDetail = await res.text();
      if (
        res.status === 404 ||
        /not found|NOT_FOUND|no longer available|deprecated/i.test(lastDetail)
      ) {
        continue;
      }
      throw new HttpError(
        502,
        `Gemini STT error ${res.status} (${model}): ${truncate(lastDetail, 300)}`
      );
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("")
      .trim();
    if (!text) {
      lastDetail = "empty transcript";
      continue;
    }
    return text.replace(/^["']|["']$/g, "").trim();
  }

  throw new HttpError(
    502,
    `Gemini STT error: no supported model responded. ${truncate(lastDetail, 200)}`
  );
}

function safeName(filename: string, mimeType: string): string {
  const base = (filename || "speech").replace(/[^\w.-]+/g, "_").slice(0, 80);
  if (base.includes(".")) return base;
  if (mimeType.includes("webm")) return `${base}.webm`;
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return `${base}.m4a`;
  if (mimeType.includes("ogg")) return `${base}.ogg`;
  if (mimeType.includes("wav")) return `${base}.wav`;
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return `${base}.mp3`;
  return `${base}.webm`;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}...` : s;
}
