import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { FiChevronDown, FiLogOut, FiMapPin, FiUser } from "react-icons/fi";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/chat", label: "Assistant" },
  { to: "/map", label: "Live Map" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const Navbar = () => {
  const navigate = useNavigate();
  const { loading, isAuthenticated, user, access, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/", { replace: true });
  };

  const showTrialBadge = isAuthenticated && access?.is_trial && !user?.is_admin;
  const showProBadge = isAuthenticated && access?.is_paid;
  const needsUpgrade =
    isAuthenticated && !loading && access && !access.allowed;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-cyan-500/20 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
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

        <nav className="hidden flex-1 items-center justify-center gap-4 lg:flex xl:gap-5">
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

        <div className="flex items-center gap-2 md:gap-3">
          {!loading && !isAuthenticated && (
            <>
              <Link
                to="/login"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/70"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-gradient-to-r from-cyan-500 to-teal-500 px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-[0_6px_18px_rgba(34,211,238,0.35)] transition hover:brightness-110"
              >
                Get started
              </Link>
            </>
          )}

          {!loading && isAuthenticated && (
            <>
              {showTrialBadge && (
                <span className="mono-label hidden rounded-full bg-cyan-500/15 px-2 py-1 text-[10px] text-cyan-700 dark:text-cyan-300 sm:inline-flex">
                  Trial: {access.trial_days_left}d left
                </span>
              )}
              {showProBadge && (
                <span className="mono-label hidden rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] text-emerald-700 dark:text-emerald-300 sm:inline-flex">
                  Pro
                </span>
              )}
              {needsUpgrade && (
                <Link
                  to="/pricing"
                  className="mono-label rounded-md bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-500/30 dark:text-amber-200"
                >
                  Upgrade
                </Link>
              )}

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800 transition hover:bg-slate-100 dark:border-cyan-500/25 dark:text-slate-100 dark:hover:bg-slate-800/70"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <FiUser className="text-base opacity-80" />
                  <span className="hidden max-w-[120px] truncate sm:inline">
                    {user?.name || user?.email?.split("@")[0] || "Account"}
                  </span>
                  <FiChevronDown
                    className={`text-sm opacity-60 transition ${menuOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-1 min-w-[180px] rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-cyan-500/20 dark:bg-zinc-900"
                  >
                    <Link
                      to="/account"
                      role="menuitem"
                      className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => setMenuOpen(false)}
                    >
                      Account
                    </Link>
                    {user?.is_admin && (
                      <Link
                        to="/admin/users"
                        role="menuitem"
                        className="block px-3 py-2 text-sm text-cyan-700 hover:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-slate-800"
                        onClick={() => setMenuOpen(false)}
                      >
                        Admin panel
                      </Link>
                    )}
                    <Link
                      to="/pricing"
                      role="menuitem"
                      className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => setMenuOpen(false)}
                    >
                      Plans & billing
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-500/10 dark:text-red-400"
                      onClick={handleLogout}
                    >
                      <FiLogOut />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
