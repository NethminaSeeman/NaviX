import { hashPassword, sha256Hex, timingSafeEqualHex } from "../auth/crypto";
import { computeAccess, requireAdmin } from "../auth/middleware";
import { createSession, deleteAllSessionsForUser } from "../auth/session";
import {
  countAdminUsers,
  createUser,
  ensureAuthSchema,
  findUserByEmail,
  findUserById,
  getSubscription,
  listUsersForAdmin,
  updateUserByAdmin,
} from "../auth/users";
import { AccountStatus, Env, HttpError } from "../types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

interface BootstrapBody {
  token?: string;
  email?: string;
  password?: string;
  name?: string;
}

interface UserPatchBody {
  name?: string | null;
  is_admin?: boolean;
  account_status?: AccountStatus;
}

export async function dispatchAdmin(
  env: Env,
  request: Request,
  url: URL
): Promise<unknown | null> {
  await ensureAuthSchema(env);
  const path = url.pathname;

  if (path === "/admin/bootstrap" && request.method === "POST") {
    return handleBootstrap(env, request);
  }

  if (path === "/admin/users" && request.method === "GET") {
    return handleListUsers(env, request, url);
  }

  const userMatch = path.match(/^\/admin\/users\/([^/]+)$/);
  if (userMatch && request.method === "PATCH") {
    return handlePatchUser(env, request, decodeURIComponent(userMatch[1]));
  }

  return null;
}

async function handleBootstrap(env: Env, request: Request) {
  const expectedToken = (env.ADMIN_BOOTSTRAP_TOKEN ?? "").trim();
  if (!expectedToken) {
    throw new HttpError(503, "ADMIN_BOOTSTRAP_TOKEN is not configured.");
  }

  const body = (await safeJson(request)) as BootstrapBody;
  const providedToken = (body.token ?? "").trim();
  const email = normaliseEmail(body.email);
  const password = (body.password ?? "").trim();
  const name = (body.name ?? "").trim() || null;

  if (!(await validateBootstrapToken(providedToken, expectedToken))) {
    throw new HttpError(401, "Invalid bootstrap token.");
  }
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
  const admins = await countAdminUsers(db);
  if (admins > 0) {
    throw new HttpError(409, "Bootstrap already completed. Admin already exists.");
  }

  const existing = await findUserByEmail(db, email);
  if (existing) {
    throw new HttpError(
      409,
      "An account with that email already exists. Use another email for bootstrap."
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser(db, {
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash,
    googleSub: null,
    isAdmin: true,
    accountStatus: "active",
    trialEndsAt: trialEndDate(),
  });

  const subscription = await getSubscription(db, user.id);
  const session = await createSession(env, user.id);
  return {
    ok: true,
    user,
    subscription,
    access: computeAccess(user, subscription),
    token: session.token,
    token_expires_at: session.expires_at,
  };
}

async function handleListUsers(env: Env, request: Request, url: URL) {
  await requireAdmin(env, request);
  const db = await ensureAuthSchema(env);

  const query = (url.searchParams.get("query") ?? "").trim();
  const status = parseStatusFilter(url.searchParams.get("status"));
  const limit = parseIntInRange(url.searchParams.get("limit"), 50, 1, 200);
  const offset = parseIntInRange(url.searchParams.get("offset"), 0, 0, 100_000);

  const result = await listUsersForAdmin(db, {
    query,
    status,
    limit,
    offset,
  });

  return {
    total: result.total,
    limit,
    offset,
    data: result.users,
  };
}

async function handlePatchUser(env: Env, request: Request, targetUserId: string) {
  const actor = await requireAdmin(env, request);
  const db = await ensureAuthSchema(env);
  const target = await findUserById(db, targetUserId);
  if (!target) {
    throw new HttpError(404, "User not found.");
  }

  const body = (await safeJson(request)) as UserPatchBody;
  const updates: {
    name?: string | null;
    isAdmin?: boolean;
    accountStatus?: AccountStatus;
  } = {};

  if ("name" in body) {
    const name = body.name;
    if (name !== null && typeof name !== "string") {
      throw new HttpError(400, "name must be a string or null.");
    }
    updates.name = name === null ? null : name.trim() || null;
  }

  if ("is_admin" in body) {
    if (typeof body.is_admin !== "boolean") {
      throw new HttpError(400, "is_admin must be a boolean.");
    }
    updates.isAdmin = body.is_admin;
  }

  if ("account_status" in body) {
    if (body.account_status !== "active" && body.account_status !== "suspended") {
      throw new HttpError(400, "account_status must be 'active' or 'suspended'.");
    }
    updates.accountStatus = body.account_status;
  }

  if (
    updates.name === undefined &&
    updates.isAdmin === undefined &&
    updates.accountStatus === undefined
  ) {
    throw new HttpError(400, "At least one updatable field is required.");
  }

  if (actor.id === target.id) {
    if (updates.isAdmin === false) {
      throw new HttpError(400, "You cannot remove your own admin access.");
    }
    if (updates.accountStatus === "suspended") {
      throw new HttpError(400, "You cannot suspend your own account.");
    }
  }

  if (target.is_admin && updates.isAdmin === false) {
    const adminCount = await countAdminUsers(db);
    if (adminCount <= 1) {
      throw new HttpError(
        400,
        "Cannot remove the last admin. Create another admin first."
      );
    }
  }

  const updated = await updateUserByAdmin(db, target.id, updates);
  if (!updated) {
    throw new HttpError(404, "User not found.");
  }

  if (updated.account_status === "suspended") {
    await deleteAllSessionsForUser(env, updated.id);
  }

  return { ok: true, user: updated };
}

function parseStatusFilter(input: string | null): AccountStatus | "all" {
  const raw = (input ?? "").trim().toLowerCase();
  if (!raw || raw === "all") return "all";
  if (raw === "active" || raw === "suspended") return raw;
  throw new HttpError(400, "status must be one of: all, active, suspended.");
}

function parseIntInRange(
  input: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  if (!input || input.trim() === "") return fallback;
  const value = Number(input);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new HttpError(400, "Pagination values must be integers.");
  }
  if (value < min || value > max) {
    throw new HttpError(400, `Pagination value must be between ${min} and ${max}.`);
  }
  return value;
}

function normaliseEmail(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function trialEndDate(): string {
  const TRIAL_DAYS = 7;
  return new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

async function validateBootstrapToken(
  provided: string,
  expected: string
): Promise<boolean> {
  if (!provided) return false;
  const [providedHash, expectedHash] = await Promise.all([
    sha256Hex(provided),
    sha256Hex(expected),
  ]);
  return timingSafeEqualHex(providedHash, expectedHash);
}

async function safeJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}
