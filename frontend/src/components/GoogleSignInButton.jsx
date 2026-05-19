import { useEffect, useId, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID } from "@/utils/constants";

const GSI_SRC = "https://accounts.google.com/gsi/client";

let gsiLoadPromise = null;

const loadGsi = () => {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (gsiLoadPromise) return gsiLoadPromise;

  gsiLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", () => reject(new Error("GSI failed to load.")));
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Google Identity Services failed to load."));
    document.head.appendChild(script);
  });
  return gsiLoadPromise;
};

const GoogleSignInButton = ({ onCredential, onError, label = "Continue with Google" }) => {
  const containerRef = useRef(null);
  const containerId = useId();
  const [unavailable, setUnavailable] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setUnavailable(true);
      return;
    }
    let cancelled = false;
    loadGsi()
      .then((google) => {
        if (cancelled || !google || !containerRef.current) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response?.credential) onCredential?.(response.credential);
          },
          ux_mode: "popup",
          auto_select: false,
        });
        google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          logo_alignment: "left",
          width: 320,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(err?.message || "Google Sign-In unavailable.");
        onError?.(err);
      });

    return () => {
      cancelled = true;
    };
  }, [onCredential, onError]);

  if (unavailable) {
    return (
      <div className="rounded-md border border-amber-400/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
        <p className="font-semibold">Google sign-in not configured</p>
        <p className="mt-1 opacity-80">
          Set <code className="rounded bg-amber-500/10 px-1">VITE_GOOGLE_CLIENT_ID</code> in
          {" "}<code className="rounded bg-amber-500/10 px-1">.env.local</code> to enable {label.toLowerCase()}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div id={`gsi-${containerId}`} ref={containerRef} className="min-h-[44px]" />
      {status && (
        <p className="text-[11px] text-red-500 dark:text-red-300">{status}</p>
      )}
    </div>
  );
};

export default GoogleSignInButton;
