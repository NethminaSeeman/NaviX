#!/bin/sh
set -e

# ─────────────────────────────────────────────────────────────────────────────
# Generate .dev.vars from Docker environment variables.
# Wrangler reads this file to inject secrets into the local Worker runtime.
# ─────────────────────────────────────────────────────────────────────────────
cat > /app/.dev.vars << EOF
OPENAI_API_KEY=${OPENAI_API_KEY:-}
GEMINI_API_KEY=${GEMINI_API_KEY:-}
WEATHER_API_KEY=${WEATHER_API_KEY:-}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
ADMIN_BOOTSTRAP_TOKEN=${ADMIN_BOOTSTRAP_TOKEN:-}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-}
STRIPE_PRICE_MONTHLY=${STRIPE_PRICE_MONTHLY:-}
STRIPE_PRICE_YEARLY=${STRIPE_PRICE_YEARLY:-}
APP_BASE_URL=${APP_BASE_URL:-http://localhost:5173}
EOF

cd /app/backend

echo "NaviX ▶ applying D1 migrations (local)..."
# Apply migrations to the local Miniflare D1 instance.
# Suppress errors on re-runs (tables already exist).
node /app/node_modules/.bin/wrangler d1 migrations apply DB --local 2>/dev/null || true

echo "NaviX ▶ starting Wrangler dev server on 0.0.0.0:8787 ..."
exec node /app/node_modules/.bin/wrangler dev --ip 0.0.0.0 --port 8787
