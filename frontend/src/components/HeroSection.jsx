import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import VoiceButton from "@/components/VoiceButton";

const HeroSection = ({ listening, onVoiceStart, onVoiceStop }) => (
  <section className="relative overflow-hidden rounded-3xl bg-ceygo-gradient p-6 shadow-glow ring-1 ring-white/30 md:p-10">
    <motion.div
      className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-ceygo-primary/30 blur-3xl"
      animate={{ y: [0, 12, 0] }}
      transition={{ duration: 7, repeat: Infinity }}
    />
    <motion.div
      className="pointer-events-none absolute -bottom-20 left-8 h-48 w-48 rounded-full bg-ceygo-accent/30 blur-3xl"
      animate={{ x: [0, 10, 0], y: [0, -8, 0] }}
      transition={{ duration: 8, repeat: Infinity }}
    />
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative z-10 max-w-3xl"
    >
      <p className="mb-2 text-sm font-medium text-ceygo-secondary">
        Intelligent travel companion for Sri Lanka
      </p>
      <h1 className="mb-4 text-3xl font-extrabold leading-tight text-slate-900 dark:text-slate-50 md:text-5xl">
        Travel Sri Lanka smarter with voice-first AI guidance.
      </h1>
      <p className="mb-6 text-sm text-slate-700 dark:text-slate-200 md:text-base">
        NaviX combines live maps, smart itineraries, weather-aware
        recommendations, and conversational AI to make every day of your trip
        effortless.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/chat"
          className="rounded-full bg-ceygo-primary px-5 py-2 text-sm font-semibold text-white shadow-md shadow-ceygo-primary/30 transition hover:-translate-y-0.5 hover:bg-teal-600"
        >
          Start With AI
        </Link>
        <Link
          to="/map"
          className="rounded-full border border-slate-300 bg-white/70 px-5 py-2 text-sm font-semibold text-slate-700 backdrop-blur-md transition hover:-translate-y-0.5 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-100"
        >
          Explore Live Map
        </Link>
        <VoiceButton
          listening={listening}
          onStart={onVoiceStart}
          onStop={onVoiceStop}
          label="Voice Search"
        />
      </div>
    </motion.div>
  </section>
);

export default HeroSection;
