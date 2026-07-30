import { motion } from "framer-motion";
import { FiLoader, FiMic, FiMicOff } from "react-icons/fi";

const VoiceButton = ({
  listening,
  processing = false,
  disabled = false,
  onStart,
  onStop,
  label = "Voice",
}) => {
  const busy = listening || processing;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -1 }}
      onClick={listening ? onStop : onStart}
      disabled={disabled || processing}
      className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
        listening
          ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
          : processing
            ? "border border-amber-400/50 bg-amber-500/15 text-amber-800 dark:text-amber-200"
            : "border border-cyan-500/40 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-[0_6px_16px_rgba(45,212,191,0.35)] hover:opacity-95"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <motion.span
        animate={busy ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={{ duration: 1, repeat: busy ? Infinity : 0 }}
      >
        {processing ? <FiLoader className="animate-spin" /> : listening ? <FiMicOff /> : <FiMic />}
      </motion.span>
      {processing ? "Transcribing…" : listening ? "Stop" : label}
    </motion.button>
  );
};

export default VoiceButton;
