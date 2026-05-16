import { useState } from "react";

export const useSpeechSynthesis = () => {
  const [speaking, setSpeaking] = useState(false);
  const supported = "speechSynthesis" in window;

  const speak = (text) => {
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
