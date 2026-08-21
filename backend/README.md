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

## Database migrations

Schema is managed by Alembic, not `create_all()`. The API runs
`alembic upgrade head` on startup, so a fresh database builds itself and an
existing one picks up anything new. Applied revisions are recorded in
`alembic_version`, so repeating it is a no-op.

To change the schema, edit the models, then generate a revision. It has to run
inside the container — that's where the dependencies and the database live —
and the file it writes has to be copied back out, because `backend/` is baked
into the image rather than bind-mounted:

    docker compose exec worker alembic revision --autogenerate -m "add x to y"
    docker compose cp worker:/app/alembic/versions/<file>.py backend/alembic/versions/

Read the generated file before committing it. Autogenerate is good at columns
and tables and unreliable about renames — it will usually emit a drop plus an
add, which throws the data away.

    docker compose exec worker alembic current      # where the db is now
    docker compose exec worker alembic history      # what exists
    docker compose exec worker alembic downgrade -1 # step back one
