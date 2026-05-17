/**
 * Auth + access middleware.
 *
 * - `requireUser` returns the authenticated User or throws 401.
 * - `requireActiveAccess` additionally verifies the user has an active
 *   trial OR a paid subscription, throwing 402 with body
 *   `{error:"subscription_required", trial_expired:true|false}` otherwise.
 * - `loadSession` returns `{user, subscription}` for use by /auth/me.
 * - `computeAccess` is a pure helper used by /auth/me and the gates.
 */

import {
  AccessSummary,
  AuthSession,
  Env,
  HttpError,
  Subscription,
  SubscriptionStatus,
  User,
} from "../types";
import { resolveSession } from "./session";
import { getSubscription, requireDb } from "./users";

const PAID_STATUSES: SubscriptionStatus[] = ["active", "trialing", "past_due"];

export async function requireUser(env: Env, request: Request): Promise<User> {
  const user = await resolveSession(env, request);
  if (!user) {
    throw new HttpError(401, "Authentication required.");
  }
  ensureUserIsActive(user);
  return user;
}

export async function requireAdmin(env: Env, request: Request): Promise<User> {
  const user = await requireUser(env, request);
  if (!user.is_admin) {
    throw new HttpError(403, "Admin access required.");
  }
  return user;
}

export async function loadSession(env: Env, request: Request): Promise<AuthSession | null> {
  const user = await resolveSession(env, request);
  if (!user) return null;
  ensureUserIsActive(user);
  const db = requireDb(env);
  const subscription = await getSubscription(db, user.id);
  return { user, subscription };
}

export async function requireActiveAccess(
  env: Env,
  request: Request
): Promise<AuthSession> {
  const session = await loadSession(env, request);
  if (!session) {
    throw new HttpError(401, "Authentication required.");
  }
  const access = computeAccess(session.user, session.subscription);
  if (!access.allowed) {
    throw new HttpError(402, "subscription_required");
  }
  return session;
}

export function computeAccess(
  user: User,
  subscription: Subscription | null
): AccessSummary {
  const now = Date.now();
  const trialEnd = Date.parse(user.trial_ends_at);
  const trialActive = Number.isFinite(trialEnd) && trialEnd > now;
  const trialDaysLeft = trialActive
    ? Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
    : 0;

  const subActive =
    !!subscription && PAID_STATUSES.includes(subscription.status);

  let status: AccessSummary["status"] = "none";
  if (subscription) status = subscription.status;
  else if (trialActive) status = "trialing";
  else status = "expired";

  return {
    allowed: trialActive || subActive,
    is_paid: subActive,
    is_trial: trialActive && !subActive,
    trial_days_left: trialDaysLeft,
    trial_ends_at: user.trial_ends_at,
    plan: subscription?.plan ?? null,
    status,
  };
}

function ensureUserIsActive(user: User): void {
  if (user.account_status === "suspended") {
    throw new HttpError(403, "Account suspended.");
  }
}
