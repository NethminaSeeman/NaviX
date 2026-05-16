import ChatBox from "@/components/ChatBox";

const ChatAssistantPage = () => (
  <section className="space-y-4">
    <div>
      <h1 className="section-title">NaviX AI Chat Assistant</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Voice-enabled conversation for routes, attractions, local culture,
        cuisine, and weather-aware recommendations.
      </p>
    </div>
    <ChatBox />
  </section>
);

export default ChatAssistantPage;
