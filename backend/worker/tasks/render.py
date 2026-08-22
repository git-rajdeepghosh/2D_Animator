# render_video(job_id): full pipeline — codegen -> sandbox render -> tts -> mux -> store.
#
# Runs as a Celery task. Advances the job through JobStatus stages, persisting
# artifacts and publishing progress after each stage so the API's WebSocket can
# stream it. Any failure marks the job FAILED with the error message.
import subprocess
import tempfile
from pathlib import Path

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


def _fail(db, job: Job, exc: Exception) -> None:
    """Mark a job failed and broadcast the reason to any progress listener."""
    job.status = JobStatus.FAILED
    job.error = str(exc)
    db.commit()
    publish_progress(job.id, JobStatus.FAILED.value, job.progress, error=str(exc))


def _render_and_store(db, job: Job, narration: str, scene_code: str) -> None:
    """Sandbox render -> voiceover -> storage.

    Shared by both entry points: the difference between a first generation and
    a re-render is only where `scene_code` came from, so everything downstream
    of codegen lives here rather than being duplicated.
    """
    _advance(db, job, JobStatus.RENDERING, 45, scene_code=scene_code)
    video_path = sandbox.render_scene(scene_code)
    try:
        _advance(db, job, JobStatus.RENDERING, 70)

        # Voiceover (TTS) + mux. Skipped entirely when the job opted out,
        # which is what makes re-rendering edited scene code free. Even when
        # requested it is best-effort: an unconfigured provider ships the
        # silent render rather than failing the job.
        if job.voiceover:
            _advance(db, job, JobStatus.VOICING, 80)
            final_path = _add_voiceover(narration, video_path)
        else:
            final_path = video_path

        # Persist and finish.
        video_url = storage.store(job.id, final_path)
        duration = _probe_duration(final_path)

        # Thumbnail for the library card. Optional: a missing poster falls back
        # to a placeholder in the UI rather than failing a good render.
        poster_path = _extract_poster(final_path)
        poster_url = (
            storage.store(job.id, poster_path, name="poster.jpg")
            if poster_path
            else None
        )
    finally:
        # Scratch lives on a shared mount, so it survives the container and
        # would otherwise accumulate one scene + MP4 per job, forever.
        sandbox.cleanup(video_path)

    _advance(
        db, job, JobStatus.DONE, 100,
        video_url=video_url, duration_seconds=duration, poster_url=poster_url,
    )


@celery_app.task(name="render_video")
def render_video(job_id: str) -> None:
    """Full pipeline: prompt -> narration -> scene code -> video."""
    db = SessionLocal()
    job = db.get(Job, job_id)
    if job is None:
        db.close()
        return

    try:
        # 1. Narration script (LLM).
        _advance(db, job, JobStatus.SCRIPTING, 10)
        gen = codegen.Codegen()
        narration = gen.narration_script(job.project.prompt)
        _advance(db, job, JobStatus.SCRIPTING, 25, narration_script=narration)

        # 2. Manim scene code (LLM), then render/voice/store.
        _render_and_store(db, job, narration, gen.scene_code(narration))
    except Exception as exc:  # noqa: BLE001 — surface any stage failure to the user
        _fail(db, job, exc)
    finally:
        db.close()


@celery_app.task(name="rerender_video")
def rerender_video(job_id: str) -> None:
    """Render user-edited scene code for an existing revision.

    Calls no LLM at all. The edited code and the inherited narration are
    written onto the job when the revision is created, so this path costs no
    API credits — only sandbox time. It starts at RENDERING rather than
    SCRIPTING because there is no script to write.
    """
    db = SessionLocal()
    job = db.get(Job, job_id)
    if job is None:
        db.close()
        return

    try:
        _render_and_store(db, job, job.narration_script or "", job.scene_code or "")
    except Exception as exc:  # noqa: BLE001 — surface any stage failure to the user
        _fail(db, job, exc)
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


def _extract_poster(video_path: str) -> str | None:
    """Write a thumbnail frame next to the video; return its path, or None.

    Deliberately *not* the literal first frame. A Manim scene opens on an empty
    background and draws into it, so frame zero is a blank rectangle — the one
    frame guaranteed to show nothing. ffmpeg's `thumbnail` filter instead scores
    a window of frames against their average and picks the least typical one,
    which lands on the scene after it has actually drawn something.

    Best-effort: a video that has a poster looks better, but a job that
    produced a watchable render should not fail because a still didn't encode.
    """
    out = str(Path(video_path).with_name("poster.jpg"))
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", video_path,
                "-vf", "thumbnail",
                "-frames:v", "1",
                out,
            ],
            check=True,
            capture_output=True,
        )
    except (subprocess.CalledProcessError, OSError):
        return None
    return out if Path(out).is_file() else None


def _probe_duration(path: str) -> float:
    """Length of a media file in seconds, via ffprobe."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            path,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def _mux(video_path: str, audio_path: str) -> str:
    """Combine video + audio, padding whichever stream is shorter.

    `-shortest` alone silently truncates the longer stream, and both directions
    lose something real: the animation's length is whatever the generated Manim
    happened to produce, so a longer narration gets cut off mid-sentence, while
    a longer animation gets its ending chopped. Neither is acceptable in the
    finished video.

    So the shorter side is extended to match instead — hold the final frame if
    the narration outlasts the animation, or trail silence if the animation
    outlasts the narration. `-shortest` still terminates the result, but by
    then the two streams are the same length so it cuts nothing.
    """
    out = str(Path(video_path).with_name("final.mp4"))
    video_len = _probe_duration(video_path)
    audio_len = _probe_duration(audio_path)

    cmd = ["ffmpeg", "-y", "-i", video_path, "-i", audio_path]

    # Tolerance: sub-100ms differences aren't worth a re-encode.
    if audio_len - video_len > 0.1:
        # Narration runs long — freeze the last frame until it finishes. A
        # video filter rules out `-c:v copy`, so this branch re-encodes.
        cmd += [
            "-filter_complex",
            f"[0:v]tpad=stop_mode=clone:stop_duration={audio_len - video_len:.3f}[v]",
            "-map", "[v]", "-map", "1:a",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
        ]
    elif video_len - audio_len > 0.1:
        # Animation runs long — trail silence so it plays out. apad pads
        # indefinitely, which is what `-shortest` is for below.
        cmd += [
            "-filter_complex", "[1:a]apad[a]",
            "-map", "0:v", "-map", "[a]",
            "-c:v", "copy",
        ]
    else:
        cmd += ["-map", "0:v", "-map", "1:a", "-c:v", "copy"]

    cmd += ["-c:a", "aac", "-shortest", out]
    subprocess.run(cmd, check=True, capture_output=True)
    return out
