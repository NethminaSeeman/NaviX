import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ceygoApi } from "@/services/ceygoApi";
import { useLocation } from "@/context/LocationContext";

const ChatContext = createContext(null);

const initialMessage = {
  id: "welcome",
  role: "assistant",
  text: "Ayubowan! I am NaviX. Ask me about routes, culture, weather, and must-visit places in Sri Lanka.",
  timestamp: new Date().toISOString(),
};

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([initialMessage]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { location } = useLocation();

  const sendMessage = useCallback(
    async (text, context) => {
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
        const result = await ceygoApi.chat({
          prompt: cleanedText,
          location,
          context,
        });
        const assistantMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: result.answer,
          timestamp: new Date().toISOString(),
          meta: {
            intent: result.intent,
            weather: result.weather,
            nearby: result.nearby,
          },
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        setError(err.message || "Could not reach NaviX assistant.");
      } finally {
        setLoading(false);
      }
    },
    [location]
  );

  const clearError = useCallback(() => setError(""), []);

  const value = useMemo(
    () => ({ messages, loading, error, sendMessage, clearError }),
    [messages, loading, error, sendMessage, clearError]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider.");
  return context;
};
