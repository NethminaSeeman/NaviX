import { useEffect, useRef, useState } from "react";

export const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setSupported(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;      // Stop automatically when user pauses
    recognition.interimResults = true;   // Show words as they come in
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript;
      }
      setTranscript((prev) => `${prev} ${text}`.trim());
    };

    recognition.onstart = () => {
      listeningRef.current = true;
      setListening(true);
    };
    recognition.onend = () => {
      listeningRef.current = false;
      setListening(false);
    };
    recognition.onerror = (event) => {
      listeningRef.current = false;
      setListening(false);

      // "aborted" is expected when user manually stops recording.
      if (event?.error === "aborted") return;

      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setError("Microphone permission denied.");
        return;
      }
      if (event?.error === "no-speech") {
        setError("No speech detected. Please try again.");
        return;
      }
      setError("Could not process voice input.");
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const startListening = async () => {
    if (!recognitionRef.current || listeningRef.current) return;
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setSupported(false);
        setError("Voice input is not supported in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setError("");
      setTranscript("");
      finalTranscriptRef.current = "";
      recognitionRef.current?.start();
    } catch (err) {
      if (err?.name === "InvalidStateError") return;
      setError("Microphone permission denied.");
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current || !listeningRef.current) return;
    recognitionRef.current.stop();
  };

  return {
    transcript,
    setTranscript,
    listening,
    supported,
    error,
    startListening,
    stopListening,
  };
};
