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
fallback:

```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=
WEATHER_API_KEY=
```

`.dev.vars` is gitignored. Without an LLM key the Worker still boots but
`/chat` returns HTTP 503.

## 2. Build the D1 schema + seed (138 places)

```powershell
# Apply 0001..0003 (schema) and 0004 (138 INSERTs) to the remote DB
npm run d1:seed:generate          # regenerates 0004_seed_rich_places.sql from JSON
npm run d1:migrate:remote         # applies all pending migrations to navix-db
```

Verify the seed worked:

```powershell
npx wrangler d1 execute navix-db --remote --command "SELECT COUNT(*) AS n FROM places;"
# Expect: n = 138
```

> If you ever change [`../data/production_srilanka_db.json`](../data/production_srilanka_db.json),
> rerun `npm run d1:seed:generate` and `npm run d1:migrate:remote` — a new
> migration file will be generated/overwritten and the table will be
> replaced (`DELETE FROM places;` is included).

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
curl "https://navix-api.<your-subdomain>.workers.dev/nearby?lat=6.9271&lon=79.8612&limit=3"
```

`/health` should report `d1: ok (138 places)` and `openai: configured`.

## 5. Wire the frontend (Cloudflare Pages)

In the Cloudflare dashboard:

1. **Workers & Pages → navix-frontend → Settings → Environment variables**
2. Add (or update) for **Production** and **Preview**:
   - `VITE_API_BASE_URL` = `https://navix-api.<your-subdomain>.workers.dev`
3. **Deployments → Retry deployment** on the latest build (or push any commit)
   so the new env var is baked in.

That is the only frontend change needed. The API contract matches the old
FastAPI shape, so `frontend/src/services/ceygoApi.js` does not need edits.

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
