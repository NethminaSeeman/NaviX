# NaviX Frontend Handoff Status

## Snapshot
- Date: 2026-05-16
- Branch: `frontend-structured`
- Stack: React + Vite + TailwindCSS + React Router + Google Maps API + Web Speech API
- UI Direction: Modern technical dashboard (dark-mode-first, glass panels, cyan/teal accents, monospace metadata labels)

## Completed Frontend Foundations
- Modular architecture in `frontend/src` with `components`, `pages`, `context`, `services`, `hooks`, `utils`, `layouts`, `routes`.
- Core pages implemented: Home, Live Map, AI Chat, Destination Details, About, Contact.
- Context/state setup implemented: theme, location, weather, chat.
- API service layer implemented and normalized through `frontend/src/services/ceygoApi.js`.

## Latest Data Integration (MongoDB Enriched Tourism Dataset)
- Added category marker configuration:
  - `frontend/src/utils/mapConfig.js`
  - Supported tags:
    - `religious-temple`
    - `historical-monument`
    - `museum`
    - `beach`
    - `urban-park`
- Marker appearance now category-aware via map config (color + short code + technical badge styles).
- Nearby attractions list now renders `tags` using mono technical badges.
- Map info windows now display:
  - `deep_history.summary`
  - `deep_history.architectural_details`
- Nearby list items are clickable and open a detail panel with deep-history fields.

## Voice Engine Update
- `frontend/src/hooks/useSpeechSynthesis.js` now prioritizes enriched voice fields:
  - `tts_hints.key_facts_short`
  - `tts_hints.pronunciation_guide`
- Fallback order includes destination summary/history when hints are missing.
- Destination details narration now passes full destination object to speech engine.

## UX/UI Status
- Site-wide technical revamp applied with:
  - Sharper component geometry (`rounded-md`/`rounded-lg`)
  - Glass/tech panels (`tech-panel`)
  - Monospace metadata (`mono-label`)
  - Snappy button micro-interactions (`active:scale-95`)
- Map and chat surfaces are treated as immersive dashboard workspaces.

## Known Notes
- Build succeeds; lint succeeds.
- Vite warns about large JS chunk size (>500k). Non-blocking, but route-level code splitting is recommended.

## Suggested Next Steps
1. Add lazy loading in `frontend/src/routes/AppRoutes.jsx` for page-level splitting.
2. Add lightweight visual regression snapshots for core pages.
3. Add API contract docs for enriched place schema (`tags`, `deep_history`, `tts_hints`) in frontend docs.
