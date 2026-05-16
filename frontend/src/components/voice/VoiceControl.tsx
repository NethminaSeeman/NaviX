"use client";

import { useState } from "react";

export function VoiceControl() {
  const [listening, setListening] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setListening((v) => !v)}
      className={`rounded-full px-6 py-3 font-medium text-white shadow-lg transition ${
        listening ? "bg-red-600" : "bg-navix-green hover:bg-navix-green/90"
      }`}
      aria-pressed={listening}
      aria-label={listening ? "Stop listening" : "Start voice input"}
    >
      {listening ? "Listening…" : "Ask NaviX"}
    </button>
  );
}
