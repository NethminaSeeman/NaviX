import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";

const BillingResultPage = ({ status }) => {
  const { refresh } = useAuth();
  const [refreshed, setRefreshed] = useState(false);

  useEffect(() => {
    if (status !== "success") return;
    let cancelled = false;
    // Webhook may take a moment; poll a couple of times.
    const tries = [500, 2000, 5000];
    (async () => {
      for (const delay of tries) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, delay));
        await refresh();
      }
      if (!cancelled) setRefreshed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [status, refresh]);

  const isSuccess = status === "success";

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="tech-panel space-y-3 p-6 text-center"
      >
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-3xl ${
            isSuccess
              ? "bg-emerald-500/15 text-emerald-500"
              : "bg-amber-500/15 text-amber-500"
          }`}
        >
          {isSuccess ? <FiCheckCircle /> : <FiXCircle />}
        </div>
        <p className="mono-label text-[11px] text-cyan-500">
          {isSuccess ? "PAYMENT / SUCCESS" : "PAYMENT / CANCELLED"}
        </p>
        <h1 className="section-title">
          {isSuccess ? "You're all set!" : "Checkout cancelled"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          {isSuccess
            ? "Your subscription is active. Your trial countdown has stopped and the full assistant is unlocked."
            : "No charges were made. You can resume any time from the pricing page."}
        </p>
        {isSuccess && !refreshed && (
          <p className="mono-label text-[10px] text-slate-500 dark:text-cyan-300/80">
            Syncing with Stripe...
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Link
            to="/chat"
            className="rounded-md bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_22px_rgba(34,211,238,0.35)] transition hover:brightness-110"
          >
            Open assistant
          </Link>
          <Link
            to="/account"
            className="rounded-md border border-cyan-500/30 px-4 py-2 text-sm font-semibold text-cyan-600 transition hover:bg-cyan-500/10 dark:text-cyan-300"
          >
            View account
          </Link>
          {!isSuccess && (
            <Link
              to="/pricing"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-cyan-500/20 dark:text-slate-200 dark:hover:bg-slate-800/60"
            >
              Back to pricing
            </Link>
          )}
        </div>
      </motion.div>
    </section>
  );
};

export default BillingResultPage;
