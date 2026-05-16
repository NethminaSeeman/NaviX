import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import VoiceButton from "@/components/VoiceButton";
import heroTourismImage from "@/assets/destinations/tourism-collage.png";

const HeroSection = ({ listening, onVoiceStart, onVoiceStop }) => (
  <section className="tech-panel relative overflow-hidden p-6 md:p-10">
    <img
      src={heroTourismImage}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30 saturate-125 md:opacity-35 dark:opacity-25"
    />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/95 via-white/75 to-white/25 dark:from-zinc-950/95 dark:via-zinc-950/78 dark:to-zinc-950/35" />
    <motion.div
      className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl"
      animate={{ y: [0, 12, 0] }}
      transition={{ duration: 7, repeat: Infinity }}
    />
    <motion.div
      className="pointer-events-none absolute -bottom-20 left-8 h-48 w-48 rounded-full bg-teal-400/20 blur-3xl"
      animate={{ x: [0, 10, 0], y: [0, -8, 0] }}
      transition={{ duration: 8, repeat: Infinity }}
    />
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative z-10 max-w-3xl"
    >
      <p className="mono-label mb-2 text-[11px] text-cyan-600 dark:text-cyan-300">
        Intelligent Travel Companion For Sri Lanka
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
          className="tech-button"
        >
          Start With AI
        </Link>
        <Link
          to="/map"
          className="rounded-md border border-slate-300 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-700 backdrop-blur-md transition hover:-translate-y-0.5 active:scale-95 dark:border-cyan-500/30 dark:bg-slate-900/40 dark:text-cyan-200"
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
