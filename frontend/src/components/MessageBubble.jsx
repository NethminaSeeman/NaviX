import { BsRobot } from "react-icons/bs";
import { FiUser } from "react-icons/fi";

const MessageBubble = ({ message }) => {
  const isAssistant = message.role === "assistant";

  return (
    <div className={`flex gap-2 ${isAssistant ? "justify-start" : "justify-end"}`}>
      {isAssistant && (
        <span className="mt-1 rounded-md bg-gradient-to-br from-cyan-400 to-teal-500 p-2 text-slate-900 shadow-md">
          <BsRobot size={14} />
        </span>
      )}

      <article
        className={`max-w-[85%] rounded-md border px-4 py-3 text-sm shadow-sm ${
          isAssistant
            ? "border-slate-300 bg-white/75 text-slate-700 backdrop-blur-xl dark:border-cyan-500/20 dark:bg-slate-800/70 dark:text-slate-100"
            : "border-cyan-400/30 bg-gradient-to-br from-cyan-500 to-teal-500 text-slate-950"
        }`}
      >
        <p>{message.text}</p>
      </article>

      {!isAssistant && (
        <span className="mt-1 rounded-md bg-slate-900 p-2 text-white shadow-md dark:bg-slate-100 dark:text-slate-900">
          <FiUser size={14} />
        </span>
      )}
    </div>
  );
};

export default MessageBubble;
