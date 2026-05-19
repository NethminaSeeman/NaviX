import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowUpRight } from "react-icons/fi";
import fallbackImage from "@/assets/destinations/fallback.jpg";
import { vibrateLight } from "@/utils/haptics";

const DestinationCard = ({ destination }) => (
  <motion.article
    layout
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    whileHover={{ y: -4 }}
    transition={{ duration: 0.3 }}
    className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-950/5 shadow-[0_16px_50px_-24px_rgba(14,116,144,0.55)] dark:border-cyan-500/15"
  >
    <div className="relative h-52 overflow-hidden sm:h-56">
      <motion.img
        src={destination.image}
        alt={destination.name}
        className="h-full w-full object-cover"
        whileHover={{ scale: 1.06 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = fallbackImage;
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent opacity-90 transition duration-500 group-hover:via-slate-950/40" />
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen transition duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at 50% 100%, rgba(34,211,238,0.35), transparent 55%)",
        }}
      />
      {destination.category && (
        <span className="absolute left-3 top-3 rounded-full border border-white/25 bg-black/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
          {destination.category}
        </span>
      )}
    </div>

    <div className="relative space-y-2 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {destination.name}
          </h3>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-cyan-600/90 dark:text-cyan-300/90">
            {destination.district}
          </p>
        </div>
      </div>

      <p className="line-clamp-2 text-sm text-slate-600 transition group-hover:line-clamp-none group-hover:text-slate-700 dark:text-slate-300 dark:group-hover:text-slate-200">
        {destination.immersiveBlurb || destination.history}
      </p>

      <Link
        to={`/destination/${destination.id}`}
        onClick={() => vibrateLight(10)}
        className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/35 bg-gradient-to-r from-cyan-500 to-teal-500 px-3 py-2 text-sm font-semibold text-slate-950 shadow-md transition hover:brightness-110 active:scale-[0.98]"
      >
        View Details
        <FiArrowUpRight className="text-base" aria-hidden />
      </Link>
    </div>
  </motion.article>
);

export default DestinationCard;
