import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiAlertTriangle,
  FiClock,
  FiCreditCard,
  FiLogOut,
  FiStar,
  FiZap,
} from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { billingApi } from "@/services/billingApi";

const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
};

const statusLabel = (access) => {
  if (!access) return "Inactive";
  if (access.is_paid) {
    if (access.status === "past_due") return "Payment past due";
    if (access.status === "canceled") return "Canceled";
    return `Active (${access.plan ?? "subscription"})`;
  }
  if (access.is_trial) return `Trial (${access.trial_days_left} days left)`;
  return "Expired";
};

const AccountPage = () => {
  const { user, access, subscription, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const openPortal = async () => {
    setError("");
    setBusy("portal");
    try {
      const url = await billingApi.openPortal();
      window.location.assign(url);
    } catch (err) {
      setError(err?.message || "Could not open billing portal.");
      setBusy("");
    }
  };

  const handleLogout = async () => {
    setBusy("logout");
    await logout();
    navigate("/", { replace: true });
  };

  const handleRefresh = async () => {
    setBusy("refresh");
    await refresh();
    setBusy("");
  };

  if (!user) {
    return (
      <section className="tech-panel p-5 text-sm text-slate-500 dark:text-slate-300">
        Loading account...
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="tech-panel space-y-3 p-5"
      >
        <p className="mono-label text-[11px] text-cyan-500">NAVI_X / ACCOUNT</p>
        <h1 className="section-title">{user.name || user.email}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">{user.email}</p>
        <p className="mono-label text-[10px] text-slate-500 dark:text-cyan-300/80">
          Member since {formatDate(user.created_at)}
        </p>
      </motion.div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200">
          <FiAlertTriangle className="mt-0.5 shrink-0 text-base" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="tech-panel space-y-3 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Plan
            </h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                access?.is_paid
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                  : access?.is_trial
                  ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300"
                  : "bg-red-500/15 text-red-500 dark:text-red-300"
              }`}
            >
              {access?.is_paid ? <FiStar /> : <FiZap />}
              {statusLabel(access)}
            </span>
          </div>

          <dl className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <dt className="mono-label text-[10px] text-slate-500 dark:text-cyan-300/80">
                Trial ends
              </dt>
              <dd>{formatDate(access?.trial_ends_at)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="mono-label text-[10px] text-slate-500 dark:text-cyan-300/80">
                Renews
              </dt>
              <dd>{formatDate(subscription?.current_period_end)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="mono-label text-[10px] text-slate-500 dark:text-cyan-300/80">
                Plan
              </dt>
              <dd>{subscription?.plan ?? "—"}</dd>
            </div>
          </dl>

          {access?.is_paid ? (
            <button
              type="button"
              onClick={openPortal}
              disabled={busy !== ""}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-cyan-500/30 px-3 py-2 text-sm font-semibold text-cyan-600 transition hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-cyan-300"
            >
              <FiCreditCard />
              {busy === "portal" ? "Opening portal..." : "Manage billing on Stripe"}
            </button>
          ) : (
            <Link
              to="/pricing"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-teal-500 px-3 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_22px_rgba(34,211,238,0.35)] transition hover:brightness-110"
            >
              <FiZap />
              See plans
            </Link>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="tech-panel space-y-3 p-5"
        >
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Session
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Signed in with{" "}
            {user.has_google && user.has_password
              ? "email and Google"
              : user.has_google
              ? "Google"
              : "email and password"}
            .
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={busy !== ""}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-cyan-500/20 dark:text-slate-200 dark:hover:bg-slate-800/60"
          >
            <FiClock />
            {busy === "refresh" ? "Refreshing..." : "Refresh status"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={busy !== ""}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-red-400/40 px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiLogOut />
            {busy === "logout" ? "Signing out..." : "Sign out"}
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default AccountPage;
