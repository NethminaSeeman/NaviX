import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiAlertTriangle, FiSend, FiVolume2, FiVolumeX, FiX } from "react-icons/fi";
import MessageBubble from "@/components/MessageBubble";
import AIThinkingAnimation from "@/components/AIThinkingAnimation";
import VoiceButton from "@/components/VoiceButton";
import { useChat } from "@/context/ChatContext";
import { useVoiceTranscription } from "@/hooks/useVoiceTranscription";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { API_BASE_URL, SUGGESTED_PROMPTS } from "@/utils/constants";

const classifyError = (message = "") => {
  const lower = message.toLowerCase();
  if (lower.includes("cannot reach") || lower.includes("network")) {
    return {
      title: "Cannot reach NaviX backend",
      hint: `Backend is unreachable at ${API_BASE_URL}. For local FastAPI: cd backend && uvicorn main:app --reload. For deployed app, set VITE_API_BASE_URL in Pages environment variables.`,
    };
  }
  if (lower.includes("openai_api_key") || lower.includes("api key")) {
    return {
      title: "OpenAI key missing on the backend",
      hint: "Add OPENAI_API_KEY to backend/.env and restart the server.",
    };
  }
  if (lower.includes("quota") || lower.includes("429") || lower.includes("insufficient_quota")) {
    return {
      title: "OpenAI quota exceeded",
      hint: "Add billing credit at platform.openai.com, or set GEMINI_API_KEY on the Worker as a free fallback.",
    };
  }
  if (lower.includes("openai call failed") || lower.includes("rate")) {
    return {
      title: "OpenAI service rejected the request",
      hint: "Check the key validity, billing status, and rate limits in the OpenAI dashboard.",
    };
  }
  return {
    title: "NaviX could not answer that yet",
    hint: message,
  };
};

const ChatBox = () => {
  const { messages, loading, error, sendMessage, clearError } = useChat();
  const [searchParams] = useSearchParams();
  const [input, setInput] = useState("");
  const listRef = useRef(null);
  const speech = useVoiceTranscription();
  const tts = useSpeechSynthesis();
  const appliedPrompt = useRef(false);
  const wasBusyRef = useRef(false);
  const voiceAutoSendRef = useRef(false);

  useEffect(() => {
    const raw = searchParams.get("prompt");
    if (!raw || appliedPrompt.current) return;
    appliedPrompt.current = true;
    setInput((prev) => (prev ? prev : raw));
  }, [searchParams]);

  useEffect(() => {
    if (speech.transcript) setInput(speech.transcript);
  }, [speech.transcript]);

  useEffect(() => {
    const busy = speech.listening || speech.processing;
    const wasBusy = wasBusyRef.current;
    wasBusyRef.current = busy;
    // Wait until recording + Whisper finish, then auto-send once.
    if (!wasBusy || busy) return;

    const spoken = speech.transcript.trim();
    if (!spoken || loading || voiceAutoSendRef.current) return;

    voiceAutoSendRef.current = true;
    Promise.resolve(handleSend(spoken)).finally(() => {
      voiceAutoSendRef.current = false;
    });
  }, [speech.listening, speech.processing, speech.transcript, loading]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Stop TTS playback when the chat component unmounts (e.g. page navigation)
  useEffect(() => {
    return () => tts.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async (message = input) => {
    if (!message.trim()) return;
    await sendMessage(message);
    setInput("");
    speech.setTranscript("");
  };

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  return (
    <div className="tech-panel flex h-[74vh] flex-col overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between border-b border-slate-200/70 bg-white/60 px-4 py-3 text-sm font-medium text-slate-600 backdrop-blur-xl dark:border-cyan-500/20 dark:bg-slate-900/50 dark:text-slate-200"
      >
        <span>NaviX Assistant is online for Sri Lanka guidance.</span>
        <span className="mono-label text-[10px] text-cyan-600 dark:text-cyan-300">
          Session_Active
        </span>
      </motion.div>
      <div
        ref={listRef}
        className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-transparent to-slate-100/50 p-4 md:p-6 dark:to-slate-900/20"
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {loading && <AIThinkingAnimation />}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-3 flex items-start gap-3 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200"
        >
          <FiAlertTriangle className="mt-0.5 shrink-0 text-base text-red-500 dark:text-red-300" />
          <div className="flex-1 space-y-1">
            <p className="mono-label text-[10px] text-red-600 dark:text-red-300">
              CHAT_ERROR
            </p>
            <p className="text-sm font-semibold">
              {classifyError(error).title}
            </p>
            <p className="text-[11px] leading-relaxed opacity-90">
              {classifyError(error).hint}
            </p>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="rounded-md p-1 text-red-500 hover:bg-red-500/10 dark:text-red-300"
            aria-label="Dismiss error"
          >
            <FiX className="text-xs" />
          </button>
        </motion.div>
      )}

      <div className="border-t border-slate-200 bg-white/70 p-3 dark:border-cyan-500/20 dark:bg-slate-900/50">
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              className="mono-label rounded-md border border-slate-300 bg-white px-3 py-1 text-[10px] tracking-[0.06em] text-slate-600 hover:border-cyan-500/50 hover:text-cyan-700 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-cyan-500/50 dark:hover:text-cyan-200"
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask NaviX about destinations, culture, weather, or routes..."
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900"
          />
          <VoiceButton
            listening={speech.listening}
            processing={speech.processing}
            disabled={!speech.supported || speech.processing}
            onStart={speech.startListening}
            onStop={speech.stopListening}
          />
          <button
            type="button"
            onClick={() => handleSend()}
            className="rounded-md bg-gradient-to-r from-cyan-500 to-teal-500 p-3 text-slate-950 shadow-[0_6px_16px_rgba(45,212,191,0.35)] active:scale-95"
            aria-label="Send message"
          >
            <FiSend />
          </button>
          <button
            type="button"
            onClick={() => {
              if (tts.speaking) {
                tts.stop();
                return;
              }
              tts.speak(lastAssistantMessage?.text);
            }}
            className="rounded-md border border-slate-300 bg-white p-3 text-slate-700 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-cyan-200"
            aria-label={tts.speaking ? "Stop voice response" : "Play voice response"}
          >
            {tts.speaking ? <FiVolumeX /> : <FiVolume2 />}
          </button>
        </div>
        {!speech.supported && (
          <p className="mt-2 text-xs text-amber-500">
            Voice input is not supported in this browser.
          </p>
        )}
        {speech.error && <p className="mt-2 text-xs text-red-500">{speech.error}</p>}
      </div>
    </div>
  );
};

export default ChatBox;
