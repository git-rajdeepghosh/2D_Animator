# FastAPI entrypoint. Mounts routes; enqueues jobs to the worker via Celery.
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import jobs
from app.core.config import settings
from app.core.database import init_db

app = FastAPI(title="2DAnimator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)

# Serve rendered videos back to the frontend. Must exist before StaticFiles
# mounts (it errors at import time on a missing directory); the worker writes
# into the same path via storage.py / the shared STORAGE_DIR volume.
Path(settings.storage_dir).mkdir(parents=True, exist_ok=True)
app.mount("/renders", StaticFiles(directory=settings.storage_dir), name="renders")


@app.on_event("startup")
def on_startup() -> None:
    # Dev convenience: ensure tables exist. Replace with migrations for prod.
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}
