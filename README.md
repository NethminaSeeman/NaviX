# CeyGo

Voice-guided travel companion for exploring Sri Lanka — map navigation, weather, and AI-powered historical context powered by Gemini.

## Project structure

| Folder | Purpose |
|--------|---------|
| `frontend/` | Next.js web app (map, voice UI, weather widgets) |
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

Open [http://localhost:3000](http://localhost:3000).

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

- `NEXT_PUBLIC_API_URL` — Backend API base URL

**Backend** (`backend/.dev.vars`):

- `GEMINI_API_KEY` — Google Gemini API key
- `MONGODB_URI` — MongoDB connection string
- `WEATHER_API_KEY` — External weather provider key (optional)

## Deployment

Pushes to `main` trigger GitHub Actions:

- `frontend.yml` → Cloudflare Pages
- `backend.yml` → Cloudflare Workers

Configure repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and any build-time env vars your workflows need.

## Data pipeline

1. Place source documents in `data/raw/`
2. Run scripts in `data/scripts/` to clean and format
3. Output goes to `data/processed/` for ingestion by the AI layer

## License

Private — team use only unless otherwise specified.
