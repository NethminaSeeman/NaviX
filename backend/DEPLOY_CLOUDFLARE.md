# NaviX Backend — Cloudflare Deploy Runbook

This is the end-to-end deploy guide for the NaviX Worker (`navix-api`) and
its D1 database (`navix-db`). Everything below runs on Windows PowerShell
from the `backend/` folder unless noted.

## 0. One-time prerequisites

```powershell
cd backend
npm install
npx wrangler login            # opens browser, lets Wrangler talk to your account
npx wrangler whoami           # confirms the right Cloudflare account
```

The Worker name (`navix-api`), account id, and D1 binding are already wired
in [`wrangler.toml`](./wrangler.toml). You should not need to edit it.

## 1. Configure local secrets

```powershell
copy .dev.vars.example .dev.vars
notepad .dev.vars
```

Fill in (at minimum) **one** LLM key. OpenAI is preferred, Gemini is a free
fallback. For **login, Google sign-in, and Stripe billing**, copy every key from
[`.dev.vars.example`](./.dev.vars.example): `GOOGLE_CLIENT_ID`, `STRIPE_*`,
`APP_BASE_URL`, plus the LLM and optional weather keys.

```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=
WEATHER_API_KEY=
GOOGLE_CLIENT_ID=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_MONTHLY=
STRIPE_PRICE_YEARLY=
APP_BASE_URL=http://localhost:5173
```

`.dev.vars` is gitignored. Without an LLM key the Worker still boots but
`/chat` returns HTTP 503. Without Stripe price IDs, `/billing/checkout` returns
503 until configured.

## 2. Build the D1 schema + seed (138 places + auth tables)

```powershell
# Apply migrations 0001–0005 (places + users/sessions/subscriptions) remotely
npm run d1:seed:generate          # regenerates 0004_seed_rich_places.sql from JSON
npm run d1:migrate:remote         # applies any pending migrations to navix-db
```

Migration **`0005_auth_billing.sql`** creates `users`, `sessions`, and
`subscriptions` for email/Google login and Stripe sync. It uses `CREATE TABLE IF
NOT EXISTS`, so it is safe on databases that already ran an older dump.

Verify the places seed worked:

```powershell
npx wrangler d1 execute navix-db --remote --command "SELECT COUNT(*) AS n FROM places;"
# Expect: n = 138
```

> If you ever change [`../data/production_srilanka_db.json`](../data/production_srilanka_db.json),
> rerun `npm run d1:seed:generate` and `npm run d1:migrate:remote` — a new
> migration file will be generated/overwritten and the table will be
> replaced (`DELETE FROM places;` is included).

## Auth & billing (Stripe + Google)

### Stripe Dashboard

1. **Products** → create two recurring prices (test mode is fine initially):
   - **NaviX Monthly** — USD **8** / month → copy **Price ID** → `STRIPE_PRICE_MONTHLY`
   - **NaviX Yearly** — USD **60** / year → copy **Price ID** → `STRIPE_PRICE_YEARLY`
2. **Developers → Webhooks** → **Add endpoint**:
   - URL: `https://navix-api.<your-subdomain>.workers.dev/billing/webhook`
   - Events (minimum): `checkout.session.completed`,
     `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
3. Copy the webhook **Signing secret** → `STRIPE_WEBHOOK_SECRET`
4. **Developers → API keys** → Secret key → `STRIPE_SECRET_KEY`

### Google Sign-In (OAuth 2.0 Web client)

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs &
   Services** → **Credentials** → **Create credentials** → **OAuth client ID**
   → Application type **Web application**.
2. **Authorised JavaScript origins**: your Pages URL(s) and local dev, e.g.
   `http://localhost:5173`, `https://<project>.pages.dev`.
3. Copy the **Client ID** into:
   - Worker secret **`GOOGLE_CLIENT_ID`** (same value as in `.dev.vars`)
   - Cloudflare Pages env **`VITE_GOOGLE_CLIENT_ID`** (so the browser can load
     Google Identity Services)

### App URL for Stripe redirects

Set **`APP_BASE_URL`** to your **frontend** origin (not the Worker), e.g.
`https://<project>.pages.dev`, so Checkout success/cancel URLs land on
`/billing/success` and `/billing/cancel`.

## 3. Push secrets to the Worker

```powershell
npm run cf:secrets
```

This reads `.dev.vars` and runs `wrangler secret put <NAME>` for every
non-empty value. It is safe to re-run — it overwrites the same secret
names. Empty keys are skipped.

## 4. Deploy the Worker

```powershell
npm run deploy
```

Wrangler prints the public URL on success, e.g.

```
Published navix-api  https://navix-api.<your-subdomain>.workers.dev
```

Smoke test it:

```powershell
curl https://navix-api.<your-subdomain>.workers.dev/health
curl "https://navix-api.<your-subdomain>.workers.dev/weather?lat=6.9271&lon=79.8612"
```

`/health` should report `d1: ok (138 places)` and `openai: configured`. Note:
`/nearby` and `/chat` require a signed-in user with an active trial or
subscription — use the frontend or send `Authorization: Bearer <token>` from
`/auth/login`.

## 5. Wire the frontend (Cloudflare Pages)

In the Cloudflare dashboard:

1. **Workers & Pages → navix-frontend → Settings → Environment variables**
2. Add (or update) for **Production** and **Preview**:
   - **`VITE_API_BASE_URL`** = `https://navix-api.<your-subdomain>.workers.dev`
   - **`VITE_GOOGLE_CLIENT_ID`** = same OAuth Web Client ID as Worker `GOOGLE_CLIENT_ID`
   - **`VITE_GOOGLE_MAPS_API_KEY`** = your Maps JavaScript API key (unchanged)
3. **Deployments → Retry deployment** on the latest build (or push any commit)
   so Vite bakes the vars into the bundle.

The chat payload contract is unchanged; the app now sends **`Authorization:
Bearer …`** for gated routes (`/chat`, `/nearby`, billing). See
[`frontend/CLOUDFLARE_BACKEND.md`](../frontend/CLOUDFLARE_BACKEND.md) and
[`frontend/.env.example`](../frontend/.env.example).

## 6. Daily workflow

| Goal | Command |
|------|---------|
| Local dev (Worker + D1) | `npm run dev` |
| Apply migrations locally | `npm run d1:migrate:local` |
| Regenerate seed from JSON | `npm run d1:seed:generate` |
| Typecheck | `npm run typecheck` |
| Push new code to prod | `npm run deploy` |
| Rotate a secret | edit `.dev.vars`, then `npm run cf:secrets` |
| Apply migrations to prod | `npm run d1:migrate:remote` |

## Troubleshooting

- **`402 subscription_required` after login** — trial expired and no active
  Stripe subscription; open **`/pricing`** and complete Checkout (or check
  Stripe webhook delivery in the Dashboard → Webhooks → recent attempts).
- **Google button shows “not configured”** — set `VITE_GOOGLE_CLIENT_ID` on
  Pages and redeploy; set `GOOGLE_CLIENT_ID` on the Worker via `npm run cf:secrets`.
- **`Invalid Stripe webhook signature`** — endpoint URL must match the Worker
  route exactly; rotate and re-copy `STRIPE_WEBHOOK_SECRET` if you recreated the
  webhook.
- **`Authentication error` on `npx wrangler`** — rerun `npx wrangler login`.
- **`/chat` returns 503 "No LLM configured"** — set `OPENAI_API_KEY` (or
  `GEMINI_API_KEY`) in `.dev.vars`, rerun `npm run cf:secrets`, redeploy.
- **`/health` reports `d1: missing`** — check that
  [`wrangler.toml`](./wrangler.toml) still has the `[[d1_databases]]` block
  with `binding = "DB"` and the correct `database_id`.
- **CORS error from the browser** — confirm the Worker URL in
  `VITE_API_BASE_URL` is the exact `https://…workers.dev` host and that the
  Pages build was redeployed after the env var change.
- **Mixed-content warning** — frontend must use the `https` Worker URL, not
  `http://localhost:8787`.
