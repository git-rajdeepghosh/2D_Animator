# POST /jobs        -> create a project + render job from a prompt, enqueue it.
# GET  /jobs        -> list the caller's jobs, newest first.
# GET  /jobs/{id}   -> status + result URL, owner only.
# WS   /jobs/{id}/progress -> stream per-stage progress until the job finishes.
#
# Every route is scoped to the caller's Supabase user id. A job belonging to
# someone else is reported as 404 rather than 403, so job ids can't be probed
# for existence.
import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.auth import get_current_user_id, get_ws_user_id
from app.core.database import SessionLocal, get_db
from app.core.progress import subscribe_progress
from app.models.job import Job, JobStatus, Project
from app.schemas import JobCreate, JobDetail, JobRead, RerenderCreate
from app.services.scene_validation import SceneCodeInvalid, validate_scene_code

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _owned_job(db: Session, job_id: str, user_id: str) -> Job | None:
    """Fetch a job only if it belongs to this user."""
    return db.scalar(
        select(Job).join(Project).where(Job.id == job_id, Project.user_id == user_id)
    )


@router.post("", response_model=JobRead, status_code=201)
def create_job(
    body: JobCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> Job:
    """Create a project + queued job for a prompt and hand it to the worker."""
    project = Project(prompt=body.prompt, title=body.title, user_id=user_id)
    job = Job(
        project=project,
        status=JobStatus.QUEUED,
        progress=0,
        voiceover=body.voiceover,
    )
    db.add(project)
    db.add(job)
    db.commit()
    db.refresh(job)

    # Import lazily so the API doesn't hard-depend on the worker/Celery at import time.
    from worker.tasks.render import render_video

    render_video.delay(job.id)
    return job


@router.get("", response_model=list[JobRead])
def list_jobs(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> list[Job]:
    """The caller's jobs, newest first. Backs the /my-videos page."""
    return list(
        db.scalars(
            select(Job)
            .join(Project)
            # Eager-load so `Job.title` doesn't fire a query per row.
            .options(joinedload(Job.project))
            .where(Project.user_id == user_id)
            .order_by(Job.created_at.desc())
            .limit(limit)
        )
    )


@router.get("/{job_id}", response_model=JobRead)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> Job:
    job = _owned_job(db, job_id, user_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/{job_id}/detail", response_model=JobDetail)
def get_job_detail(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> JobDetail:
    """Job plus its pipeline artifacts — what the editor loads.

    Split from GET /jobs/{id} so listing stays cheap: `scene_code` alone can
    run to several thousand characters.
    """
    job = _owned_job(db, job_id, user_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobDetail(
        **JobRead.model_validate(job).model_dump(),
        prompt=job.project.prompt,
        narration_script=job.narration_script,
        scene_code=job.scene_code,
    )


@router.get("/{job_id}/revisions", response_model=list[JobRead])
def list_revisions(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> list[Job]:
    """Every render of this job's project, newest first.

    Each edit-and-rerender adds a Job to the same Project, so the project's
    job list is the revision history — no separate versioning table.
    """
    job = _owned_job(db, job_id, user_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    return list(
        db.scalars(
            select(Job)
            .where(Job.project_id == job.project_id)
            .order_by(Job.created_at.desc())
        )
    )


@router.post("/{job_id}/rerender", response_model=JobRead, status_code=201)
def rerender_job(
    job_id: str,
    body: RerenderCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> Job:
    """Render edited scene code as a new revision of the same project.

    Calls no LLM: the narration is inherited from the job being revised, so
    this costs sandbox time only. Unlike POST /jobs, it spends no API credits.
    """
    parent = _owned_job(db, job_id, user_id)
    if parent is None:
        raise HTTPException(status_code=404, detail="Job not found")

    # Validate before touching the database or the queue — a syntax error
    # should come back in milliseconds, not after a container spin-up, and
    # should not leave a failed row behind.
    try:
        validate_scene_code(body.scene_code)
    except SceneCodeInvalid as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    revision = Job(
        project_id=parent.project_id,
        status=JobStatus.QUEUED,
        progress=0,
        scene_code=body.scene_code,
        # Carried over so the voiceover stage has a script without an LLM call.
        narration_script=parent.narration_script,
        # Inherit the parent's choice unless this request overrides it.
        voiceover=(
            parent.voiceover if body.voiceover is None else body.voiceover
        ),
    )
    db.add(revision)
    db.commit()
    db.refresh(revision)

    from worker.tasks.render import rerender_video

    rerender_video.delay(revision.id)
    return revision


@router.websocket("/{job_id}/progress")
async def job_progress(websocket: WebSocket, job_id: str) -> None:
    """Stream progress updates for a job, closing once it reaches a terminal state."""
    user_id = await get_ws_user_id(websocket)
    if user_id is None:
        # Policy violation: the handshake carried no usable credentials.
        await websocket.close(code=1008)
        return

    # Ownership is checked once, up front — the job's owner can't change.
    db = SessionLocal()
    try:
        owned = _owned_job(db, job_id, user_id) is not None
    finally:
        db.close()

    if not owned:
        await websocket.close(code=1008)
        return

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
