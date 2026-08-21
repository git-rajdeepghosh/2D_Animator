# FastAPI entrypoint. Mounts routes; enqueues jobs to the worker via Celery.
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import jobs
from app.core.config import settings
from app.core.database import init_db
from app.schemas import LibraryCollection
from app.services.library import list_collections

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

# Curated catalogue. Same must-exist-before-mount rule as /renders above.
Path(settings.library_dir).mkdir(parents=True, exist_ok=True)
app.mount(
    "/library-videos",
    StaticFiles(directory=settings.library_dir),
    name="library-videos",
)


@app.on_event("startup")
def on_startup() -> None:
    # Dev convenience: ensure tables exist. Replace with migrations for prod.
    init_db()

    # Running open is a legitimate local mode, but it must never be a surprise:
    # this endpoint spends money (Gemini + OpenAI) and spawns containers.
    if not settings.auth_enabled:
        logging.getLogger("uvicorn.error").warning(
            "SUPABASE_URL is not set — the API is accepting UNAUTHENTICATED "
            "requests. POST /jobs calls paid LLM APIs and launches Docker "
            "containers. Set SUPABASE_URL before exposing this to anything."
        )


@app.get("/library", response_model=list[LibraryCollection])
def library() -> list[dict]:
    """The public catalogue, grouped by subject.

    Unauthenticated on purpose: this is the shop window, browsable by anyone.
    A reader's own generated videos live behind auth at /jobs.
    """
    return list_collections()


@app.get("/health")
def health():
    return {"status": "ok"}


# Path is resolved once at import: the file ships inside the image and never
# changes at runtime.
_SCENE_BASE = Path(__file__).resolve().parents[1] / "manim" / "scenes" / "base.py"


@app.get("/scene-base", response_class=PlainTextResponse)
def scene_base() -> str:
    """Source of the `ExplainerScene` base class, for the editor's reference tab.

    Served rather than duplicated in the frontend so the helpers shown to
    someone editing a scene can never drift from the ones actually injected
    into the sandbox. Not user data and identical for everyone, so it needs no
    auth — it is effectively part of the app's own documentation.
    """
    return _SCENE_BASE.read_text(encoding="utf-8")
