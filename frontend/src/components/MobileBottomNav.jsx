import { memo } from "react";
import { FiHome, FiLogIn, FiMap, FiMessageCircle, FiUser } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const guestItems = [
  { to: "/", icon: FiHome, label: "Home" },
  { to: "/chat", icon: FiMessageCircle, label: "Assistant" },
  { to: "/map", icon: FiMap, label: "Map" },
  { to: "/login", icon: FiLogIn, label: "Sign in" },
];

const authItems = [
  { to: "/", icon: FiHome, label: "Home" },
  { to: "/chat", icon: FiMessageCircle, label: "Assistant" },
  { to: "/map", icon: FiMap, label: "Map" },
  { to: "/account", icon: FiUser, label: "Account" },
];

const MobileBottomNav = () => {
  const { isAuthenticated, access, loading } = useAuth();

  if (loading) return null;

  const resolveProtectedPath = (path) => {
    if (!isAuthenticated) return `/login?next=${encodeURIComponent(path)}`;
    if (!access?.allowed) return `/pricing?next=${encodeURIComponent(path)}`;
    return path;
  };

  const items = (isAuthenticated ? authItems : guestItems).map((item) => {
    if (item.to !== "/chat" && item.to !== "/map") return item;
    return { ...item, to: resolveProtectedPath(item.to) };
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-lg dark:border-cyan-500/20 dark:bg-zinc-950/95 lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/80"
                }`
              }
            >
              <Icon className="text-[18px]" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default memo(MobileBottomNav);
