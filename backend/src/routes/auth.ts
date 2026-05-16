/**
 * /auth/* endpoints.
 *
 *   POST /auth/register   { email, password, name? }
 *   POST /auth/login      { email, password }
 *   POST /auth/google     { id_token }       // also accepts { credential }
 *   POST /auth/logout
 *   GET  /auth/me
 *
 * Handlers return plain JSON-serialisable values. The central router in
 * index.ts wraps them with CORS + Content-Type. Throw HttpError to signal
 * non-200s (mapped to JSON error responses by the router).
 *
 * The bearer token returned by register/login/google must be sent on
 * subsequent requests as `Authorization: Bearer <token>`.
 */

import { hashPassword, verifyPassword } from "../auth/crypto";
import { verifyGoogleIdToken } from "../auth/google";
import { computeAccess, loadSession } from "../auth/middleware";
import { createSession, deleteSession } from "../auth/session";
import {
  attachGoogleSub,
  createUser,
  ensureAuthSchema,
  findUserByEmail,
  findUserByGoogleSub,
  getSubscription,
  rowToUser,
} from "../auth/users";
import { Env, HttpError, Subscription, User } from "../types";

const TRIAL_DAYS = 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

interface RegisterBody {
  email?: string;
  password?: string;
  name?: string;
}

interface LoginBody {
  email?: string;
  password?: string;
}

interface GoogleBody {
  id_token?: string;
  credential?: string;
}

/**
 * Dispatches an /auth/* request. Returns:
 *   - a plain payload (router wraps in JSON + CORS), or
 *   - `null` when the path/method is not handled (router can 404 / try next).
 */
export async function dispatchAuth(
  env: Env,
  request: Request,
  url: URL
): Promise<unknown | null> {
  await ensureAuthSchema(env);
  const path = url.pathname;

  if (path === "/auth/register" && request.method === "POST") {
    return handleRegister(env, request);
  }
  if (path === "/auth/login" && request.method === "POST") {
    return handleLogin(env, request);
  }
  if (path === "/auth/google" && request.method === "POST") {
    return handleGoogle(env, request);
  }
  if (path === "/auth/logout" && request.method === "POST") {
    await deleteSession(env, request);
    return { ok: true };
  }
  if (path === "/auth/me" && request.method === "GET") {
    return handleMe(env, request);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────

async function handleRegister(env: Env, request: Request) {
  const body = (await safeJson(request)) as RegisterBody;
  const email = normaliseEmail(body.email);
  const password = (body.password ?? "").trim();
  const name = (body.name ?? "").trim() || null;

  if (!EMAIL_RE.test(email)) {
    throw new HttpError(400, "A valid email is required.");
  }
  if (password.length < MIN_PASSWORD) {
    throw new HttpError(
      400,
      `Password must be at least ${MIN_PASSWORD} characters.`
    );
  }

  const db = await ensureAuthSchema(env);
  const existing = await findUserByEmail(db, email);
  if (existing) {
    throw new HttpError(409, "An account with that email already exists.");
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser(db, {
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash,
    googleSub: null,
    trialEndsAt: trialEndDate(),
  });

  return buildAuthPayload(env, user);
}

async function handleLogin(env: Env, request: Request) {
  const body = (await safeJson(request)) as LoginBody;
  const email = normaliseEmail(body.email);
  const password = (body.password ?? "").trim();
  if (!email || !password) {
    throw new HttpError(400, "Email and password are required.");
  }

  const db = await ensureAuthSchema(env);
  const row = await findUserByEmail(db, email);
  if (!row || !row.password_hash) {
    throw new HttpError(401, "Incorrect email or password.");
  }
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) {
    throw new HttpError(401, "Incorrect email or password.");
  }

  return buildAuthPayload(env, rowToUser(row));
}

async function handleGoogle(env: Env, request: Request) {
  const body = (await safeJson(request)) as GoogleBody;
  const idToken = body.id_token ?? body.credential ?? "";
  const profile = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID ?? "");

  const db = await ensureAuthSchema(env);
  let row =
    (await findUserByGoogleSub(db, profile.sub)) ??
    (await findUserByEmail(db, profile.email));

  let user: User;
  if (row) {
    if (!row.google_sub) {
      await attachGoogleSub(db, row.id, profile.sub);
      row = { ...row, google_sub: profile.sub };
    }
    user = rowToUser(row);
  } else {
    user = await createUser(db, {
      id: crypto.randomUUID(),
      email: profile.email,
      name: profile.name,
      passwordHash: null,
      googleSub: profile.sub,
      trialEndsAt: trialEndDate(),
    });
  }

  return buildAuthPayload(env, user);
}

async function handleMe(env: Env, request: Request) {
  const session = await loadSession(env, request);
  if (!session) {
    throw new HttpError(401, "Authentication required.");
  }
  return {
    user: session.user,
    subscription: session.subscription,
    access: computeAccess(session.user, session.subscription),
  };
}

// ─────────────────────────────────────────────────────────────────────

async function buildAuthPayload(env: Env, user: User) {
  const db = await ensureAuthSchema(env);
  const subscription: Subscription | null = await getSubscription(db, user.id);
  const session = await createSession(env, user.id);
  return {
    user,
    subscription,
    access: computeAccess(user, subscription),
    token: session.token,
    token_expires_at: session.expires_at,
  };
}

function trialEndDate(): string {
  return new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function normaliseEmail(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

async function safeJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}
