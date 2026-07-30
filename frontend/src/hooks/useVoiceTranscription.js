import { useEffect, useRef, useState } from "react";
import { ceygoApi } from "@/services/ceygoApi";
import { normalizeError } from "@/utils/errorHandling";

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
 * Record mic audio and transcribe via backend Whisper (Gemini fallback).
 * Keeps the same surface as useSpeechRecognition for ChatBox auto-send.
 */
export const useVoiceTranscription = () => {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const maxTimerRef = useRef(null);
  const listeningRef = useRef(false);
  const processingRef = useRef(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      !!navigator?.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined";
    setSupported(ok);
    return () => {
      cleanupRecorder();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupRecorder = () => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
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

  const finishRecording = async (blob) => {
    processingRef.current = true;
    setProcessing(true);
    setListening(false);
    listeningRef.current = false;

    try {
      if (!blob || blob.size < 256) {
        setError("No speech captured. Hold Voice a bit longer and try again.");
        return;
      }
      const { text } = await ceygoApi.transcribe(blob);
      const cleaned = (text || "").trim();
      if (!cleaned) {
        setError("Could not understand that. Please try again.");
        return;
      }
      setTranscript(cleaned);
      setError("");
    } catch (err) {
      setError(normalizeError(err) || "Transcription failed.");
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  };

  const startListening = async () => {
    if (!supported || listeningRef.current || processingRef.current) return;
    setError("");
    setTranscript("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

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
        void finishRecording(blob);
      };

      recorder.start(250);
      listeningRef.current = true;
      setListening(true);

      maxTimerRef.current = setTimeout(() => {
        stopListening();
      }, MAX_MS);
    } catch {
      cleanupRecorder();
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
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      if (listeningRef.current) {
        listeningRef.current = false;
        setListening(false);
      }
      return;
    }
    try {
      recorder.stop();
    } catch {
      listeningRef.current = false;
      setListening(false);
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
  };
};
