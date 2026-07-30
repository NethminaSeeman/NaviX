import { useCallback, useEffect, useRef, useState } from "react";

const stringifyFacts = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(". ");
  return value ? `${value}` : "";
};

const buildSpeechScript = (payload) => {
  if (!payload) return "";
  if (typeof payload === "string") return payload;

  const keyFacts = stringifyFacts(payload?.tts_hints?.key_facts_short);
  const pronunciationGuide = stringifyFacts(
    payload?.tts_hints?.pronunciation_guide
  );
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

/** Prefer natural English voices when the browser exposes them. */
const pickGuideVoice = (voices) => {
  if (!voices?.length) return null;
  const preferred = [
    /google uk english female/i,
    /google us english/i,
    /microsoft (aria|jenny|sonia|guy|sara).*online/i,
    /samantha/i,
    /karen/i,
    /moira/i,
    /english.*female/i,
    /en-GB/i,
    /en-US/i,
  ];
  for (const re of preferred) {
    const hit = voices.find((v) => re.test(`${v.name} ${v.lang}`));
    if (hit) return hit;
  }
  return voices.find((v) => /^en(-|_)/i.test(v.lang)) || voices[0];
};

/** Soft breeze cue before the guide speaks (Web Audio, no asset file). */
const playWhisperCue = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const duration = 0.45;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      const envelope = Math.sin(Math.PI * t) * (1 - t * 0.35);
      data[i] = (Math.random() * 2 - 1) * envelope * 0.08;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0.55;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    source.onended = () => {
      void ctx.close().catch(() => {});
    };
  } catch {
    /* ignore cue failures */
  }
};

export const useSpeechSynthesis = () => {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const utteranceRef = useRef(null);
  const keepAliveRef = useRef(null);

  useEffect(() => {
    if (!supported) return undefined;

    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      if (list?.length) setVoices(list);
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [supported]);

  const clearKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (!supported) return;
    clearKeepAlive();
    // Chrome often ignores a lone cancel() while speaking.
    try {
      window.speechSynthesis.pause();
    } catch {
      /* ignore */
    }
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
  }, [supported, clearKeepAlive]);

  const speak = useCallback(
    (payload, options = {}) => {
      const text = buildSpeechScript(payload);
      if (!supported || !text) return;

      stop();

      const soft = options.soft !== false;
      if (soft) playWhisperCue();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice =
        pickGuideVoice(voices.length ? voices : window.speechSynthesis.getVoices());
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || "en-GB";
      // Softer “guide whisper” delivery
      utterance.rate = soft ? 0.9 : 1;
      utterance.pitch = soft ? 0.95 : 1;
      utterance.volume = soft ? 0.78 : 1;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        clearKeepAlive();
        utteranceRef.current = null;
        setSpeaking(false);
      };
      utterance.onerror = () => {
        clearKeepAlive();
        utteranceRef.current = null;
        setSpeaking(false);
      };

      utteranceRef.current = utterance;
      // Chrome bug: long utterances can stall — nudge every few seconds.
      keepAliveRef.current = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearKeepAlive();
          return;
        }
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }, 10000);

      window.speechSynthesis.speak(utterance);
    },
    [supported, voices, stop, clearKeepAlive]
  );

  useEffect(() => {
    if (!supported) return undefined;
    return () => {
      clearKeepAlive();
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    };
  }, [supported, clearKeepAlive]);

  return { supported, speaking, speak, stop };
};
