import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/services/apiClient";

/**
 * Chat Voice dictation:
 * - Real-time browser speech recognition (Web Speech API) for live typing
 * - Automatic MediaRecorder audio capture fallback to backend /transcribe (Gemini STT)
 *   whenever Web Speech is blocked by network/browser or yields no transcript.
 * - Voice ON  → live-type into the input
 * - Voice OFF / Send → stop mic; text stays in the box (no auto-send)
 * User must press Send to chat, and Voice again for the next question.
 */
export const useVoiceTranscription = () => {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState("");

  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const maxTimerRef = useRef(null);
  const finalTextRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") {
      setSupported(false);
      return undefined;
    }

    const hasMedia = !!navigator?.mediaDevices?.getUserMedia;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(hasMedia);

    if (SpeechRecognition) {
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
        const full = `${finalTextRef.current} ${interim}`.trim();
        if (full) {
          setTranscript(full);
        }
      };

      recognition.onend = () => {
        if (!listeningRef.current) return;
        try {
          recognition.start();
        } catch {
          // Keep listening true so MediaRecorder can still capture audio
        }
      };

      recognition.onerror = (event) => {
        console.warn("SpeechRecognition event:", event?.error);
        if (event?.error === "aborted" || event?.error === "no-speech") return;
        if (
          event?.error === "not-allowed" ||
          event?.error === "service-not-allowed"
        ) {
          setError("Microphone permission denied.");
          cancelListening();
        }
        // If network or other error occurs, Web Speech is unavailable,
        // but MediaRecorder will still capture audio for the backend fallback.
      };

      recognitionRef.current = recognition;
    }

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
    mediaRecorderRef.current = null;
  };

  const cancelListening = () => {
    listeningRef.current = false;
    setListening(false);
    setProcessing(false);
    audioChunksRef.current = [];

    try {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    } catch {
      /* ignore */
    }

    try {
      recognitionRef.current?.abort?.();
    } catch {
      /* ignore */
    }
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }

    releaseMic();
  };

  /** Stop mic and resolve final transcript (using backend fallback if Web Speech produced nothing). */
  const stopListening = async () => {
    if (!listeningRef.current) return;
    listeningRef.current = false;
    setListening(false);

    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }

    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }

    const currentText = (finalTextRef.current || transcript).trim();
    if (currentText) {
      setTranscript(currentText);
      releaseMic();
      return;
    }

    // Web Speech produced nothing; try backend fallback with recorded audio chunks.
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      setProcessing(true);
      await new Promise((resolve) => {
        recorder.onstop = resolve;
        try {
          recorder.stop();
        } catch {
          resolve();
        }
      });

      const chunks = audioChunksRef.current;
      if (chunks.length > 0) {
        try {
          const mimeType = recorder.mimeType || "audio/webm";
          const blob = new Blob(chunks, { type: mimeType });
          if (blob.size > 2000) {
            const formData = new FormData();
            formData.append("audio", blob, "voice.webm");
            const res = await apiClient.post("/transcribe", formData);
            const serverText = res?.data?.text?.trim();
            if (serverText) {
              setTranscript(serverText);
            }
          }
        } catch (postErr) {
          console.warn("Backend transcribe fallback failed:", postErr);
        }
      }
      setProcessing(false);
    }

    releaseMic();
  };

  const startListening = async () => {
    if (!supported || listeningRef.current) return;
    setError("");
    setTranscript("");
    finalTextRef.current = "";
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Start MediaRecorder for backup audio capture
      try {
        const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "";
        const recorder = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
      } catch (recErr) {
        console.warn("MediaRecorder start failed:", recErr);
      }

      listeningRef.current = true;
      setListening(true);

      try {
        recognitionRef.current?.start?.();
      } catch (recogErr) {
        console.warn("SpeechRecognition start failed:", recogErr);
      }

      maxTimerRef.current = setTimeout(() => {
        void stopListening();
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
    processing,
    supported,
    error,
    startListening,
    stopListening,
    cancelListening,
  };
};
