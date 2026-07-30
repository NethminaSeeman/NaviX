import { useState } from "react";
import { motion } from "framer-motion";
import ChatBox from "@/components/ChatBox";
import VoiceTalkPanel from "@/components/VoiceTalkPanel";

const ChatAssistantPage = () => {
  const [mode, setMode] = useState("text");

  return (
    <section className="space-y-4">
      <div className="tech-panel px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="section-title">NaviX AI Chat Assistant</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Voice-enabled conversation for routes, attractions, local culture,
              cuisine, and weather-aware recommendations.
            </p>
          </div>
          <div className="inline-flex rounded-md border border-slate-300 p-1 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                mode === "text"
                  ? "bg-teal-500 text-slate-950"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Text chat
            </button>
            <button
              type="button"
              onClick={() => setMode("voice")}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                mode === "voice"
                  ? "bg-teal-500 text-slate-950"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Voice talk
            </button>
          </div>
        </div>
        <motion.p
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "100%", opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="mono-label mt-2 max-w-max overflow-hidden whitespace-nowrap border-r-2 border-cyan-500 pr-2 text-[11px] text-cyan-600 dark:text-cyan-300"
        >
          {mode === "voice"
            ? "Speak naturally... NaviX replies by voice."
            : "Ask naturally... NaviX understands trip intent."}
        </motion.p>
      </div>
      {mode === "voice" ? <VoiceTalkPanel /> : <ChatBox />}
    </section>
  );
};

export default ChatAssistantPage;
