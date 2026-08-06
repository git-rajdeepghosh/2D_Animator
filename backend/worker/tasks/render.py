# render_video(job_id): full pipeline — codegen -> sandbox render -> tts -> mux -> store.
#
# Runs as a Celery task. Advances the job through JobStatus stages, persisting
# artifacts and publishing progress after each stage so the API's WebSocket can
# stream it. Any failure marks the job FAILED with the error message.
import tempfile

from app.core.database import SessionLocal
from app.core.progress import publish_progress
from app.models.job import Job, JobStatus
from app.services import codegen, sandbox, storage
from worker.celery_app import celery_app


def _advance(db, job: Job, status: JobStatus, progress: int, **fields: object) -> None:
    """Persist a stage transition and broadcast it."""
    job.status = status
    job.progress = progress
    for key, value in fields.items():
        setattr(job, key, value)
    db.commit()
    publish_progress(job.id, status.value, progress)


@celery_app.task(name="render_video")
def render_video(job_id: str) -> None:
    db = SessionLocal()
    job = db.get(Job, job_id)
    if job is None:
        db.close()
        return

    try:
        prompt = job.project.prompt

        # 1. Narration script (LLM).
        _advance(db, job, JobStatus.SCRIPTING, 10)
        gen = codegen.Codegen()
        narration = gen.narration_script(prompt)
        _advance(db, job, JobStatus.SCRIPTING, 25, narration_script=narration)

        # 2. Manim scene code (LLM) -> sandboxed render.
        scene_code = gen.scene_code(narration)
        _advance(db, job, JobStatus.RENDERING, 45, scene_code=scene_code)
        video_path = sandbox.render_scene(scene_code)
        _advance(db, job, JobStatus.RENDERING, 70)

        # 3. Voiceover (TTS) + mux. TTS is optional: if no provider is
        #    configured, ship the silent render rather than failing the job.
        _advance(db, job, JobStatus.VOICING, 80)
        final_path = _add_voiceover(narration, video_path)

        # 4. Persist and finish.
        video_url = storage.store(job.id, final_path)
        _advance(db, job, JobStatus.DONE, 100, video_url=video_url)

    except Exception as exc:  # noqa: BLE001 — surface any stage failure to the user
        job.status = JobStatus.FAILED
        job.error = str(exc)
        db.commit()
        publish_progress(job.id, JobStatus.FAILED.value, job.progress, error=str(exc))
    finally:
        db.close()


def _add_voiceover(narration: str, video_path: str) -> str:
    """Synthesize narration and mux it onto the video; fall back to silent video.

    TTS and muxing are wired as a best-effort stage: a missing/unconfigured TTS
    provider degrades to the silent render instead of failing the whole job.
    """
    from app.services import tts

    try:
        with tempfile.TemporaryDirectory(prefix="2danim-tts-") as tmp:
            audio_path = tts.synthesize(narration, tmp)
            return _mux(video_path, audio_path)
    except tts.TTSNotConfigured:
        return video_path


def _mux(video_path: str, audio_path: str) -> str:
    """Combine video + audio with ffmpeg, returning the muxed file path."""
    import subprocess
    from pathlib import Path

    out = str(Path(video_path).with_name("final.mp4"))
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-c:v", "copy", "-c:a", "aac",
            "-shortest",
            out,
        ],
        check=True,
        capture_output=True,
    )
    return out
