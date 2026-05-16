import { motion } from "framer-motion";

const AIThinkingAnimation = () => (
  <div className="flex items-center gap-1 px-2 py-1">
    {[0, 1, 2].map((dot) => (
      <motion.span
        key={dot}
        className="h-2 w-2 rounded-full bg-ceygo-primary"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.18 }}
      />
    ))}
  </div>
);

export default AIThinkingAnimation;
