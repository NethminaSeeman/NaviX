# Pointing the Frontend at the Cloudflare Worker Backend

The NaviX backend runs on Cloudflare Workers (`navix-api`). Set **`VITE_API_BASE_URL`**
to that Worker URL so the React app can reach it.

## What changed

- `VITE_API_BASE_URL` points Axios at the Worker (see [`src/services/apiClient.js`](./src/services/apiClient.js)).
- Authenticated requests send **`Authorization: Bearer <token>`** from
  [`authStorage.js`](./src/services/authStorage.js) after login/register.
- Gated routes (`/chat`, `/nearby` on the Worker) require an **active 7-day trial**
  or **Stripe subscription**; otherwise the API returns **402** and the UI sends
  you to `/pricing`.
- **`VITE_GOOGLE_CLIENT_ID`** enables “Continue with Google” (same OAuth Web
  Client ID as Worker secret `GOOGLE_CLIENT_ID`).

## Local development

```powershell
# Terminal 1 — boot the Worker
cd backend
npm run d1:migrate:local
npm run dev                # http://127.0.0.1:8787

# Terminal 2 — boot the frontend
cd frontend
copy .env.example .env.local        # if you do not already have one
# ensure .env.local contains:
#   VITE_API_BASE_URL=http://127.0.0.1:8787
#   VITE_GOOGLE_CLIENT_ID=<same as Worker GOOGLE_CLIENT_ID>
npm run dev                # http://localhost:5173
```

Smoke-test:

```powershell
curl http://127.0.0.1:8787/health
```

Should report `d1: ok (138 places)` and `openai: configured`.

## Production (Cloudflare Pages)

After deploying the Worker (`backend/DEPLOY_CLOUDFLARE.md`), it prints a URL
such as `https://navix-api.<your-subdomain>.workers.dev`.

1. Cloudflare dashboard -> **Workers & Pages** -> **navix-frontend**
2. **Settings** -> **Environment variables**
3. For both **Production** and **Preview** environments add/update:
   - **`VITE_API_BASE_URL`** → `https://navix-api.<your-subdomain>.workers.dev`
   - **`VITE_GOOGLE_CLIENT_ID`** → your OAuth Web Client ID (Google Console)
   - **`VITE_GOOGLE_MAPS_API_KEY`** → unchanged
4. **Deployments** -> click **Retry deployment** on the most recent build
   (or push any new commit). Vite bakes env vars in at build time, so a
   redeploy is required for the new URL to take effect.

## Validation checklist

After the Pages rebuild finishes:

- Open the deployed site in an incognito window.
- Open DevTools -> **Network**. The chat request should now go to
  `https://navix-api.<your-subdomain>.workers.dev/chat`, **not**
  `localhost:8000` and **not** the old `*.onrender.com` URL.
- The response payload should include `answer`, `voice_script`, `intent`,
  `weather`, `nearby`, and `matched_location_coordinates` (rich schema).
- No `Mixed Content` warning in the console.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Network Error` in chat box | Confirm `VITE_API_BASE_URL` in Pages dashboard and that the latest deployment used it. |
| `Cannot reach NaviX backend at http://localhost:8000` | The Vite bundle was built before the env var change — trigger a new Pages deploy. |
| 503 from `/chat` | The Worker has no LLM key. Add `OPENAI_API_KEY` (or `GEMINI_API_KEY`) via `npm run cf:secrets` in `backend/`. |
| 503 from `/billing/checkout` | Configure Stripe price IDs and `STRIPE_SECRET_KEY` on the Worker (`backend/DEPLOY_CLOUDFLARE.md`). |
| Google sign-in disabled | Set `VITE_GOOGLE_CLIENT_ID` on Pages and redeploy; set `GOOGLE_CLIENT_ID` on the Worker. |
| `402` / sent to pricing | Trial ended or no subscription — subscribe on `/pricing` or use an account with access. |
| CORS error | The Worker already returns `Access-Control-Allow-Origin: *`. Double-check the URL is `https://…workers.dev` exactly (no trailing slash). |
