import { BsRobot } from "react-icons/bs";
import { FiUser } from "react-icons/fi";

const MessageBubble = ({ message }) => {
  const isAssistant = message.role === "assistant";

  return (
    <div className={`flex gap-2 ${isAssistant ? "justify-start" : "justify-end"}`}>
      {isAssistant && (
        <span className="mt-1 rounded-full bg-gradient-to-br from-ceygo-primary to-ceygo-secondary p-2 text-white shadow-md">
          <BsRobot size={14} />
        </span>
      )}

      <article
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isAssistant
            ? "bg-white/75 text-slate-700 ring-1 ring-slate-200 backdrop-blur-xl dark:bg-slate-800/70 dark:text-slate-100 dark:ring-slate-700"
            : "bg-gradient-to-br from-ceygo-secondary to-blue-700 text-white"
        }`}
      >
        <p>{message.text}</p>
      </article>

      {!isAssistant && (
        <span className="mt-1 rounded-full bg-slate-900 p-2 text-white shadow-md dark:bg-slate-100 dark:text-slate-900">
          <FiUser size={14} />
        </span>
      )}
    </div>
  );
};

export default MessageBubble;
