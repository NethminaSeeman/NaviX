import { motion } from "framer-motion";
import { FiCompass, FiMap, FiMessageCircle, FiSun } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { vibrateLight } from "@/utils/haptics";

const items = [
  { to: "/chat", label: "AI Chat", icon: FiMessageCircle },
  { to: "/map", label: "Live Explorer", icon: FiMap },
  { to: "/destination/sigiriya", label: "Top Destination", icon: FiCompass },
  { to: "/about", label: "Travel Tips", icon: FiSun },
];

const Sidebar = () => (
  <aside className="tech-panel sticky top-[78px] hidden h-[calc(100vh-108px)] w-72 shrink-0 p-4 lg:block">
    <p className="mono-label mb-4 text-[11px] text-slate-500 dark:text-cyan-300/80">
      Quick Access
    </p>
    <div className="space-y-1.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => vibrateLight(6)}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition ${
                isActive
                  ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-700 shadow-[inset_3px_0_0_0_rgba(34,211,238,1)] dark:text-cyan-200"
                  : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-cyan-500/20 dark:hover:bg-slate-800/50"
              }`
            }
          >
            <motion.span
              whileHover={{ scale: 1.1, rotate: [0, -4, 4, 0] }}
              transition={{ duration: 0.35 }}
              className="inline-flex text-base"
            >
              <Icon />
            </motion.span>
            <span className="font-medium">{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  </aside>
);

export default Sidebar;
