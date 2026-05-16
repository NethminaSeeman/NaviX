/**
 * Minimal Stripe REST client built on `fetch` so the Worker bundle stays
 * tiny (no `stripe` npm dependency).
 *
 * Stripe's REST API consumes `application/x-www-form-urlencoded` bodies.
 * We provide `formEncode()` so callers can pass plain JS objects with
 * nested keys via dotted paths (e.g. `"line_items.0.price"`).
 */

import { hmacSha256Hex, timingSafeEqualHex } from "../auth/crypto";
import { HttpError } from "../types";

const STRIPE_BASE = "https://api.stripe.com/v1";

export async function stripeRequest<T = unknown>(
  secretKey: string,
  method: "GET" | "POST",
  path: string,
  payload?: Record<string, unknown>
): Promise<T> {
  if (!secretKey) {
    throw new HttpError(503, "STRIPE_SECRET_KEY is not configured on the Worker.");
  }

  const url = `${STRIPE_BASE}${path}`;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": "2024-04-10",
    },
  };
  if (method === "POST" && payload) {
    (init.headers as Record<string, string>)["Content-Type"] =
      "application/x-www-form-urlencoded";
    init.body = formEncode(payload);
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message = extractStripeError(data) ?? `${res.status} ${res.statusText}`;
    throw new HttpError(502, `Stripe error: ${message}`);
  }
  return data as T;
}

/**
 * Encodes a nested object into Stripe-friendly form body.
 * Supports primitives, arrays, and shallow objects (good enough for our use).
 */
export function formEncode(input: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    const k = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          parts.push(formEncode(v as Record<string, unknown>, `${k}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${k}[${i}]`)}=${encodeURIComponent(String(v))}`);
        }
      });
    } else if (typeof value === "object") {
      parts.push(formEncode(value as Record<string, unknown>, k));
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(value))}`);
    }
  }

  return parts.filter(Boolean).join("&");
}

function extractStripeError(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const err = (data as { error?: { message?: string } }).error;
  return err?.message ?? null;
}

// ─────────────────────────────────────────────────────────────────────
// Webhook signature verification (Stripe-Signature: t=...,v1=...)

export async function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300
): Promise<void> {
  if (!signatureHeader) {
    throw new HttpError(400, "Missing Stripe-Signature header.");
  }
  if (!secret) {
    throw new HttpError(503, "STRIPE_WEBHOOK_SECRET is not configured.");
  }

  const pairs = signatureHeader.split(",").map((p) => {
    const idx = p.indexOf("=");
    const k = idx >= 0 ? p.slice(0, idx).trim() : p.trim();
    const v = idx >= 0 ? p.slice(idx + 1).trim() : "";
    return [k, v] as const;
  });

  const timestamps = pairs.filter(([k]) => k === "t").map(([, v]) => v);
  const v1Signatures = pairs.filter(([k]) => k === "v1").map(([, v]) => v);

  const timestamp = timestamps[0];
  if (!timestamp || v1Signatures.length === 0) {
    throw new HttpError(400, "Malformed Stripe-Signature header.");
  }

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    throw new HttpError(400, "Stripe webhook timestamp outside tolerance.");
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = await hmacSha256Hex(secret, signedPayload);
  const ok = v1Signatures.some((sig) => timingSafeEqualHex(expected, sig));
  if (!ok) {
    throw new HttpError(400, "Invalid Stripe webhook signature.");
  }
}
