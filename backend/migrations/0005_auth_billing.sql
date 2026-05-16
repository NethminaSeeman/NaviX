-- 0005_auth_billing.sql
-- Adds authentication (users, sessions) and Stripe-backed subscriptions.
-- Every new user gets a 7-day trial set via trial_ends_at at signup time.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                    -- uuid v4
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  name TEXT,
  password_hash TEXT,                     -- nullable for google-only accounts
  google_sub TEXT UNIQUE,                 -- google "sub" claim
  trial_ends_at TEXT NOT NULL,            -- ISO timestamp; now + 7 days at signup
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,            -- sha256 of the raw bearer token
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT,                              -- 'monthly' | 'yearly'
  status TEXT NOT NULL,                   -- 'trialing'|'active'|'past_due'|'canceled'|'incomplete'
  current_period_end TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(stripe_customer_id);
