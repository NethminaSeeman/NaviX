import type { Env } from "./index";

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
