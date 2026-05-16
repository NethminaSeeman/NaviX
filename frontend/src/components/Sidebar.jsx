import { FiCompass, FiMap, FiMessageCircle, FiSun } from "react-icons/fi";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/chat", label: "AI Chat", icon: FiMessageCircle },
  { to: "/map", label: "Live Explorer", icon: FiMap },
  { to: "/destination/sigiriya", label: "Top Destination", icon: FiCompass },
  { to: "/about", label: "Travel Tips", icon: FiSun },
];

const Sidebar = () => (
  <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white/50 p-4 dark:border-slate-800 dark:bg-slate-900/40 lg:block">
    <p className="mb-4 text-sm font-semibold text-slate-500 dark:text-slate-300">
      Quick Access
    </p>
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-ceygo-primary text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`
            }
          >
            <Icon /> {item.label}
          </NavLink>
        );
      })}
    </div>
  </aside>
);

export default Sidebar;
