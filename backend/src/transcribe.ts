/**
 * Speech-to-text for the chat Voice button.
 * Prefer OpenAI Whisper; fall back to Gemini multimodal if Whisper fails
 * (e.g. OpenAI quota) or only Gemini is configured.
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
  let openaiError: HttpError | null = null;

  if (env.OPENAI_API_KEY) {
    try {
      const text = await whisperOpenAI(env.OPENAI_API_KEY, audio, type, filename);
      return { text, provider: "whisper" };
    } catch (err) {
      openaiError = err instanceof HttpError ? err : new HttpError(502, String(err));
      if (!env.GEMINI_API_KEY || !isQuotaOrTransient(openaiError)) {
        throw openaiError;
      }
    }
  }

  if (env.GEMINI_API_KEY) {
    const text = await geminiTranscribe(env.GEMINI_API_KEY, audio, type);
    return { text, provider: "gemini" };
  }

  if (openaiError) throw openaiError;
  throw new HttpError(
    503,
    "No speech-to-text configured. Set OPENAI_API_KEY (Whisper) or GEMINI_API_KEY."
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
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `gemini-1.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    const detail = await res.text();
    throw new HttpError(502, `Gemini STT error ${res.status}: ${truncate(detail, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new HttpError(502, "Gemini returned an empty transcript.");
  return text.replace(/^["']|["']$/g, "").trim();
}

function isQuotaOrTransient(err: HttpError): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("insufficient_quota") ||
    msg.includes("rate") ||
    msg.includes("503") ||
    msg.includes("500")
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
