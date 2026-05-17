/**
 * Google ID-token verification.
 *
 * Uses the public `tokeninfo` endpoint, which validates the JWT signature
 * server-side at Google and returns the decoded claims. No JWKS handling
 * needed on our side, no SDK dependency.
 *
 * We additionally re-verify:
 *   - aud  == configured Web Client ID
 *   - iss  == "https://accounts.google.com" or "accounts.google.com"
 *   - exp  > now
 *   - email_verified == "true" (when present)
 */

import { HttpError } from "../types";

interface TokenInfoResponse {
  iss?: string;
  azp?: string;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  exp?: string | number;
  error_description?: string;
  error?: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
  email_verified: boolean;
}

const VALID_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

export async function verifyGoogleIdToken(
  idToken: string,
  expectedClientId: string
): Promise<GoogleProfile> {
  if (!idToken) throw new HttpError(400, "Google id_token is required.");
  if (!expectedClientId) {
    throw new HttpError(
      503,
      "GOOGLE_CLIENT_ID is not configured on the Worker."
    );
  }

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const detail = await res.text();
    throw new HttpError(401, `Google token verification failed: ${truncate(detail, 200)}`);
  }

  const info = (await res.json()) as TokenInfoResponse;
  if (info.error) {
    throw new HttpError(401, `Google: ${info.error_description ?? info.error}`);
  }
  if (!info.iss || !VALID_ISSUERS.has(info.iss)) {
    throw new HttpError(401, `Invalid Google token issuer: ${info.iss ?? "missing"}`);
  }
  const audOk = info.aud === expectedClientId;
  const azpOk = info.azp === expectedClientId;
  if (!audOk && !azpOk) {
    throw new HttpError(401, "Google token audience mismatch.");
  }
  const exp = Number(info.exp);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) {
    throw new HttpError(401, "Google token has expired.");
  }
  if (!info.sub || !info.email) {
    throw new HttpError(401, "Google token is missing sub/email claims.");
  }

  const emailVerified =
    info.email_verified === true ||
    info.email_verified === "true" ||
    info.email_verified === undefined;
  if (!emailVerified) {
    throw new HttpError(401, "Google account email is not verified.");
  }

  return {
    sub: info.sub,
    email: info.email,
    name: info.name ?? info.given_name ?? null,
    picture: info.picture ?? null,
    email_verified: true,
  };
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}...` : s;
}
