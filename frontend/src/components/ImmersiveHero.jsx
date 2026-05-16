import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import VoiceButton from "@/components/VoiceButton";
import { vibrateLight } from "@/utils/haptics";
import heroTea from "@/assets/destinations/nuwara-eliya.jpg";
import heroTrain from "@/assets/destinations/ella.jpg";
import heroCoast from "@/assets/destinations/galle.jpg";

const SLIDES = [
  {
    src: heroTea,
    alt: "Mist-covered tea estates in Sri Lanka's highlands",
    caption: "Highlands & tea country",
  },
  {
    src: heroTrain,
    alt: "Scenic railway through Ella hill country",
    caption: "Iconic hill-country journeys",
  },
  {
    src: heroCoast,
    alt: "Historic Galle Fort by the sea",
    caption: "Coast & living fort cities",
  },
];

const SLIDE_MS = 9000;

const ImmersiveHero = ({ listening, onVoiceStart, onVoiceStop }) => {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const t = window.setInterval(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      SLIDE_MS
    );
    return () => window.clearInterval(t);
  }, [reduceMotion]);

  const active = reduceMotion ? 0 : index;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900 shadow-[0_24px_80px_-20px_rgba(8,145,178,0.35)] dark:border-cyan-500/25">
      <div className="relative min-h-[min(520px,78vh)] md:min-h-[460px]">
        <style>{`
          @keyframes heroKenBurns {
            0% { transform: scale(1.06) translate(0%, 0%); }
            50% { transform: scale(1.1) translate(-1.2%, 0.3%); }
            100% { transform: scale(1.07) translate(0.4%, -0.2%); }
          }
          .hero-kenburns { animation: heroKenBurns 14s ease-in-out infinite alternate; }
          @media (prefers-reduced-motion: reduce) {
            .hero-kenburns { animation: none; }
          }
        `}</style>
        <div className="absolute inset-0">
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={active}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 1.15, ease: "easeInOut" } }}
              className="absolute inset-0 overflow-hidden"
            >
              <img
                src={SLIDES[active].src}
                alt={SLIDES[active].alt}
                className={`h-full w-full object-cover ${reduceMotion ? "" : "hero-kenburns"}`}
              />
            </motion.div>
          </AnimatePresence>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/65 to-slate-900/35" />
          {!reduceMotion && (
            <>
              <motion.div
                className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-cyan-400/18 blur-3xl"
                animate={{ opacity: [0.35, 0.55, 0.35] }}
                transition={{ duration: 6, repeat: Infinity }}
              />
              <motion.div
                className="pointer-events-none absolute -bottom-16 right-0 h-64 w-64 rounded-full bg-amber-400/12 blur-3xl"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 10, repeat: Infinity }}
              />
            </>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-5 right-6 z-[1] hidden text-right md:block">
          <p className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
            {SLIDES[active].caption}
          </p>
          {!reduceMotion && (
            <div className="mt-2 flex justify-end gap-1">
              {SLIDES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === active ? "w-6 bg-cyan-400" : "w-2 bg-white/35"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative z-10 flex min-h-[min(520px,78vh)] flex-col justify-center p-6 md:p-10 lg:max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mono-label mb-2 text-[11px] text-cyan-300/90"
          >
            Intelligent Travel Companion For Sri Lanka
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="mb-4 text-3xl font-extrabold leading-tight text-white drop-shadow-md md:text-5xl"
          >
            Travel Sri Lanka smarter with voice-first AI guidance.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mb-8 max-w-2xl text-sm text-slate-100/90 md:text-base"
          >
            NaviX combines live maps, smart itineraries, weather-aware
            recommendations, and conversational AI to make every day of your trip
            effortless.
          </motion.p>

          <div className="flex flex-wrap items-center gap-3">
            <motion.span className="relative inline-flex" whileTap={{ scale: 0.97 }}>
              <motion.span
                className="absolute -inset-1 rounded-lg bg-gradient-to-r from-cyan-400/45 to-teal-400/35 blur-md"
                animate={
                  reduceMotion
                    ? {}
                    : { opacity: [0.45, 0.95, 0.45], scale: [1, 1.06, 1] }
                }
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden
              />
              <Link
                to="/chat"
                onClick={() => vibrateLight()}
                className="tech-button relative z-[1] shadow-[0_12px_40px_rgba(34,211,238,0.35)] ring-2 ring-cyan-400/35"
              >
                Start With AI
              </Link>
            </motion.span>

            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/map"
                onClick={() => vibrateLight(8)}
                className="inline-block rounded-md border border-white/30 bg-white/15 px-5 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-white/25"
              >
                Explore Live Map
              </Link>
            </motion.div>

            <VoiceButton
              listening={listening}
              onStart={() => {
                vibrateLight(8);
                onVoiceStart?.();
              }}
              onStop={onVoiceStop}
              label="Voice Search"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImmersiveHero;
