import { motion } from "framer-motion";
import ChatBox from "@/components/ChatBox";

const ChatAssistantPage = () => (
  <section className="space-y-4">
    <div className="tech-panel px-4 py-4 md:px-5">
      <h1 className="section-title">NaviX AI Chat Assistant</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Voice-enabled conversation for routes, attractions, local culture,
        cuisine, and weather-aware recommendations.
      </p>
      <motion.p
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "100%", opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="mono-label mt-2 max-w-max overflow-hidden whitespace-nowrap border-r-2 border-cyan-500 pr-2 text-[11px] text-cyan-600 dark:text-cyan-300"
      >
        Ask naturally... NaviX understands trip intent.
      </motion.p>
    </div>
    <ChatBox />
  </section>
);

export default ChatAssistantPage;
