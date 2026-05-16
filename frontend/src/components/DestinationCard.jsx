import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const DestinationCard = ({ destination }) => (
  <motion.article
    whileHover={{ y: -6 }}
    transition={{ duration: 0.2 }}
    className="glass-card overflow-hidden"
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
          <span className="rounded-full bg-ceygo-accent/20 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
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
        className="inline-block rounded-lg bg-ceygo-secondary px-3 py-1.5 text-sm text-white shadow-sm transition hover:bg-blue-700"
      >
        View Details
      </Link>
    </div>
  </motion.article>
);

export default DestinationCard;
