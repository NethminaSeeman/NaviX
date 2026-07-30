import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiAlertTriangle, FiLogIn } from "react-icons/fi";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useAuth } from "@/context/AuthContext";

const useNextParam = () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const raw = params.get("next") || "/chat";
  // basic safety: only allow same-origin paths
  return raw.startsWith("/") ? raw : "/chat";
};

const LoginPage = () => {
  const { login, loginWithGoogle, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const next = useNextParam();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(next, { replace: true });
    }
  }, [loading, isAuthenticated, navigate, next]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login({ email: email.trim(), password });
      navigate(next, { replace: true });
    } catch (err) {
      setError(err?.message || "Could not sign in.");
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
          <p className="mono-label text-[11px] text-cyan-500">NAVI_X / AUTH</p>
          <h1 className="section-title">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Sign in to continue your Sri Lanka exploration.
          </p>
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
              autoComplete="current-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white/80 px-3 py-2 text-sm shadow-inner outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-cyan-500/20 dark:bg-zinc-900/70 dark:text-slate-100"
              placeholder="At least 8 characters"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_22px_rgba(34,211,238,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiLogIn />
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200 dark:bg-cyan-500/10" />
          <span className="mono-label text-[10px] text-slate-400">OR</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-cyan-500/10" />
        </div>

        <GoogleSignInButton onCredential={handleGoogle} />

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          New to NaviX?{" "}
          <Link
            to={`/register?next=${encodeURIComponent(next)}`}
            className="font-semibold text-cyan-600 hover:underline dark:text-cyan-300"
          >
            Create an account
          </Link>
          {" "}for a 7-day free trial.
        </p>
      </motion.div>
    </section>
  );
};

export default LoginPage;
