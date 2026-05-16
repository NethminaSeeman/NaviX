import { motion } from "framer-motion";
import { FiMic, FiMicOff } from "react-icons/fi";

const VoiceButton = ({
  listening,
  disabled = false,
  onStart,
  onStop,
  label = "Voice",
}) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.95 }}
    whileHover={{ y: -1 }}
    onClick={listening ? onStop : onStart}
    disabled={disabled}
    className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
      listening
        ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
        : "border border-cyan-500/40 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-[0_6px_16px_rgba(45,212,191,0.35)] hover:opacity-95"
    } disabled:cursor-not-allowed disabled:opacity-50`}
  >
    <motion.span
      animate={listening ? { scale: [1, 1.2, 1] } : { scale: 1 }}
      transition={{ duration: 1, repeat: listening ? Infinity : 0 }}
    >
      {listening ? <FiMicOff /> : <FiMic />}
    </motion.span>
    {listening ? "Stop" : label}
  </motion.button>
);

export default VoiceButton;
