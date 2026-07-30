import { useCallback, useEffect, useRef, useState } from "react";

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
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const utteranceRef = useRef(null);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (payload) => {
      const text = buildSpeechScript(payload);
      if (!supported || !text) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        utteranceRef.current = null;
        setSpeaking(false);
      };
      utterance.onerror = () => {
        utteranceRef.current = null;
        setSpeaking(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  useEffect(() => {
    if (!supported) return undefined;
    return () => {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    };
  }, [supported]);

  return { supported, speaking, speak, stop };
};
