import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiCloud, FiMapPin, FiMessageCircle, FiThermometer, FiX } from "react-icons/fi";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ceygoApi } from "@/services/ceygoApi";
import { lngLatToMapPercent } from "@/utils/mapProjection";
import { vibrateLight } from "@/utils/haptics";

const buildChatPrompt = (destination) =>
  `I'm visiting ${destination.name} in ${destination.district || "Sri Lanka"}. What are the best itinerary ideas, timing, and local tips?`;

const DestinationMapModal = ({ destination, open, onClose }) => {
  const titleId = useId();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !destination?.coordinates) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const w = await ceygoApi.weather({
          lat: destination.coordinates.lat,
          lon: destination.coordinates.lng,
        });
        if (!cancelled) setWeather(w);
      } catch {
        if (!cancelled) setWeather(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, destination]);

  if (!destination) return null;

  const itinerary =
    Array.isArray(destination.itinerary) && destination.itinerary.length > 0
      ? destination.itinerary
      : (destination.tips || []).slice(0, 4);

  const prompt = encodeURIComponent(buildChatPrompt(destination));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.article
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[min(92vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-gradient-to-b from-slate-900 to-slate-950 p-5 text-slate-100 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="mono-label text-[10px] text-cyan-400/90">JOURNEY_INSIGHT</p>
                <h2 id={titleId} className="text-xl font-bold text-white">
                  {destination.name}
                </h2>
                <p className="text-sm text-slate-400">
                  {destination.district}
                  {destination.category ? (
                    <span className="ml-2 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
                      {destination.category}
                    </span>
                  ) : null}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  vibrateLight(6);
                  onClose();
                }}
                className="rounded-md p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <div className="space-y-4 text-sm leading-relaxed">
              <section>
                <h3 className="mono-label mb-2 text-[10px] text-slate-400">AI-curated day flow</h3>
                <ul className="list-inside list-disc space-y-1 text-slate-300">
                  {itinerary.map((line, idx) => (
                    <li key={`${line}-${idx}`}>{line}</li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-white/10 bg-white/5 p-3">
                <h3 className="mono-label mb-2 flex items-center gap-2 text-[10px] text-slate-400">
                  <FiCloud className="text-base" aria-hidden />
                  Live weather snapshot
                </h3>
                {loading ? (
                  <LoadingSpinner text="Fetching regional weather…" />
                ) : weather ? (
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2 py-1">
                      <FiThermometer className="text-cyan-400" aria-hidden />
                      {weather.temperature}°C
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2 py-1">
                      Rain chance {weather.rainChance}%
                    </span>
                    <span className="text-slate-300">{weather.description}</span>
                  </div>
                ) : (
                  <p className="text-slate-500">Weather unavailable — try again later.</p>
                )}
              </section>

              <p className="text-slate-300">{destination.immersiveBlurb || destination.history}</p>

              <Link
                to={`/chat?prompt=${prompt}`}
                onClick={() => vibrateLight(10)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:brightness-110 active:scale-[0.99]"
              >
                <FiMessageCircle />
                Talk to AI about this region
              </Link>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const JourneyMapExplorer = ({ destinations }) => {
  const [selected, setSelected] = useState(null);
  const base = destinations.filter((d) => d.coordinates?.lat && d.coordinates?.lng);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-900 shadow-inner dark:border-cyan-500/20">
      <div
        className="relative min-h-[380px] sm:min-h-[440px]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 35%, rgba(45,212,191,0.35), transparent 45%),
            radial-gradient(circle at 78% 55%, rgba(14,165,233,0.28), transparent 42%),
            radial-gradient(circle at 50% 88%, rgba(251,191,36,0.12), transparent 38%),
            linear-gradient(165deg, #0f172a 0%, #1e293b 48%, #0c4a6e 100%)`,
        }}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12] dark:opacity-[0.18]"
          viewBox="0 0 400 520"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="rgba(94,234,212,0.15)"
            d="M60 120 Q180 40 280 90 T380 200 Q360 320 300 400 Q200 480 80 420 Q40 300 60 120Z"
          />
        </svg>
        <p className="pointer-events-none absolute left-4 top-4 max-w-[240px] text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100/70">
          Journey Map — tap a beacon
        </p>
        {base.map((d) => {
          const pos = lngLatToMapPercent(d.coordinates.lat, d.coordinates.lng);
          return (
            <motion.button
              key={d.id}
              type="button"
              style={pos}
              className="absolute z-[2] -translate-x-1/2 -translate-y-full"
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                vibrateLight(14);
                setSelected(d);
              }}
              aria-label={`Open ${d.name}`}
            >
              <span className="relative flex h-11 w-11 items-center justify-center">
                <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-cyan-200 bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-xl shadow-cyan-500/50 ring-4 ring-cyan-400/20">
                  <FiMapPin className="text-lg" />
                </span>
              </span>
              <span className="mt-1 block max-w-[140px] -translate-x-1/4 text-center text-[10px] font-semibold leading-tight text-white drop-shadow-md">
                {d.name}
              </span>
            </motion.button>
          );
        })}
      </div>
      <DestinationMapModal
        destination={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </div>
  );
};

export default JourneyMapExplorer;
