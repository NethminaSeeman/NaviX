import { apiFetch } from "./api";

export type AskResponse = {
  answer: string;
};

export function askNaviX(prompt: string, context?: string) {
  return apiFetch<AskResponse>("/api/ask", {
    method: "POST",
    body: JSON.stringify({ prompt, context }),
  });
}
