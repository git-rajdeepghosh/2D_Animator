# Frontend (Next.js)

User-facing app. Handles auth, the prompt-to-video flow, playback, and the
timeline editing layer. Talks to the backend API over REST/WebSocket; never
runs Manim or renders directly.

- `app/` — routes (App Router). `app/editor` = timeline/refine view.
- `app/api/` — thin BFF routes (proxy/auth helpers only).
- `components/` — reusable UI (player, prompt box, timeline, scene cards).
- `lib/` — API client, WebSocket hooks, shared types.
