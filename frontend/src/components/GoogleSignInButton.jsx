import { useMemo, useState } from "react";
import { FiLogIn } from "react-icons/fi";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
  firebaseAuth,
  firebaseConfigError,
  firebaseMissingKeys,
} from "@/lib/firebase";

const GoogleSignInButton = ({ onCredential, onError, label = "Continue with Google" }) => {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const unavailable = !firebaseAuth || !!firebaseConfigError;
  const missingLabel = useMemo(
    () => firebaseMissingKeys.map((key) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`),
    []
  );

  const handleClick = async () => {
    if (!firebaseAuth) return;
    setStatus("");
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(firebaseAuth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const idToken = credential?.idToken;
      if (!idToken) {
        throw new Error("Google credential did not include an ID token.");
      }
      await onCredential?.(idToken);
    } catch (err) {
      const message = err?.message || "Google sign-in unavailable.";
      setStatus(message);
      onError?.(err);
    } finally {
      setBusy(false);
    }
  };

  if (unavailable) {
    return (
      <div className="rounded-md border border-amber-400/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
        <p className="font-semibold">Google sign-in not configured</p>
        <p className="mt-1 opacity-80">
          Set Firebase web env vars (
          <code className="rounded bg-amber-500/10 px-1">
            {missingLabel.join(", ")}
          </code>
          ) to enable {label.toLowerCase()}.
        </p>
        {firebaseConfigError && (
          <p className="mt-1 opacity-70">{firebaseConfigError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="flex w-full max-w-[320px] items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-zinc-900 dark:text-slate-100 dark:hover:bg-zinc-800"
      >
        <FiLogIn />
        {busy ? "Signing in..." : label}
      </button>
      {status && (
        <p className="text-[11px] text-red-500 dark:text-red-300">{status}</p>
      )}
    </div>
  );
};

export default GoogleSignInButton;
