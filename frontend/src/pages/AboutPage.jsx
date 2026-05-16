import { motion } from "framer-motion";
import { FiCheck, FiNavigation, FiSun } from "react-icons/fi";
import bgHills from "@/assets/destinations/nuwara-eliya.jpg";
import bgCoast from "@/assets/destinations/galle.jpg";

const sections = [
  {
    title: "Effortless Exploration, Perfected.",
    body:
      "NaviX quietly orchestrates your day — smart itinerary pacing, weather-aware route windows, and realistic transfers — so you spend less time second-guessing and more time present. Rain on the coast? The plan flexes before you even ask.",
    icon: FiNavigation,
  },
  {
    title: "Deeply Local, Curated Insights.",
    body:
      "Move past generic checklists into story-rich stops: living heritage, markets locals love, and viewpoints that never make the mass-market flyer. The wisdom of Sri Lanka — history, flavor, and rhythm — made portable in your pocket.",
    icon: FiSun,
  },
];

const valueProps = [
  "Voice-first guidance for real roads, rail, and trails",
  "Weather-smart suggestions that respect how Sri Lanka actually feels hour by hour",
  "Itineraries shaped for wonder — not traffic anxiety",
];

const AboutPage = () => (
  <div className="space-y-8">
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-cyan-500/20"
    >
      <img
        src={bgHills}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-40 dark:opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/88 to-teal-50/40 dark:from-zinc-950/95 dark:via-zinc-950/88 dark:to-cyan-950/40" />
      <div className="relative p-6 md:p-10">
        <p className="mono-label mb-2 text-[11px] text-cyan-600 dark:text-cyan-300">DISCOVER_SRI_LANKA</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">
          NavX: Your Digital Sherpa for Sri Lanka.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-700 dark:text-slate-200">
          A sensory-first companion for travelers who want clarity without a clipboard — voice, maps,
          and local soul in one calm experience.
        </p>
      </div>
    </motion.header>

    <div className="grid gap-5 md:grid-cols-2">
      {sections.map((section, i) => {
        const Icon = section.icon;
        return (
          <motion.article
            key={section.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="tech-panel relative overflow-hidden p-5"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/15 blur-3xl"
              aria-hidden
            />
            <Icon className="mb-3 text-2xl text-cyan-600 dark:text-cyan-300" aria-hidden />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{section.body}</p>
          </motion.article>
        );
      })}
    </div>

    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-cyan-500/20"
    >
      <img
        src={bgCoast}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-35 dark:opacity-25"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/88 to-slate-900/35" />
      <div className="relative grid gap-6 p-6 md:grid-cols-2 md:p-10">
        <div>
          <h2 className="text-2xl font-bold text-white">Why Choose NavX?</h2>
          <p className="mt-2 text-sm text-slate-200/90">
            The wisdom of Sri Lanka, made portable — curated for first-time visitors and returning
            explorers alike.
          </p>
        </div>
        <ul className="space-y-3">
          {valueProps.map((line) => (
            <li key={line} className="flex gap-3 text-sm text-slate-100">
              <FiCheck className="mt-0.5 shrink-0 text-emerald-400" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  </div>
);

export default AboutPage;
