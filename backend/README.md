# Backend (Python)

Two processes sharing one codebase:

- **API** (`app/`) — FastAPI. Accepts prompts, creates projects/jobs, exposes
  status + results, streams progress over WebSocket. Enqueues render jobs; does
  NOT render itself.
- **Worker** (`worker/`) — Celery. Pulls jobs from the queue and runs the
  generation pipeline: prompt → script → Manim scene code → sandboxed render →
  voiceover → mux → store.

`services/` holds the pipeline stages (LLM codegen, TTS, sandbox driver,
storage). `manim/` holds scene templates/helpers injected into generated code.
