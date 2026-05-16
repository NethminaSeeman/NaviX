/**
 * Session token lifecycle.
 *
 * The raw token is returned ONCE to the client (stored in localStorage as
 * "navix.token"). The Worker only persists its SHA-256 hash, so even a DB
 * leak does not let an attacker reuse sessions.
 */

import { Env, HttpError, User } from "../types";
import { randomToken, sha256Hex } from "./crypto";
import { findUserById, requireDb } from "./users";

const DEFAULT_TTL_DAYS = 30;

export interface IssuedSession {
  token: string;       // raw token (give to client once)
  expires_at: string;  // ISO timestamp
}

export async function createSession(
  env: Env,
  userId: string,
  ttlDays: number = DEFAULT_TTL_DAYS
): Promise<IssuedSession> {
  const db = requireDb(env);
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  await db
    .prepare(
      "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"
    )
    .bind(tokenHash, userId, expiresAt)
    .run();

  return { token, expires_at: expiresAt };
}

export async function resolveSession(
  env: Env,
  request: Request
): Promise<User | null> {
  const raw = readBearerToken(request);
  if (!raw) return null;

  const db = requireDb(env);
  const tokenHash = await sha256Hex(raw);
  const row = await db
    .prepare(
      "SELECT user_id, expires_at FROM sessions WHERE token_hash = ?"
    )
    .bind(tokenHash)
    .first<{ user_id: string; expires_at: string }>();

  if (!row) return null;
  if (Date.parse(row.expires_at) < Date.now()) {
    await deleteSessionByHash(db, tokenHash);
    return null;
  }

  return findUserById(db, row.user_id);
}

export async function deleteSession(env: Env, request: Request): Promise<void> {
  const raw = readBearerToken(request);
  if (!raw) return;
  const db = requireDb(env);
  const tokenHash = await sha256Hex(raw);
  await deleteSessionByHash(db, tokenHash);
}

export async function deleteAllSessionsForUser(
  env: Env,
  userId: string
): Promise<void> {
  const db = requireDb(env);
  await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
}

// ─────────────────────────────────────────────────────────────────────

async function deleteSessionByHash(
  db: D1Database,
  tokenHash: string
): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization") ?? request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function requireBearerToken(request: Request): string {
  const token = readBearerToken(request);
  if (!token) throw new HttpError(401, "Missing or invalid Authorization header.");
  return token;
}
