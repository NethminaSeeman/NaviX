# NaviX voice agent (LiveKit + Gemini Live)

Conversational Sri Lanka tourism assistant. Speech goes through **Gemini Live**
(speech-to-speech). Tools call the existing NaviX Worker (`/chat`, `/weather`,
`/nearby`).

## Free tier

Host the agent on [LiveKit Cloud Build](https://livekit.com/pricing) ($0/mo):

- 1,000 agent session minutes / month (hard cap)
- 5 concurrent sessions
- 1 agent deployment
- Cold starts after idle are normal

Gemini usage is billed separately via your `GOOGLE_API_KEY`.

## API keys — where to paste them

| Secret | Where |
|--------|--------|
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | `voice-agent/.env.local` **and** `backend/.dev.vars` (Worker mints join tokens) |
| `GOOGLE_API_KEY` | `voice-agent/.env.local` only |
| `NAVIX_API_BASE_URL` | `voice-agent/.env.local` (e.g. `http://127.0.0.1:8787` or your Worker URL) |

Do not put LiveKit secrets or `GOOGLE_API_KEY` in the frontend. The browser only
receives a short-lived room JWT from `POST /voice/token`.

## Local run

Prerequisites: Python 3.10+, [uv](https://docs.astral.sh/uv/), Worker + frontend running.

```bash
cd voice-agent
cp .env.example .env.local   # if needed, then fill keys
uv sync
uv run src/agent.py console  # mic test in terminal
# or:
uv run src/agent.py dev      # registers with LiveKit Cloud for browser Voice talk
```

In another terminals:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

Open Assistant → **Voice talk** → **Start talking** (must be logged in with trial/paid access).

## Deploy agent to LiveKit Cloud

```bash
cd voice-agent
lk app create   # or link existing project
# set secrets in LiveKit Cloud dashboard / CLI
lk agent create
```

Dockerfile is included for Cloud builds. Set the same LiveKit keys on the Worker
(`npm run cf:secrets` after updating `.dev.vars`).

## Agent name

The agent registers as `navix-guide`. The Worker JWT includes
`roomConfig.agents` so LiveKit dispatches that agent when a tourist joins.
