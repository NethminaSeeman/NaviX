import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiSend, FiVolume2 } from "react-icons/fi";
import MessageBubble from "@/components/MessageBubble";
import AIThinkingAnimation from "@/components/AIThinkingAnimation";
import VoiceButton from "@/components/VoiceButton";
import { useChat } from "@/context/ChatContext";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { SUGGESTED_PROMPTS } from "@/utils/constants";

const ChatBox = () => {
  const { messages, loading, error, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const listRef = useRef(null);
  const speech = useSpeechRecognition();
  const tts = useSpeechSynthesis();

  useEffect(() => {
    if (speech.transcript) setInput(speech.transcript);
  }, [speech.transcript]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

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
    <div className="glass-card flex h-[72vh] flex-col overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-200/70 bg-white/60 px-4 py-3 text-sm font-medium text-slate-600 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200"
      >
        CeyGo Assistant is online for live Sri Lanka guidance.
      </motion.div>
      <div
        ref={listRef}
        className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6"
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {loading && <AIThinkingAnimation />}
      </div>

      {error && <p className="px-4 pb-2 text-xs text-red-500">{error}</p>}

      <div className="border-t border-slate-200 p-3 dark:border-slate-700">
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
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
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ceygo-primary dark:border-slate-700 dark:bg-slate-900"
          />
          <VoiceButton
            listening={speech.listening}
            onStart={speech.startListening}
            onStop={speech.stopListening}
          />
          <button
            type="button"
            onClick={() => handleSend()}
            className="rounded-xl bg-ceygo-secondary p-3 text-white"
            aria-label="Send message"
          >
            <FiSend />
          </button>
          <button
            type="button"
            onClick={() => tts.speak(lastAssistantMessage?.text)}
            className="rounded-xl bg-ceygo-accent p-3 text-slate-900"
            aria-label="Play voice response"
          >
            <FiVolume2 />
          </button>
        </div>
        {speech.error && <p className="mt-2 text-xs text-red-500">{speech.error}</p>}
      </div>
    </div>
  );
};

export default ChatBox;
