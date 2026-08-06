# 2DAnimator

Describe an educational concept in plain language and get a short-form (≤60 sec)
animated explainer video back — voiceover included — without writing Python or
knowing animation principles. Built on top of [Manim](https://www.manim.community/),
the animation engine 3Blue1Brown uses. Output isn't a one-shot render: a
lightweight editing layer lets users refine timing, scenes, and narration.

## Architecture

Three components, one direction of trust: the browser talks only to the API, the
API delegates heavy work to the worker, and untrusted generated code runs only
inside a disposable Docker sandbox.

```
┌──────────────┐     REST / WS      ┌──────────────┐    enqueue    ┌──────────────┐
│   Frontend   │ ─────────────────▶ │   API        │ ────────────▶ │   Worker     │
│  (Next.js)   │ ◀───────────────── │  (FastAPI)   │   (Redis Q)   │  (Celery)    │
└──────────────┘   status / URLs    └──────┬───────┘               └──────┬───────┘
                                           │                               │
                                     ┌─────▼─────┐                   ┌─────▼──────────┐
                                     │ Postgres  │                   │ Docker sandbox │
                                     │  + Redis  │                   │ (Manim render) │
                                     └───────────┘                   └────────────────┘
```

### Frontend — `frontend/` (Next.js)

The user-facing app: prompt entry, live render progress, video playback, and the
timeline editing layer (`app/editor`). It communicates with the backend over REST
and a WebSocket for progress streaming. It never runs Manim or renders anything
itself — it only submits jobs and displays results.

### Backend — `backend/` (Python)

One codebase, two processes:

- **API** (`app/`, FastAPI) — accepts prompts, creates projects and jobs, exposes
  status and result URLs, and streams progress over WebSocket. It validates and
  enqueues work but does no rendering.
- **Worker** (`worker/`, Celery over Redis) — runs the generation pipeline for
  each job. Pipeline stages live in `app/services/`: `codegen` (prompt → narration
  script → Manim scene code via LLM), `sandbox` (run that code safely), `tts`
  (script → voiceover audio), `storage` (persist the final MP4). `manim/` holds
  scene templates and helpers injected into generated code.

Postgres stores projects, jobs, and edit state; Redis is the Celery broker.

### Render sandbox — `sandbox/` (Docker)

The only place untrusted, LLM-generated code executes. The worker launches one
throwaway container per job with `--network=none`, a read-only code mount, a
writable output volume, and strict CPU / memory / time limits. The image bundles
Manim plus its native dependencies (cairo, pango, ffmpeg, LaTeX). Isolating
rendering here keeps a bad or malicious generation from touching the API, the
database, or other jobs.

## Request flow

1. User describes a concept in the frontend and submits.
2. API creates a job, persists it, and enqueues it on Redis.
3. Worker picks it up and runs codegen → produces a narration script and Manim
   scene code.
4. Worker launches the Docker sandbox to render the scene to video.
5. Worker generates voiceover (TTS) and muxes audio + video.
6. Final MP4 is stored; the API surfaces the URL and progress to the frontend.
7. User refines the result in the editor; edits re-run affected stages only.

## Repository layout

```
2DAnimator/
├── frontend/          Next.js app (UI, playback, editor)
│   ├── app/           App Router routes (+ app/editor)
│   ├── components/    Player, prompt box, timeline
│   └── lib/           API + WebSocket client
├── backend/           Python API + worker
│   ├── app/           FastAPI: main, api/routes, core, services, models
│   ├── worker/        Celery app + tasks
│   └── manim/         Scene templates/helpers for generated code
├── sandbox/           Docker render sandbox (Manim + deps)
├── storage/renders/   Rendered output (gitignored)
├── infra/             Deployment / IaC
├── docker-compose.yml Local dev stack
└── .env.example       Config template
```

## Getting started (local)

```bash
cp .env.example .env
docker compose --profile build build      # build app images + sandbox image
docker compose up                         # frontend :3000, api :8000
```

The worker mounts the Docker socket to launch sandbox containers per job.

## Tech stack

Next.js / React · FastAPI · Celery · Redis · Postgres · Manim · Docker · a TTS
provider for voiceover and an LLM for scene codegen.
