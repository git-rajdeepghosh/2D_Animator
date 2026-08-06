# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

2DAnimator turns a plain-language educational prompt into a short (≤60s) narrated
explainer video, built on [Manim](https://www.manim.community/) (the animation
engine 3Blue1Brown uses). Output isn't one-shot: a lightweight editing layer lets
users refine timing, scenes, and narration after the first render.

## Project status

Early but no longer stub-level. The backend pipeline, the landing page, and a
working generator page are implemented; auth and the post-render editor are
still scaffolds. Specifics:

- **Backend implemented:** env-driven `config.py`; SQLAlchemy `Project`/`Job`
  models with a `JobStatus` stage enum (`app/models/job.py`); `POST /jobs`,
  `GET /jobs/{id}`, and a `WS /jobs/{id}/progress` route; a Celery `render_video`
  task orchestrating the stages; Redis pub/sub bridging worker progress to the
  WebSocket (`app/core/progress.py`); a `/renders` static mount serving
  `STORAGE_DIR` so the frontend can play back results; and the pipeline
  services — `codegen` (two providers: **Gemini** writes the narration script,
  **Anthropic** writes the Manim scene code — no storyboard stage in between),
  `sandbox` (Docker driver), `tts` (provider-agnostic, endpoint left blank —
  **on hold for v1**, jobs ship the silent render), `storage` (local FS). The
  in-container `sandbox/scripts/render.py` runs Manim and `manim/scenes/base.py`
  defines the `ExplainerScene` base that generated code subclasses.
- **Frontend implemented:** a fully redesigned landing page (`components/landing/`
  — animated `Hero`, `CategoryCards`, `Showcase`, `SiteFooter`) in a
  paper/ink/highlight monochrome design system (see `tailwind.config.ts` and the
  `tag`/`nav-link` utilities in `globals.css`), and a working `/generator` page
  (`components/generator/GeneratorView.tsx` + `StageTracker.tsx`) that's wired
  to the backend end to end: submits via `lib/api.ts` (`createJob`), streams
  stage progress over the WebSocket (`subscribeJobProgress`), and plays the
  result. The Hero's search bar hands its typed prompt to `/generator` via a
  `?prompt=` query param. The old `components/Header.tsx` / `PromptBox.tsx` /
  `PipelineSteps.tsx` / `Footer.tsx` and the original `app/page.tsx` landing are
  superseded and unused — left in place, not wired into any route.
- **Still stubs / not built:** TTS has no concrete provider endpoint; no test
  suite; no DB migrations (tables are auto-created on API startup via
  `init_db()`); the post-render editor (`app/editor`) is a placeholder; there is
  no auth.

Don't assume a function/route/component exists — check the file before relying
on it.

## Architecture

Three components, one direction of trust: the browser talks only to the API, the
API delegates heavy work to the worker, and untrusted LLM-generated code runs
only inside a disposable Docker sandbox.

```
Frontend (Next.js) --REST/WS--> API (FastAPI) --enqueue (Redis)--> Worker (Celery)
                                     |                                    |
                                Postgres + Redis                   Docker sandbox
```

- **`frontend/`** (Next.js, App Router) — `/` is the marketing landing page;
  `/generator` is the working prompt-to-video flow; `/editor` is a placeholder
  for post-render editing. Talks to the backend over REST + WebSocket. Never
  runs Manim or renders anything itself.
- **`backend/`** (Python) — one codebase, two processes:
  - **API** (`backend/app/`, FastAPI, entrypoint `app/main.py`) — accepts
    prompts, creates projects/jobs, exposes status + result URLs, streams
    progress over WebSocket, serves rendered files under `/renders`. Validates
    and enqueues work; does no rendering.
  - **Worker** (`backend/worker/`, Celery over Redis, entrypoint
    `worker/celery_app.py`) — runs the generation pipeline per job. Stages live
    in `backend/app/services/`: `codegen.py` (prompt → narration script via
    **Gemini**, then script → Manim scene code via **Anthropic**), `sandbox.py`
    (run that code safely), `tts.py` (script → voiceover audio — **on hold for
    v1**), `storage.py` (persist the final MP4).
  - `backend/manim/scenes/` holds scene templates/helpers injected into
    LLM-generated code (`base.py`, the `ExplainerScene` base class).
  - Postgres stores projects/jobs/edit state; Redis is both the Celery broker
    and the progress pub/sub channel between the worker and the API's WebSocket.
- **`sandbox/`** (Docker) — the only place untrusted, LLM-generated code
  executes. The worker launches one throwaway container per job with
  `--network=none`, a read-only code mount, a writable output volume, and
  strict CPU/memory/time limits (`RENDER_TIMEOUT_SECONDS`). The image
  (`sandbox/Dockerfile`) bundles Manim plus native deps (cairo, pango, ffmpeg,
  LaTeX); `sandbox/scripts/render.py` is the entrypoint that receives a scene
  file + config and renders to `/work/out`.

### Request flow

1. User describes a concept (on the landing page's Hero search bar, or directly
   on `/generator`) and submits.
2. API creates a job, persists it, enqueues it on Redis.
3. Worker runs codegen: Gemini writes the narration script, then Anthropic
   writes the Manim scene code from that script — no storyboard stage.
4. Worker launches the Docker sandbox to render the scene to video.
5. TTS/mux is currently a no-op (on hold for v1) — the silent render ships as-is.
6. Final MP4 is stored (`storage/renders/`), served by the API under `/renders`;
   the frontend polls/streams progress and plays the result once done.
7. (Not yet built) user refines the result in the editor; edits re-run only
   affected stages.

## Commands

There's no installed toolchain yet (no `node_modules`, no Python venv committed
— both are gitignored). Once dependencies are installed, the local dev stack
runs via Docker Compose:

```bash
cp .env.example .env
docker compose --profile build build      # build app images + sandbox image
docker compose up                         # frontend :3000, api :8000
```

- API runs as `uvicorn app.main:app` (see `docker-compose.yml` for exact
  invocation); worker runs as `celery -A worker.celery_app worker`.
- The worker mounts the host Docker socket to launch sandbox containers per job
  — sandbox images are built via the `build` profile, not run as a long-lived
  service. The `api` service also mounts `./storage/renders` so it can serve
  what the worker writes.
- Backend deps: `backend/requirements.txt` (FastAPI, Celery, SQLAlchemy,
  psycopg2, Manim, docker SDK, `anthropic`, `google-genai`, httpx). No
  lockfile or lint/test config exists yet.
- Frontend deps: `frontend/package.json` (Next.js 14, React 18, Tailwind,
  TypeScript). `npx tsc --noEmit` and `npm run build` both pass clean as of
  this writing.

## Environment

Config is env-driven (`.env`, template in `.env.example`): `DATABASE_URL`,
`REDIS_URL`, `STORAGE_DIR`, `LLM_API_KEY`/`LLM_MODEL` (Anthropic — Manim scene
codegen, default `claude-sonnet-5`), `GEMINI_API_KEY`/`GEMINI_MODEL` (Gemini —
narration script, default `gemini-2.5-flash`), `TTS_API_KEY`/`TTS_VOICE`
(voiceover — on hold for v1, unwired), `SANDBOX_IMAGE`/`RENDER_TIMEOUT_SECONDS`
(render sandbox), `NEXT_PUBLIC_API_URL` (frontend → API), `FRONTEND_ORIGIN`
(API's CORS allowlist, defaults to `http://localhost:3000`).
