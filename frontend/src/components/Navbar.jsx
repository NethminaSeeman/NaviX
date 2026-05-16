import { Link, NavLink } from "react-router-dom";
import { FiMapPin } from "react-icons/fi";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/chat", label: "Assistant" },
  { to: "/map", label: "Live Map" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const Navbar = () => (
  <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
      <Link to="/" className="flex items-center gap-2">
        <span className="rounded-lg bg-gradient-to-br from-ceygo-primary to-ceygo-secondary p-2 text-white shadow">
          <FiMapPin />
        </span>
        <div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">NaviX</p>
          <p className="text-xs text-slate-500">AI Sri Lanka Companion</p>
        </div>
      </Link>

      <nav className="hidden items-center gap-5 md:flex">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `text-sm font-medium transition ${
                isActive
                  ? "text-ceygo-primary"
                  : "text-slate-600 hover:text-ceygo-primary dark:text-slate-300"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <ThemeToggle />
    </div>
  </header>
);

export default Navbar;
