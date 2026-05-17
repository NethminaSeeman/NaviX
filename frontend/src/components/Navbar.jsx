import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FiChevronDown,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiShield,
  FiUser,
  FiX,
} from "react-icons/fi";
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
  const location = useLocation();
  const { loading, isAuthenticated, user, access, logout } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountMenuRef = useRef(null);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Close account dropdown on outside click
  useEffect(() => {
    const close = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    setMobileOpen(false);
    await logout();
    navigate("/", { replace: true });
  };

  const showTrialBadge = isAuthenticated && access?.is_trial && !user?.is_admin;
  const showProBadge = isAuthenticated && access?.is_paid;
  const needsUpgrade = isAuthenticated && !loading && access && !access.allowed;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl dark:border-cyan-500/20 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-3 px-4 py-3 md:px-5">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2">
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

          {/* Desktop nav */}
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

          {/* Right side controls */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Desktop-only auth buttons */}
            {!loading && !isAuthenticated && (
              <div className="hidden items-center gap-2 lg:flex">
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
              </div>
            )}

            {/* Desktop account dropdown */}
            {!loading && isAuthenticated && (
              <div className="hidden lg:flex items-center gap-2">
                {showTrialBadge && (
                  <span className="mono-label rounded-full bg-cyan-500/15 px-2 py-1 text-[10px] text-cyan-700 dark:text-cyan-300">
                    Trial: {access.trial_days_left}d left
                  </span>
                )}
                {showProBadge && (
                  <span className="mono-label rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] text-emerald-700 dark:text-emerald-300">
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

                <div className="relative" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((o) => !o)}
                    className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800 transition hover:bg-slate-100 dark:border-cyan-500/25 dark:text-slate-100 dark:hover:bg-slate-800/70"
                    aria-expanded={accountMenuOpen}
                    aria-haspopup="menu"
                  >
                    <FiUser className="text-base opacity-80" />
                    <span className="max-w-[120px] truncate">
                      {user?.name || user?.email?.split("@")[0] || "Account"}
                    </span>
                    <FiChevronDown
                      className={`text-sm opacity-60 transition-transform ${accountMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {accountMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-1 min-w-[190px] rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-cyan-500/20 dark:bg-zinc-900"
                    >
                      <div className="border-b border-slate-100 px-3 py-2 dark:border-cyan-500/10">
                        <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                          {user?.name || "Account"}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
                      </div>
                      <Link to="/account" role="menuitem" onClick={() => setAccountMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                        Account
                      </Link>
                      {user?.is_admin && (
                        <Link to="/admin/users" role="menuitem" onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm text-cyan-700 hover:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-slate-800">
                          <FiShield className="text-xs" /> Admin panel
                        </Link>
                      )}
                      <Link to="/pricing" role="menuitem" onClick={() => setAccountMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                        Plans & billing
                      </Link>
                      <div className="border-t border-slate-100 dark:border-cyan-500/10">
                        <button type="button" role="menuitem" onClick={handleLogout}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-500/10 dark:text-red-400">
                          <FiLogOut /> Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ThemeToggle />

            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-100 dark:border-cyan-500/25 dark:text-slate-200 dark:hover:bg-slate-800/70 lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <FiX className="text-lg" /> : <FiMenu className="text-lg" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer panel */}
      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-[280px] max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-zinc-950 lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Mobile navigation"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-cyan-500/20">
          <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <span className="rounded-md bg-gradient-to-br from-cyan-400 to-teal-500 p-1.5 text-slate-900">
              <FiMapPin className="text-sm" />
            </span>
            <span className="font-bold text-slate-900 dark:text-white">NaviX</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Close menu"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Authenticated user info */}
        {isAuthenticated && user && (
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-cyan-500/10 dark:bg-zinc-900/60">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
                <FiUser />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {user?.name || user?.email?.split("@")[0]}
                </p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {showTrialBadge && (
                <span className="mono-label rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] text-cyan-700 dark:text-cyan-300">
                  Trial: {access.trial_days_left}d left
                </span>
              )}
              {showProBadge && (
                <span className="mono-label rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                  Pro
                </span>
              )}
              {needsUpgrade && (
                <span className="mono-label rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-800 dark:text-amber-300">
                  Trial expired
                </span>
              )}
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-cyan-500/70">
            Navigation
          </p>
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Account section */}
          {isAuthenticated ? (
            <>
              <p className="mb-2 mt-5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-cyan-500/70">
                Account
              </p>
              <div className="space-y-0.5">
                <NavLink to="/account" onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"}`
                  }>
                  My Account
                </NavLink>
                <NavLink to="/pricing" onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"}`
                  }>
                  Plans & Billing
                </NavLink>
                {user?.is_admin && (
                  <NavLink to="/admin/users" onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" : "text-cyan-700 hover:bg-cyan-500/10 dark:text-cyan-400 dark:hover:bg-slate-800/60"}`
                    }>
                    <FiShield className="text-xs" /> Admin Panel
                  </NavLink>
                )}
              </div>
            </>
          ) : (
            !loading && (
              <>
                <p className="mb-2 mt-5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-cyan-500/70">
                  Get Started
                </p>
                <div className="space-y-2 px-1">
                  <Link to="/login" onClick={() => setMobileOpen(false)}
                    className="block rounded-md border border-slate-200 px-3 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-cyan-500/20 dark:text-slate-200">
                    Sign in
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)}
                    className="block rounded-md bg-gradient-to-r from-cyan-500 to-teal-500 px-3 py-2.5 text-center text-sm font-semibold text-slate-900 shadow-[0_6px_18px_rgba(34,211,238,0.35)] hover:brightness-110">
                    Get started free
                  </Link>
                </div>
              </>
            )
          )}
        </nav>

        {/* Drawer footer */}
        {isAuthenticated && (
          <div className="border-t border-slate-200 px-3 py-3 dark:border-cyan-500/20">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
            >
              <FiLogOut /> Sign out
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default Navbar;
