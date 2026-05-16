import { createContext, useContext, useMemo, useState } from "react";
import { ceygoApi } from "@/services/ceygoApi";

const ChatContext = createContext(null);

const initialMessage = {
  id: "welcome",
  role: "assistant",
  text: "Ayubowan! I am CeyGo. Ask me about routes, culture, weather, and must-visit places in Sri Lanka.",
  timestamp: new Date().toISOString(),
};

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([initialMessage]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = async (text, context) => {
    const cleanedText = `${text || ""}`.trim();
    if (!cleanedText) return;

    const userMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: cleanedText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError("");

    try {
      const result = await ceygoApi.chat({ prompt: cleanedText, context });
      const assistantMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: result.answer,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({ messages, loading, error, sendMessage }),
    [messages, loading, error]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider.");
  return context;
};
