import { FiHome, FiMap, FiMessageCircle, FiPhone } from "react-icons/fi";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", icon: FiHome, label: "Home" },
  { to: "/chat", icon: FiMessageCircle, label: "Chat" },
  { to: "/map", icon: FiMap, label: "Map" },
  { to: "/contact", icon: FiPhone, label: "Contact" },
];

const MobileBottomNav = () => (
  <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-lg dark:border-slate-700 dark:bg-slate-950/90 lg:hidden">
    <div className="flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-lg px-3 py-1 text-xs ${
                isActive ? "text-ceygo-primary" : "text-slate-500"
              }`
            }
          >
            <Icon className="text-base" />
            {item.label}
          </NavLink>
        );
      })}
    </div>
  </div>
);

export default MobileBottomNav;
