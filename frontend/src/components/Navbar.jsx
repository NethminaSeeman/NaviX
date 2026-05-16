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
  <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-cyan-500/20 dark:bg-zinc-950/80">
    <div className="mx-auto flex max-w-[1560px] items-center justify-between px-4 py-3 md:px-5">
      <Link to="/" className="flex items-center gap-2">
        <span className="rounded-md bg-gradient-to-br from-cyan-400 to-teal-500 p-2 text-slate-900 shadow-[0_8px_20px_rgba(45,212,191,0.45)]">
          <FiMapPin />
        </span>
        <div>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-50">NaviX</p>
          <p className="mono-label text-[10px] text-slate-500 dark:text-cyan-300/80">
            Ai Sri Lanka Companion
          </p>
        </div>
      </Link>

      <nav className="hidden items-center gap-5 md:flex">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-md px-2 py-1 text-sm font-medium transition ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-cyan-200"
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
