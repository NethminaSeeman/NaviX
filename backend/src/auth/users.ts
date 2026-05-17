/**
 * D1 access for the `users` and `subscriptions` tables. Returns
 * `User` / `Subscription` objects in the public shape declared in types.ts
 * (never raw DB rows).
 */

import {
  AccountStatus,
  Env,
  HttpError,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  User,
} from "../types";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
  google_sub: string | null;
  is_admin: number | boolean | null;
  account_status: string | null;
  trial_ends_at: string;
  created_at: string;
}

interface SubscriptionRow {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  status: string;
  current_period_end: string | null;
  updated_at: string;
}

export function requireDb(env: Env): D1Database {
  if (!env.DB) {
    throw new HttpError(
      503,
      "D1 binding 'DB' is not configured. Check wrangler.toml."
    );
  }
  return env.DB;
}

let authSchemaInitPromise: Promise<void> | null = null;

export async function ensureAuthSchema(env: Env): Promise<D1Database> {
  const db = requireDb(env);
  if (!authSchemaInitPromise) {
    authSchemaInitPromise = initAuthSchema(db).catch((err) => {
      authSchemaInitPromise = null;
      throw err;
    });
  }
  await authSchemaInitPromise;
  return db;
}

async function initAuthSchema(db: D1Database): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      name TEXT,
      password_hash TEXT,
      google_sub TEXT UNIQUE,
      is_admin INTEGER NOT NULL DEFAULT 0,
      account_status TEXT NOT NULL DEFAULT 'active',
      trial_ends_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub)",
    `CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)",
    `CREATE TABLE IF NOT EXISTS subscriptions (
      user_id TEXT PRIMARY KEY,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT UNIQUE,
      plan TEXT,
      status TEXT NOT NULL,
      current_period_end TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    "CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(stripe_customer_id)",
  ];

  for (const statement of statements) {
    await db.prepare(statement).run();
  }

  await ensureUsersTableColumns(db);
}

async function ensureUsersTableColumns(db: D1Database): Promise<void> {
  const columns = await db
    .prepare("PRAGMA table_info(users)")
    .all<{ name: string }>();
  const names = new Set((columns.results ?? []).map((col) => col.name));

  if (!names.has("is_admin")) {
    await db
      .prepare("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0")
      .run();
  }

  if (!names.has("account_status")) {
    await db
      .prepare(
        "ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'"
      )
      .run();
  }

  await db
    .prepare(
      "UPDATE users SET account_status = 'active' WHERE account_status IS NULL OR account_status = ''"
    )
    .run();
}

// ─────────────────────────────────────────────────────────────────────
// Users

export async function findUserById(
  db: D1Database,
  id: string
): Promise<User | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first<UserRow>();
  return row ? rowToUser(row) : null;
}

export async function findUserByEmail(
  db: D1Database,
  email: string
): Promise<UserRow | null> {
  return db
    .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
    .bind(email)
    .first<UserRow>();
}

export async function findUserByGoogleSub(
  db: D1Database,
  sub: string
): Promise<UserRow | null> {
  return db
    .prepare("SELECT * FROM users WHERE google_sub = ?")
    .bind(sub)
    .first<UserRow>();
}

export async function createUser(
  db: D1Database,
  params: {
    id: string;
    email: string;
    name: string | null;
    passwordHash: string | null;
    googleSub: string | null;
    trialEndsAt: string;
    isAdmin?: boolean;
    accountStatus?: AccountStatus;
  }
): Promise<User> {
  await db
    .prepare(
      `INSERT INTO users (
        id, email, name, password_hash, google_sub, is_admin, account_status, trial_ends_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      params.id,
      params.email,
      params.name,
      params.passwordHash,
      params.googleSub,
      params.isAdmin ? 1 : 0,
      params.accountStatus ?? "active",
      params.trialEndsAt
    )
    .run();
  const fresh = await findUserById(db, params.id);
  if (!fresh) throw new HttpError(500, "User insert succeeded but row missing.");
  return fresh;
}

export async function attachGoogleSub(
  db: D1Database,
  userId: string,
  googleSub: string
): Promise<void> {
  await db
    .prepare("UPDATE users SET google_sub = ? WHERE id = ?")
    .bind(googleSub, userId)
    .run();
}

export async function countAdminUsers(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE is_admin = 1")
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function listUsersForAdmin(
  db: D1Database,
  params: {
    query?: string;
    status?: AccountStatus | "all";
    limit: number;
    offset: number;
  }
): Promise<{ total: number; users: User[] }> {
  const where: string[] = [];
  const binds: Array<string | number> = [];

  const query = (params.query ?? "").trim();
  if (query) {
    where.push("(email LIKE ? COLLATE NOCASE OR IFNULL(name, '') LIKE ? COLLATE NOCASE)");
    const q = `%${query}%`;
    binds.push(q, q);
  }

  if (params.status && params.status !== "all") {
    where.push("account_status = ?");
    binds.push(params.status);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const rowsQuery = db.prepare(
    `SELECT * FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  );
  const rows = await rowsQuery
    .bind(...binds, params.limit, params.offset)
    .all<UserRow>();

  const countQuery = db.prepare(`SELECT COUNT(*) AS n FROM users ${whereSql}`);
  const countRow =
    binds.length > 0
      ? await countQuery.bind(...binds).first<{ n: number }>()
      : await countQuery.first<{ n: number }>();

  return {
    total: countRow?.n ?? 0,
    users: (rows.results ?? []).map(rowToUser),
  };
}

export async function updateUserByAdmin(
  db: D1Database,
  userId: string,
  updates: {
    name?: string | null;
    isAdmin?: boolean;
    accountStatus?: AccountStatus;
  }
): Promise<User | null> {
  const current = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(userId)
    .first<UserRow>();
  if (!current) return null;

  const nextName = updates.name === undefined ? current.name : updates.name;
  const nextIsAdmin =
    updates.isAdmin === undefined ? Boolean(current.is_admin) : updates.isAdmin;
  const nextAccountStatus =
    updates.accountStatus ?? normaliseAccountStatus(current.account_status);

  await db
    .prepare(
      "UPDATE users SET name = ?, is_admin = ?, account_status = ? WHERE id = ?"
    )
    .bind(nextName, nextIsAdmin ? 1 : 0, nextAccountStatus, userId)
    .run();

  return findUserById(db, userId);
}

// ─────────────────────────────────────────────────────────────────────
// Subscriptions

export async function getSubscription(
  db: D1Database,
  userId: string
): Promise<Subscription | null> {
  const row = await db
    .prepare("SELECT * FROM subscriptions WHERE user_id = ?")
    .bind(userId)
    .first<SubscriptionRow>();
  return row ? rowToSubscription(row) : null;
}

export async function upsertSubscription(
  db: D1Database,
  sub: {
    userId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    plan: SubscriptionPlan | null;
    status: SubscriptionStatus;
    currentPeriodEnd: string | null;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO subscriptions (
         user_id, stripe_customer_id, stripe_subscription_id,
         plan, status, current_period_end, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         stripe_customer_id     = excluded.stripe_customer_id,
         stripe_subscription_id = excluded.stripe_subscription_id,
         plan                   = excluded.plan,
         status                 = excluded.status,
         current_period_end     = excluded.current_period_end,
         updated_at             = CURRENT_TIMESTAMP`
    )
    .bind(
      sub.userId,
      sub.stripeCustomerId,
      sub.stripeSubscriptionId,
      sub.plan,
      sub.status,
      sub.currentPeriodEnd
    )
    .run();
}

export async function findSubscriptionByStripeCustomerId(
  db: D1Database,
  stripeCustomerId: string
): Promise<Subscription | null> {
  const row = await db
    .prepare("SELECT * FROM subscriptions WHERE stripe_customer_id = ?")
    .bind(stripeCustomerId)
    .first<SubscriptionRow>();
  return row ? rowToSubscription(row) : null;
}

// ─────────────────────────────────────────────────────────────────────
// Mappers

export function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    is_admin: Boolean(row.is_admin),
    account_status: normaliseAccountStatus(row.account_status),
    trial_ends_at: row.trial_ends_at,
    created_at: row.created_at,
    has_password: Boolean(row.password_hash),
    has_google: Boolean(row.google_sub),
  };
}

function rowToSubscription(row: SubscriptionRow): Subscription {
  return {
    user_id: row.user_id,
    stripe_customer_id: row.stripe_customer_id,
    stripe_subscription_id: row.stripe_subscription_id,
    plan: (row.plan as SubscriptionPlan | null) ?? null,
    status: row.status as SubscriptionStatus,
    current_period_end: row.current_period_end,
    updated_at: row.updated_at,
  };
}

function normaliseAccountStatus(value: string | null | undefined): AccountStatus {
  return value === "suspended" ? "suspended" : "active";
}
