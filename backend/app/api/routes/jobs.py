# POST /jobs        -> create a project + render job from a prompt, enqueue it.
# GET  /jobs/{id}   -> status + result URL.
# WS   /jobs/{id}/progress -> stream per-stage progress until the job finishes.
import asyncio

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.progress import subscribe_progress
from app.models.job import Job, JobStatus, Project
from app.schemas import JobCreate, JobRead

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobRead, status_code=201)
def create_job(body: JobCreate, db: Session = Depends(get_db)) -> Job:
    """Create a project + queued job for a prompt and hand it to the worker."""
    project = Project(prompt=body.prompt, title=body.title)
    job = Job(project=project, status=JobStatus.QUEUED, progress=0)
    db.add(project)
    db.add(job)
    db.commit()
    db.refresh(job)

    # Import lazily so the API doesn't hard-depend on the worker/Celery at import time.
    from worker.tasks.render import render_video

    render_video.delay(job.id)
    return job


@router.get("/{job_id}", response_model=JobRead)
def get_job(job_id: str, db: Session = Depends(get_db)) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.websocket("/{job_id}/progress")
async def job_progress(websocket: WebSocket, job_id: str) -> None:
    """Stream progress updates for a job, closing once it reaches a terminal state."""
    await websocket.accept()
    try:
        async for update in subscribe_progress(job_id):
            await websocket.send_json(update)
            if update.get("status") in (JobStatus.DONE.value, JobStatus.FAILED.value):
                break
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    finally:
        await websocket.close()
