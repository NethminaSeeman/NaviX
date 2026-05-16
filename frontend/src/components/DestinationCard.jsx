import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const DestinationCard = ({ destination }) => (
  <motion.article
    whileHover={{ y: -4 }}
    className="glass-card overflow-hidden"
  >
    <img
      src={destination.image}
      alt={destination.name}
      className="h-44 w-full object-cover"
    />
    <div className="space-y-2 p-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {destination.name}
      </h3>
      <p className="text-sm text-slate-500">{destination.district}</p>
      <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
        {destination.history}
      </p>
      <Link
        to={`/destination/${destination.id}`}
        className="inline-block rounded-lg bg-ceygo-secondary px-3 py-1.5 text-sm text-white"
      >
        View Details
      </Link>
    </div>
  </motion.article>
);

export default DestinationCard;
