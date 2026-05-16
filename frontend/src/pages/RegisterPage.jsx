import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiAlertTriangle, FiCheckCircle, FiUserPlus } from "react-icons/fi";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useAuth } from "@/context/AuthContext";

const useNextParam = () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const raw = params.get("next") || "/chat";
  return raw.startsWith("/") ? raw : "/chat";
};

const RegisterPage = () => {
  const { register, loginWithGoogle, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const next = useNextParam();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && isAuthenticated) {
    navigate(next, { replace: true });
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!accept) {
      setError("Please accept the terms to continue.");
      return;
    }
    setBusy(true);
    try {
      await register({ email: email.trim(), password, name: name.trim() || null });
      navigate(next, { replace: true });
    } catch (err) {
      setError(err?.message || "Registration failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async (credential) => {
    setError("");
    setBusy(true);
    try {
      await loginWithGoogle(credential);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err?.message || "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="tech-panel space-y-4 p-6"
      >
        <div>
          <p className="mono-label text-[11px] text-cyan-500">NAVI_X / NEW ACCOUNT</p>
          <h1 className="section-title">Start your 7-day free trial</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Full access to the AI assistant, live map, and rich destination guides.
            No card required for the trial.
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-emerald-400/40 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-200">
          <FiCheckCircle className="mt-0.5 shrink-0 text-base" />
          <span>
            7 days free, then 8 USD / month or 60 USD / year. Cancel anytime from your
            account.
          </span>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200">
            <FiAlertTriangle className="mt-0.5 shrink-0 text-base" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mono-label text-[10px] text-slate-500 dark:text-cyan-300/80">
              Name
            </span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white/80 px-3 py-2 text-sm shadow-inner outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-cyan-500/20 dark:bg-zinc-900/70 dark:text-slate-100"
              placeholder="How should we greet you?"
            />
          </label>
          <label className="block">
            <span className="mono-label text-[10px] text-slate-500 dark:text-cyan-300/80">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white/80 px-3 py-2 text-sm shadow-inner outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-cyan-500/20 dark:bg-zinc-900/70 dark:text-slate-100"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="mono-label text-[10px] text-slate-500 dark:text-cyan-300/80">
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white/80 px-3 py-2 text-sm shadow-inner outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-cyan-500/20 dark:bg-zinc-900/70 dark:text-slate-100"
              placeholder="At least 8 characters"
            />
          </label>
          <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
              className="mt-0.5 accent-cyan-500"
            />
            <span>
              I agree to the NaviX Terms and acknowledge billing starts after the
              7-day trial unless I cancel.
            </span>
          </label>
          <button
            type="submit"
            disabled={busy || !accept}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_22px_rgba(34,211,238,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiUserPlus />
            {busy ? "Creating account..." : "Start free trial"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200 dark:bg-cyan-500/10" />
          <span className="mono-label text-[10px] text-slate-400">OR</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-cyan-500/10" />
        </div>

        <GoogleSignInButton onCredential={handleGoogle} />

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            to={`/login?next=${encodeURIComponent(next)}`}
            className="font-semibold text-cyan-600 hover:underline dark:text-cyan-300"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </section>
  );
};

export default RegisterPage;
