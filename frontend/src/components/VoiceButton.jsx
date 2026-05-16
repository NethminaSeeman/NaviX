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
    whileTap={{ scale: 0.96 }}
    whileHover={{ y: -1 }}
    onClick={listening ? onStop : onStart}
    disabled={disabled}
    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
      listening
        ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
        : "bg-gradient-to-r from-ceygo-primary to-ceygo-secondary text-white shadow-md hover:opacity-95"
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
