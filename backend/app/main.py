# FastAPI entrypoint. Mounts routes; enqueues jobs to the worker via Celery.
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import jobs
from app.core import signing
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

# Rendered videos are private, so this is a checked route rather than a static
# mount. It was previously mounted with StaticFiles, which made every user's
# output readable by anyone who had (or guessed) the URL.
#
# The check is a signature on the URL, not a bearer token: a <video> element
# can't send an Authorization header, so requiring one would just stop videos
# playing. JobRead signs `video_url` on the way out — see app/schemas.py.
Path(settings.storage_dir).mkdir(parents=True, exist_ok=True)


@app.get("/renders/{job_id}/{filename}")
def serve_render(
    job_id: str,
    filename: str,
    expires: int | None = None,
    sig: str | None = None,
) -> FileResponse:
    """Serve a rendered video, if the URL carries a valid signature."""
    if signing.is_configured() and not signing.verify_path(
        f"/renders/{job_id}/{filename}", expires, sig
    ):
        # 404 rather than 403: a wrong signature shouldn't confirm that a
        # given job id exists.
        raise HTTPException(status_code=404, detail="Not found")

    root = Path(settings.storage_dir).resolve()
    path = (root / job_id / filename).resolve()
    # job_id and filename come from the URL, so confirm the resolved path is
    # still inside the storage root before opening it.
    if not path.is_file() or root not in path.parents:
        raise HTTPException(status_code=404, detail="Not found")

    return FileResponse(path)


# Curated catalogue. This one stays a public static mount on purpose: it holds
# hand-picked videos meant to be browsable by anyone, unlike per-user renders.
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

    # Same principle: running without URL signing is a legitimate local mode,
    # but it means every rendered video is readable by anyone with the link.
    if not signing.is_configured():
        logging.getLogger("uvicorn.error").warning(
            "RENDER_URL_SECRET is not set — /renders is serving UNSIGNED URLs, "
            "so any rendered video is readable by anyone who has the link. "
            "Generate one with: python -c \"import secrets; "
            "print(secrets.token_urlsafe(32))\""
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
