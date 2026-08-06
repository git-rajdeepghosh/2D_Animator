# FastAPI entrypoint. Mounts routes; enqueues jobs to the worker via Celery.
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.on_event("startup")
def on_startup() -> None:
    # Dev convenience: ensure tables exist. Replace with migrations for prod.
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}
