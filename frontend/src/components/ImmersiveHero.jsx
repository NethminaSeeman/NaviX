import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { vibrateLight } from "@/utils/haptics";
import heroSigiriya from "@/assets/hero/hero-sigiriya.png";
import heroStiltFishermen from "@/assets/hero/hero-stilt-fishermen.png";
import heroEllaBridge from "@/assets/hero/hero-ella-bridge.png";
import heroElephants from "@/assets/hero/hero-elephants.png";
import heroWaterfall from "@/assets/hero/hero-waterfall.png";

const SLIDES = [
  {
    src: heroSigiriya,
    alt: "Aerial view of Sigiriya Lion Rock rising from lush Sri Lankan jungle at golden hour",
    caption: "Sigiriya & sky citadels",
    kenClass: "hero-kb-sigiriya",
    vignetteClass: "from-amber-900/85 via-slate-950/55",
  },
  {
    src: heroStiltFishermen,
    alt: "Silhouetted stilt fishermen against a vivid purple and pink Sri Lankan sunset",
    caption: "Coast traditions at twilight",
    kenClass: "hero-kb-coast",
    vignetteClass: "from-indigo-950/90 via-violet-950/50",
  },
  {
    src: heroEllaBridge,
    alt: "Train crossing the Nine Arches Bridge in Ella, misty emerald hills",
    caption: "Ella railways & emerald hills",
    kenClass: "hero-kb-train",
    vignetteClass: "from-emerald-950/88 via-slate-950/50",
  },
  {
    src: heroElephants,
    alt: "Wild Asian elephants crossing a shallow tropical river among palm forest",
    caption: "Wild heart of the island",
    kenClass: "hero-kb-river",
    vignetteClass: "from-cyan-950/82 via-teal-950/48",
  },
  {
    src: heroWaterfall,
    alt: "Majestic multi-tier waterfall in dense misty rainforest",
    caption: "Highland cascades",
    kenClass: "hero-kb-falls",
    vignetteClass: "from-slate-950/92 via-teal-950/55",
  },
];

const SLIDE_MS = 9500;

const ImmersiveHero = () => {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [para, setPara] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduceMotion) return undefined;
    const t = window.setInterval(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      SLIDE_MS
    );
    return () => window.clearInterval(t);
  }, [reduceMotion]);

  const active = reduceMotion ? 0 : index;
  const slide = SLIDES[active];

  const onHeroPointer = (event) => {
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    setPara({
      x: nx * -18,
      y: ny * -14,
    });
  };

  const onHeroLeave = () => setPara({ x: 0, y: 0 });

  const parallaxStyle = useMemo(
    () => ({
      transform: reduceMotion
        ? undefined
        : `translate3d(${para.x}px, ${para.y}px, 0) scale(1.04)`,
    }),
    [para.x, para.y, reduceMotion]
  );

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900 shadow-[0_24px_80px_-20px_rgba(8,145,178,0.35)] dark:border-cyan-500/25"
      onPointerMove={onHeroPointer}
      onPointerLeave={onHeroLeave}
    >
      <div className="relative min-h-[min(560px,80vh)] md:min-h-[480px]">
        <style>{`
          /* Slide-specific cinematic drift (Ken Burns–style) */
          @keyframes kbSigiriya {
            0% { transform: scale(1.08) translate(0%, 0%); }
            50% { transform: scale(1.13) translate(-1.8%, -0.8%); }
            100% { transform: scale(1.09) translate(1%, 0.4%); }
          }
          @keyframes kbCoast {
            0% { transform: scale(1.1) translate(0%, 2%); }
            50% { transform: scale(1.06) translate(1%, -1%); }
            100% { transform: scale(1.09) translate(-1.5%, 0.5%); }
          }
          @keyframes kbTrain {
            0% { transform: scale(1.07) translate(1%, 0%); }
            50% { transform: scale(1.12) translate(-2.2%, 0.8%); }
            100% { transform: scale(1.08) translate(-0.5%, -1.2%); }
          }
          @keyframes kbRiver {
            0% { transform: scale(1.08) translate(-0.5%, 1%); }
            50% { transform: scale(1.11) translate(1.5%, -1%); }
            100% { transform: scale(1.07) translate(0%, 0%); }
          }
          @keyframes kbFalls {
            0% { transform: scale(1.06) translate(0%, -1%); }
            50% { transform: scale(1.11) translate(0%, 1.5%); }
            100% { transform: scale(1.07) translate(0%, 0%); }
          }
          .hero-kb-sigiriya { animation: kbSigiriya 22s ease-in-out infinite alternate; }
          .hero-kb-coast { animation: kbCoast 20s ease-in-out infinite alternate; }
          .hero-kb-train { animation: kbTrain 21s ease-in-out infinite alternate; }
          .hero-kb-river { animation: kbRiver 23s ease-in-out infinite alternate; }
          .hero-kb-falls { animation: kbFalls 24s ease-in-out infinite alternate; }
          @keyframes heroShimmer {
            0% { opacity: 0.08; transform: translateX(-8%) skewX(-8deg); }
            40% { opacity: 0.14; transform: translateX(40%) skewX(-8deg); }
            100% { opacity: 0.08; transform: translateX(108%) skewX(-8deg); }
          }
          .hero-shimmer-bar {
            position: absolute;
            inset: -20% auto -20% 0;
            width: 42%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            animation: heroShimmer 7s ease-in-out infinite;
            pointer-events: none;
          }
          @keyframes heroGlowPulse {
            0%, 100% { opacity: 0.35; transform: scale(1); }
            50% { opacity: 0.55; transform: scale(1.06); }
          }
          .hero-glow-sheet {
            animation: heroGlowPulse 5.5s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .hero-kb-sigiriya, .hero-kb-coast, .hero-kb-train, .hero-kb-river, .hero-kb-falls,
            .hero-shimmer-bar, .hero-glow-sheet {
              animation: none !important;
            }
          }
        `}</style>

        <div className="absolute inset-0">
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={active}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 1.35, ease: [0.4, 0, 0.2, 1] } }}
              className="absolute inset-0 overflow-hidden"
            >
              <div
                className="absolute inset-0 will-change-transform"
                style={parallaxStyle}
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  className={`h-full w-full object-cover opacity-95 ${
                    reduceMotion ? "" : slide.kenClass
                  }`}
                />
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="pointer-events-none absolute inset-0">
            {!reduceMotion && <div className="hero-shimmer-bar" aria-hidden />}
            <motion.div
              key={`glow-${active}`}
              className={`hero-glow-sheet absolute inset-0 bg-gradient-to-br ${slide.vignetteClass} to-transparent`}
              aria-hidden
              initial={{ opacity: 0.75 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.8 }}
            />
            {/* Readability veil — keeps typography crisp on every slide */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/93 via-slate-950/60 to-slate-900/25 dark:from-slate-950/94 dark:via-slate-950/58" />
          </div>

          {!reduceMotion && (
            <>
              <motion.div
                className="pointer-events-none absolute -left-28 top-[18%] h-80 w-80 rounded-full bg-cyan-400/16 blur-[100px]"
                animate={{ opacity: [0.3, 0.52, 0.3], x: [0, 22, 0] }}
                transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="pointer-events-none absolute -bottom-24 right-[5%] h-72 w-72 rounded-full bg-fuchsia-400/14 blur-[90px]"
                animate={{ opacity: [0.25, 0.42, 0.25], y: [0, -15, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              />
            </>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-5 right-6 z-[1] hidden text-right md:block">
          <p className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
            {slide.caption}
          </p>
          {!reduceMotion && (
            <div className="mt-2 flex justify-end gap-1">
              {SLIDES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === active ? "w-6 bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.7)]" : "w-2 bg-white/35"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative z-10 flex min-h-[min(560px,80vh)] flex-col justify-center p-6 md:p-10 lg:max-w-3xl pointer-events-none">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mono-label mb-2 text-[11px] text-cyan-300/90 pointer-events-none"
          >
            Intelligent Travel Companion For Sri Lanka
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="mb-4 text-3xl font-extrabold leading-tight text-white drop-shadow-[0_6px_32px_rgba(0,0,0,0.55)] md:text-5xl pointer-events-none"
          >
            Travel Sri Lanka smarter with voice-first AI guidance.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mb-8 max-w-2xl text-sm text-slate-100/90 md:text-base drop-shadow-md pointer-events-none"
          >
            NaviX combines live maps, smart itineraries, weather-aware
            recommendations, and conversational AI to make every day of your trip
            effortless.
          </motion.p>

          <div className="pointer-events-auto flex flex-wrap items-center gap-3">
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
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImmersiveHero;
