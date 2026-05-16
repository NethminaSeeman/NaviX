# NaviX

Voice-guided travel companion for exploring Sri Lanka — map navigation, weather, and AI-powered historical context powered by Gemini.

## Project structure

| Folder | Purpose |
|--------|---------|
| `frontend/` | Vite + React web app (map, voice UI, weather widgets) |
| `backend/` | Cloudflare Workers API (AI, weather, database) |
| `data/` | Knowledge base for AI context (raw docs → processed JSON) |
| `.github/workflows/` | CI/CD to Cloudflare Pages & Workers |

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Cloudflare account](https://dash.cloudflare.com/) (Pages + Workers)
- MongoDB Atlas (or compatible URI)
- Google AI Studio API key (Gemini)

## Local development

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Backend

```bash
cd backend
npm install
cp .dev.vars.example .dev.vars   # then fill in secrets
npm run dev
```

Worker runs at `http://localhost:8787` by default.

## Environment variables

**Frontend** (`frontend/.env.local`):

- `VITE_API_BASE_URL` — Backend Worker URL (local: `http://localhost:8787`)
- `VITE_GOOGLE_MAPS_API_KEY` — Google Maps key

**Backend** (`backend/.dev.vars`):

- `GEMINI_API_KEY` — Google Gemini API key
- `MONGODB_DATA_API_URL` — MongoDB Atlas Data API base URL
- `MONGODB_DATA_API_KEY` — MongoDB Atlas Data API key
- `MONGODB_DATA_SOURCE` — Atlas cluster data source name (default `Cluster0`)
- `MONGODB_DATABASE` — Database name (default `navix`)
- `WEATHER_API_KEY` — OpenWeather key (optional)

## Cloudflare hosting architecture

| Layer | Platform | Notes |
|-------|----------|-------|
| Frontend | **Cloudflare Pages** | Static Vite build (`frontend/dist`) |
| Backend API | **Cloudflare Workers** | Worker name: `navix-api` |
| Database | **MongoDB Atlas** | Hosted on MongoDB; Worker connects via Atlas Data API |

MongoDB cannot run inside Cloudflare. Create a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster, enable **Data API**, import `data/mongodb/places.sample.json` into a `places` collection, and add a `2dsphere` index on `location`.

### One-time Cloudflare setup

```bash
cd backend
npm install
cp .dev.vars.example .dev.vars   # fill secrets
npm run cf:login
npm run cf:secrets               # push secrets to Worker
```

Register a workers.dev subdomain (first time only):  
https://dash.cloudflare.com → Workers → onboarding

### Deploy manually (Wrangler)

```bash
# Backend Worker
npm run deploy:backend

# Frontend Pages (set VITE_API_BASE_URL to your Worker URL first)
cd frontend && cp .env.example .env.local
npm run deploy:frontend
```

### Deploy via GitHub Actions

Pushes to `main` or `developer` trigger:

- `backend.yml` → Cloudflare Workers
- `frontend.yml` → Cloudflare Pages (`navix-frontend`)

**GitHub repository secrets**

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `VITE_GOOGLE_MAPS_API_KEY` (optional, for maps)

**GitHub repository variables**

- `VITE_API_BASE_URL` — e.g. `https://navix-api.<subdomain>.workers.dev`

## Data pipeline

1. Place source documents in `data/raw/`
2. Run scripts in `data/scripts/` to clean and format
3. Output goes to `data/processed/` for ingestion by the AI layer

## License

Private — team use only unless otherwise specified.
