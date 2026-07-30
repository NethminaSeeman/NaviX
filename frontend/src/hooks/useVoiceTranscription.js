import { useEffect, useRef, useState } from "react";

/**
 * Chat Voice dictation:
 * - Voice ON  → live-type into the input
 * - Voice OFF / Send → stop mic; text stays in the box (no auto-send)
 * User must press Send to chat, and Voice again for the next question.
 */
export const useVoiceTranscription = () => {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState("");

  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const streamRef = useRef(null);
  const maxTimerRef = useRef(null);
  const finalTextRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") {
      setSupported(false);
      return undefined;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const hasMic = !!navigator?.mediaDevices?.getUserMedia;
    setSupported(hasMic && !!SpeechRecognition);

    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalTextRef.current = `${finalTextRef.current} ${piece}`.trim();
        } else {
          interim += piece;
        }
      }
      setTranscript(`${finalTextRef.current} ${interim}`.trim());
    };

    recognition.onend = () => {
      // Chrome may end sessions early; only clear UI if we intentionally stopped.
      if (!listeningRef.current) {
        setListening(false);
        return;
      }
      // Restart while user still wants dictation.
      try {
        recognition.start();
      } catch {
        listeningRef.current = false;
        setListening(false);
      }
    };

    recognition.onerror = (event) => {
      if (event?.error === "aborted" || event?.error === "no-speech") return;
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setError("Microphone permission denied.");
        listeningRef.current = false;
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
    return () => {
      cancelListening();
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const releaseMic = () => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const cancelListening = () => {
    listeningRef.current = false;
    setListening(false);
    releaseMic();
    try {
      recognitionRef.current?.abort?.();
    } catch {
      /* ignore */
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
  };

  /** Stop mic but keep the typed transcript for Send. */
  const stopListening = () => {
    const kept = (finalTextRef.current || transcript).trim();
    if (kept) setTranscript(kept);
    cancelListening();
  };

  const startListening = async () => {
    if (!supported || listeningRef.current) return;
    setError("");
    setTranscript("");
    finalTextRef.current = "";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Permission probe — Web Speech uses its own capture; release this track.
      stream.getTracks().forEach((t) => t.stop());

      listeningRef.current = true;
      setListening(true);
      recognitionRef.current?.start();

      maxTimerRef.current = setTimeout(() => {
        stopListening();
      }, 60_000);
    } catch (err) {
      if (err?.name === "InvalidStateError") return;
      listeningRef.current = false;
      setListening(false);
      setError("Microphone permission denied.");
    }
  };

  return {
    transcript,
    setTranscript,
    listening,
    processing: false,
    supported,
    error,
    startListening,
    stopListening,
    cancelListening,
  };
};
