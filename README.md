# NaviX

Voice-guided travel companion for exploring Sri Lanka — interactive maps, live weather, and AI-powered historical context powered by Google Gemini.

## Features

- **Live map** — Google Maps with nearby heritage sites
- **AI tour guide** — Multi-agent Gemini pipeline (intent, weather, heritage, voice script)
- **Voice interaction** — Speech recognition and text-to-speech for hands-free touring
- **Weather-aware tips** — OpenWeather integration with location-based advice
- **Destination discovery** — Browse and search Sri Lankan landmarks
- **Responsive UI** — Vite + React with dark mode and mobile navigation

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite, React 18, React Router, Tailwind CSS, Framer Motion |
| Backend | Cloudflare Workers, TypeScript |
| AI | Google Gemini 1.5 Flash (structured JSON) |
| Database | Cloudflare D1 (SQLite) |
| Maps | Google Maps JavaScript API |
| Weather | OpenWeatherMap |
| Hosting | Cloudflare Pages (frontend) + Workers (API) |
| CI/CD | GitHub Actions |

## Project structure

```
NaviX/
├── frontend/          # Vite + React SPA
│   ├── src/
│   │   ├── pages/     # Home, Map, Chat, Destinations, About, Contact
│   │   ├── components/
│   │   ├── context/   # Auth, Chat, Location, Weather, Theme
│   │   ├── hooks/     # Geolocation, speech, API retry
│   │   └── services/  # API client (ceygoApi.js)
│   └── public/        # SPA redirects for Cloudflare Pages
├── backend/           # Cloudflare Worker API
│   ├── src/
│   │   ├── index.ts   # Routes and handlers
│   │   ├── ai.ts      # Gemini multi-agent pipeline
│   │   ├── db.ts      # Cloudflare D1 queries (places + geo)
│   │   └── weather.ts
│   ├── migrations/    # D1 schema + seed SQL
│   └── scripts/       # Wrangler deploy, seed conversion, secret sync
├── data/
│   ├── mongodb/       # Legacy/exported place documents (migration source)
│   └── scripts/       # Data processing (planned)
└── .github/workflows/ # Deploy on push to main / developer
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Cloudflare account](https://dash.cloudflare.com/) (Pages + Workers)
- [Google AI Studio](https://aistudio.google.com/) API key (Gemini)
- [Google Cloud](https://console.cloud.google.com/) Maps API key
- [OpenWeather](https://openweathermap.org/api) API key (optional)

## Quick start (local)

From the repo root:

```bash
npm install
```

### 1. Backend

```bash
cd backend
cp .dev.vars.example .dev.vars   # fill in secrets (see below)
npm run dev
```

API runs at **http://localhost:8787**

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm run dev
```

App runs at **http://localhost:5173**

### Root scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend dev server |
| `npm run backend:dev` | Start Worker locally |
| `npm run frontend:build` | Build frontend for production |
| `npm run deploy:backend` | Deploy Worker + sync secrets |
| `npm run deploy:frontend` | Build and deploy to Cloudflare Pages |
| `npm run deploy:all` | Deploy backend and frontend |

## Environment variables

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend URL (`http://localhost:8787` locally) |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key |

### Backend (`backend/.dev.vars`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `WEATHER_API_KEY` | No | OpenWeather API key (mock weather if omitted) |

## API reference

Base URL: `https://navix-api.<your-subdomain>.workers.dev` (production) or `http://localhost:8787` (local).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health + D1 binding status |
| `GET` | `/api/weather?lat=&lon=` | Weather for coordinates |
| `GET` | `/api/places` | List places from D1 |
| `GET` | `/api/nearby?lat=&lng=` | Nearby places sorted by distance |
| `POST` | `/api/ask` | Simple Gemini Q&A (`{ "prompt": "..." }`) |
| `POST` | `/api/navix/chat` | Full multi-agent tour response (alias: `/api/chat`) |

### `POST /api/navix/chat`

```json
{
  "message": "Tell me about this place",
  "lat": 7.957,
  "lng": 80.760,
  "weather_data": { "temp": 30, "condition": "Cloudy" }
}
```

Response includes structured agents: `intent_agent`, `weather_agent`, `heritage_agent`, and `voice_script` for TTS.

## Cloudflare D1 setup

Database is now hosted in **Cloudflare D1** and queried directly from the Worker.

1. Create the D1 database:
   - `cd backend`
   - `npx wrangler d1 create navix-db`
2. Copy the returned `database_id` into [`backend/wrangler.toml`](backend/wrangler.toml) under `[[d1_databases]]`.
3. Apply schema and seed migrations locally:
   - `npm run d1:migrate:local`
4. Apply migrations to remote D1:
   - `npm run d1:migrate:remote`
5. To convert Mongo-exported JSON into a D1 seed migration:
   - `node ./scripts/mongo-to-d1-seed.mjs <input-json> <output-sql>`
   - Example: `npm run d1:seed:generate`

## Cloudflare deployment

| Component | Platform | Name |
|-----------|----------|------|
| Frontend | Cloudflare Pages | `navix-frontend` |
| Backend | Cloudflare Worker | `navix-api` |
| Database | Cloudflare D1 | `navix-db` |

### One-time setup

```bash
cd backend
npm install
cp .dev.vars.example .dev.vars
npm run cf:login
npm run cf:secrets
npm run d1:migrate:remote
```

Register a **workers.dev** subdomain (first time): Cloudflare Dashboard → Workers → onboarding.

### Deploy

```bash
# From repo root — set VITE_API_BASE_URL in frontend/.env.local first
npm run deploy:all
```

Or separately:

```bash
npm run deploy:backend
npm run deploy:frontend
```

Production URLs:

- API: `https://navix-api.<your-subdomain>.workers.dev`
- Pages: URL shown in Cloudflare Dashboard after first deploy

## CI/CD (GitHub Actions)

Pushes to **`main`** or **`developer`** trigger:

| Workflow | Deploys |
|----------|---------|
| [`backend.yml`](.github/workflows/backend.yml) | Cloudflare Worker |
| [`frontend.yml`](.github/workflows/frontend.yml) | Cloudflare Pages |

### GitHub secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `VITE_GOOGLE_MAPS_API_KEY` (optional)

### GitHub variables

- `VITE_API_BASE_URL` — e.g. `https://navix-api.<subdomain>.workers.dev`

Also add Worker secrets in the Cloudflare Dashboard (same keys as `.dev.vars`).

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready default |
| `developer` | Active integration branch (Vite frontend + features) |
| `feat/backend-structured-navix-chat-pipeline` | Structured AI pipeline + Cloudflare D1 integration |

## Data pipeline

1. Place source documents in `data/raw/`
2. Run scripts in `data/scripts/` to clean and format
3. Output goes to `data/processed/` for ingestion into D1 `places` table

## License

Private — team use only unless otherwise specified.
