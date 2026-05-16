/** Light haptic-style feedback on supported devices (no-op elsewhere). */
export function vibrateLight(pattern = 12) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function")
    return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}
