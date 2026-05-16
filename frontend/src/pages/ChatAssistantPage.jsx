import { motion } from "framer-motion";
import ChatBox from "@/components/ChatBox";

const ChatAssistantPage = () => (
  <section className="space-y-4">
    <div>
      <h1 className="section-title">CeyGo AI Chat Assistant</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Voice-enabled conversation for routes, attractions, local culture,
        cuisine, and weather-aware recommendations.
      </p>
      <motion.p
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "100%", opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="mt-2 max-w-max overflow-hidden whitespace-nowrap border-r-2 border-ceygo-primary pr-2 text-xs text-ceygo-secondary"
      >
        Ask naturally... CeyGo understands trip intent.
      </motion.p>
    </div>
    <ChatBox />
  </section>
);

export default ChatAssistantPage;
