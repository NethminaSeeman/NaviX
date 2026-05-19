import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiAlertTriangle, FiCheck, FiZap } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { billingApi } from "@/services/billingApi";
import { PLAN_PRICING } from "@/utils/constants";

const features = [
  "AI travel assistant tuned for Sri Lanka",
  "Voice-friendly answers + text-to-speech",
  "Live map with 138+ curated places",
  "Weather-aware route and beach suggestions",
  "Deep history, culture, and pronunciation hints",
];

const Card = ({ title, price, period, badge, highlight, children, footer }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={`tech-panel flex flex-col gap-4 p-5 ${
      highlight
        ? "ring-2 ring-cyan-500/60 shadow-[0_18px_45px_rgba(34,211,238,0.22)]"
        : ""
    }`}
  >
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        {badge && (
          <span className="mono-label mt-1 inline-block rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-600 dark:text-cyan-300">
            {badge}
          </span>
        )}
      </div>
      <div className="text-right">
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
          {price}
        </p>
        <p className="mono-label text-[10px] text-slate-500 dark:text-cyan-300/80">
          {period}
        </p>
      </div>
    </div>
    <div className="flex-1">{children}</div>
    {footer}
  </motion.div>
);

const FeatureList = () => (
  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
    {features.map((f) => (
      <li key={f} className="flex items-start gap-2">
        <FiCheck className="mt-0.5 shrink-0 text-cyan-500" />
        <span>{f}</span>
      </li>
    ))}
  </ul>
);

const PricingPage = () => {
  const { isAuthenticated, access, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null); // 'monthly' | 'yearly' | null

  const startCheckout = async (plan) => {
    setError("");
    if (!isAuthenticated) {
      navigate(`/register?next=${encodeURIComponent("/pricing")}`);
      return;
    }
    setBusy(plan);
    try {
      const url = await billingApi.startCheckout(plan);
      window.location.assign(url);
    } catch (err) {
      setError(err?.message || "Could not start checkout.");
      setBusy(null);
    }
  };

  const trialFooter = (
    <Link
      to={isAuthenticated ? "/chat" : "/register"}
      className="rounded-md border border-cyan-500/30 px-3 py-2 text-center text-sm font-semibold text-cyan-600 transition hover:bg-cyan-500/10 dark:text-cyan-300"
    >
      {isAuthenticated ? "Open assistant" : "Start free trial"}
    </Link>
  );

  const checkoutFooter = (plan) => (
    <button
      type="button"
      onClick={() => startCheckout(plan)}
      disabled={busy !== null}
      className="rounded-md bg-gradient-to-r from-cyan-500 to-teal-500 px-3 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_22px_rgba(34,211,238,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy === plan ? "Redirecting..." : `Subscribe ${plan === "yearly" ? "yearly" : "monthly"}`}
    </button>
  );

  const yearlyMonthly = (PLAN_PRICING.yearly.price / 12).toFixed(2);
  const savings = Math.round(
    100 - (PLAN_PRICING.yearly.price / (PLAN_PRICING.monthly.price * 12)) * 100
  );

  return (
    <section className="space-y-5">
      <div className="tech-panel space-y-2 p-5">
        <p className="mono-label text-[11px] text-cyan-500">NAVI_X / PLANS</p>
        <h1 className="section-title">Travel smarter for the price of a tuk-tuk ride</h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Every account gets the first 7 days free. Pick a plan that fits your trip
          once your trial ends.
        </p>
        {!loading && isAuthenticated && access?.is_trial && (
          <p className="mono-label inline-flex w-fit items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-[10px] text-cyan-600 dark:text-cyan-300">
            <FiZap />
            Trial: {access.trial_days_left} day{access.trial_days_left === 1 ? "" : "s"} left
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200">
          <FiAlertTriangle className="mt-0.5 shrink-0 text-base" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="Free trial"
          price="$0"
          period="for 7 days"
          badge="No card required"
          footer={trialFooter}
        >
          <FeatureList />
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Auto-converts to monthly only if you choose a plan below. The trial
            simply expires otherwise.
          </p>
        </Card>

        <Card
          title="Monthly"
          price={`$${PLAN_PRICING.monthly.price}`}
          period="per month"
          badge="Most flexible"
          footer={checkoutFooter("monthly")}
        >
          <FeatureList />
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Cancel anytime from the Account page. Billed via Stripe.
          </p>
        </Card>

        <Card
          title="Yearly"
          price={`$${PLAN_PRICING.yearly.price}`}
          period="per year"
          badge={`Save ${savings}%`}
          highlight
          footer={checkoutFooter("yearly")}
        >
          <FeatureList />
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Works out to ~${yearlyMonthly} / month. Same features, less overhead.
          </p>
        </Card>
      </div>

      <p className="mono-label text-center text-[10px] text-slate-500 dark:text-cyan-300/80">
        Payments processed securely by Stripe. Cards never touch the NaviX servers.
      </p>
    </section>
  );
};

export default PricingPage;
