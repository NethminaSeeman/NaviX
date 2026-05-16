import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const DestinationCard = ({ destination }) => (
  <motion.article
    whileHover={{ y: -6 }}
    transition={{ duration: 0.2 }}
    className="tech-panel overflow-hidden"
  >
    <img
      src={destination.image}
      alt={destination.name}
      className="h-44 w-full object-cover"
    />
    <div className="space-y-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {destination.name}
        </h3>
        {destination.category && (
          <span className="mono-label rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-700 dark:text-cyan-200">
            {destination.category}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500">{destination.district}</p>
      <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
        {destination.history}
      </p>
      <Link
        to={`/destination/${destination.id}`}
        className="inline-block rounded-md border border-cyan-500/40 bg-gradient-to-r from-cyan-500 to-teal-500 px-3 py-1.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:opacity-95 active:scale-95"
      >
        View Details
      </Link>
    </div>
  </motion.article>
);

export default DestinationCard;
