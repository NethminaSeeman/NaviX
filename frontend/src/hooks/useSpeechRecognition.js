import { useEffect, useRef, useState } from "react";

export const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");

  useEffect(() => {
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
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      // Show interim text live; lock in final text when available
      if (final) {
        finalTranscriptRef.current = (finalTranscriptRef.current + " " + final).trim();
        setTranscript(finalTranscriptRef.current);
      } else {
        setTranscript((finalTranscriptRef.current + " " + interim).trim());
      }
    };

    recognition.onstart = () => {
      finalTranscriptRef.current = "";
      setListening(true);
    };

    recognition.onend = () => {
      // Commit whatever was captured
      setTranscript(finalTranscriptRef.current || "");
      setListening(false);
    };

    recognition.onerror = (event) => {
      const msg =
        event.error === "not-allowed"
          ? "Microphone permission denied."
          : event.error === "no-speech"
          ? "No speech detected. Try again."
          : "Could not process voice input.";
      setError(msg);
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = async () => {
    try {
      // Trigger mic permission prompt before starting recognition
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setError("");
      setTranscript("");
      finalTranscriptRef.current = "";
      recognitionRef.current?.start();
    } catch (_error) {
      setError("Microphone permission denied.");
    }
  };

  const stopListening = () => recognitionRef.current?.stop();

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
