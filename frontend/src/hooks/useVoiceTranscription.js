import { useEffect, useRef, useState } from "react";
import { ceygoApi } from "@/services/ceygoApi";

const MAX_MS = 60_000;
const PREFERRED_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

const pickMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  return PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || "";
};

/**
 * Chat Voice input:
 * 1) Browser Web Speech types live into the box (works with no API quota).
 * 2) Optionally upgrades the final text via Whisper/Gemini when the backend works.
 */
export const useVoiceTranscription = () => {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const maxTimerRef = useRef(null);
  const listeningRef = useRef(false);
  const processingRef = useRef(false);
  const browserTextRef = useRef("");
  const stopRequestedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setSupported(false);
      return undefined;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const hasMic = !!navigator?.mediaDevices?.getUserMedia;
    const hasSpeech = !!SpeechRecognition;
    const hasRecorder = typeof MediaRecorder !== "undefined";
    setSupported(hasMic && (hasSpeech || hasRecorder));

    if (hasSpeech) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let finals = "";
        let interim = "";
        for (let i = 0; i < event.results.length; i += 1) {
          const piece = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) finals += piece;
          else interim += piece;
        }
        const text = `${finals} ${interim}`.trim();
        browserTextRef.current = text;
        setTranscript(text);
      };

      recognition.onerror = (event) => {
        if (event?.error === "aborted" || event?.error === "no-speech") return;
        if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
          setError("Microphone permission denied.");
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      cleanupAll();
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupAll = () => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    chunksRef.current = [];
  };

  const finishWithOptionalWhisper = async (blob) => {
    processingRef.current = true;
    setProcessing(true);
    setListening(false);
    listeningRef.current = false;

    const browserText = browserTextRef.current.trim();

    // Always keep browser text so the input is never empty after a good utterance.
    if (browserText) {
      setTranscript(browserText);
      setError("");
    }

    try {
      if (blob && blob.size >= 256) {
        const { text } = await ceygoApi.transcribe(blob);
        const cleaned = (text || "").trim();
        if (cleaned) {
          setTranscript(cleaned);
          setError("");
          return;
        }
      }
      if (!browserText) {
        setError("No speech captured. Click Voice and speak clearly, then Stop.");
      }
    } catch {
      // OpenAI quota / network — browser transcript is already set; stay silent.
      if (!browserText) {
        setError(
          "Could not transcribe (API quota). Use Chrome and allow the mic, then try again."
        );
      }
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  };

  const startListening = async () => {
    if (!supported || listeningRef.current || processingRef.current) return;
    setError("");
    setTranscript("");
    browserTextRef.current = "";
    stopRequestedRef.current = false;
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Live typing via Web Speech (no OpenAI needed).
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          if (err?.name !== "InvalidStateError") {
            /* continue with recorder-only */
          }
        }
      }

      // Optional Whisper upgrade on stop.
      if (typeof MediaRecorder !== "undefined") {
        const mimeType = pickMimeType();
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const type = recorder.mimeType || mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type });
          chunksRef.current = [];
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
          void finishWithOptionalWhisper(blob);
        };

        recorder.start(250);
      }

      listeningRef.current = true;
      setListening(true);

      maxTimerRef.current = setTimeout(() => {
        stopListening();
      }, MAX_MS);
    } catch {
      cleanupAll();
      listeningRef.current = false;
      setListening(false);
      setError("Microphone permission denied.");
    }
  };

  const stopListening = () => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    stopRequestedRef.current = true;

    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
        return;
      } catch {
        /* fall through */
      }
    }

    // No recorder — finalize with browser text only.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    void finishWithOptionalWhisper(null);
  };

  return {
    transcript,
    setTranscript,
    listening,
    processing,
    supported,
    error,
    startListening,
    stopListening,
  };
};
