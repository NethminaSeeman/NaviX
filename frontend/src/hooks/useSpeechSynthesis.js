import { useState } from "react";

const stringifyFacts = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(". ");
  return value ? `${value}` : "";
};

const buildSpeechScript = (payload) => {
  if (!payload) return "";
  if (typeof payload === "string") return payload;

  const keyFacts = stringifyFacts(payload?.tts_hints?.key_facts_short);
  const pronunciationGuide = stringifyFacts(payload?.tts_hints?.pronunciation_guide);
  const deepSummary = payload?.deep_history?.summary || payload?.history || "";
  const architecturalDetails = payload?.deep_history?.architectural_details || "";
  const name = payload?.name || "This destination";

  return [
    pronunciationGuide ? `Pronunciation guide: ${pronunciationGuide}.` : "",
    keyFacts || `${name}.`,
    deepSummary,
    architecturalDetails,
  ]
    .filter(Boolean)
    .join(" ");
};

export const useSpeechSynthesis = () => {
  const [speaking, setSpeaking] = useState(false);
  const supported = "speechSynthesis" in window;

  const speak = (payload) => {
    const text = buildSpeechScript(payload);
    if (!supported || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return { supported, speaking, speak, stop };
};
