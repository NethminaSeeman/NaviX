# Pointing the Frontend at the Cloudflare Worker Backend

The NaviX backend now lives on Cloudflare Workers (`navix-api`) instead of a
local FastAPI server. The frontend only needs a single environment-variable
change to talk to it — no code edits.

## What changed

- `VITE_API_BASE_URL` is the **only** value the frontend reads to call the
  backend. It is consumed by [`src/services/ceygoApi.js`](./src/services/ceygoApi.js)
  via [`src/utils/constants.js`](./src/utils/constants.js).
- All API paths and JSON shapes are identical to the old FastAPI backend
  (`/chat`, `/weather`, `/nearby`, `/health`), so nothing else in
  `frontend/src` needs to move.

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
   - **Variable name**: `VITE_API_BASE_URL`
   - **Value**: `https://navix-api.<your-subdomain>.workers.dev`
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
| CORS error | The Worker already returns `Access-Control-Allow-Origin: *`. Double-check the URL is `https://…workers.dev` exactly (no trailing slash). |
