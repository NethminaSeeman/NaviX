import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import VoiceRecorderButton from "@/components/VoiceRecorderButton";

const HeroSection = ({ listening, onVoiceStart, onVoiceStop }) => (
  <section className="relative overflow-hidden rounded-3xl bg-ceygo-gradient p-6 shadow-glow md:p-10">
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
        Discover Sri Lanka with voice-first AI guidance.
      </h1>
      <p className="mb-6 text-sm text-slate-700 dark:text-slate-200 md:text-base">
        NaviX combines live maps, smart itineraries, weather-aware
        recommendations, and conversational AI to make every day of your trip
        effortless.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/chat"
          className="rounded-full bg-ceygo-primary px-5 py-2 text-sm font-semibold text-white hover:bg-teal-600"
        >
          Start With AI
        </Link>
        <Link
          to="/map"
          className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-100"
        >
          Explore Live Map
        </Link>
        <VoiceRecorderButton
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
