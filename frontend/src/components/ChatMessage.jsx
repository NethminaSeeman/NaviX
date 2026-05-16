import { FiUser } from "react-icons/fi";
import { BsRobot } from "react-icons/bs";

const ChatMessage = ({ message }) => {
  const isAssistant = message.role === "assistant";
  return (
    <div
      className={`flex gap-2 ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      {isAssistant && (
        <span className="mt-1 rounded-full bg-ceygo-primary p-2 text-white">
          <BsRobot size={14} />
        </span>
      )}
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2 text-sm ${
          isAssistant
            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100"
            : "bg-ceygo-secondary text-white"
        }`}
      >
        {message.text}
      </div>
      {!isAssistant && (
        <span className="mt-1 rounded-full bg-slate-900 p-2 text-white dark:bg-slate-200 dark:text-slate-900">
          <FiUser size={14} />
        </span>
      )}
    </div>
  );
};

export default ChatMessage;
