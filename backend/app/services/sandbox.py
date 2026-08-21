# Driver that runs generated Manim code inside the Docker render sandbox.
# Enforces timeout, no-network, resource limits; returns rendered frames/video.
#
# One throwaway container per job:
#   - the generated scene code is written to a host temp dir, mounted read-only
#   - an output dir is mounted read-write for the rendered MP4
#   - --network=none, CPU/memory caps, and a wall-clock timeout are enforced
#   - the container runs sandbox/scripts/render.py, which renders to /work/out
import shutil
import tempfile
from pathlib import Path

import docker
import requests
from docker.errors import DockerException, ImageNotFound
from docker.types import Ulimit

from app.core.config import settings


class SandboxError(RuntimeError):
    """Raised when the sandbox fails to produce a video (bad code, timeout, etc.)."""


def render_scene(scene_code: str) -> str:
    """Render generated Manim code to an MP4 inside the sandbox.

    Returns the path of the rendered video, which lives inside a per-job
    scratch directory. The caller copies it into storage and then calls
    `cleanup()` to drop that directory.

    Only the success path leaves anything behind: every failure route below
    removes the scratch directory here. Generated code fails often, so leaking
    one directory per bad scene adds up quickly, and nothing is lost by
    discarding it — the scene source is persisted on the job row and the
    container logs travel in the raised error.
    """
    # Job scratch must live under sandbox_work_dir, not an arbitrary temp dir:
    # the bind-mount sources below are resolved by the Docker daemon on the
    # host, so they have to sit somewhere the host can also see. See
    # `_host_path` and Settings.sandbox_work_host_dir.
    work_root = Path(settings.sandbox_work_dir)
    work_root.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="2danim-", dir=str(work_root)))
    try:
        return _render_in(work, scene_code)
    except Exception:
        shutil.rmtree(work, ignore_errors=True)
        raise


def _render_in(work: Path, scene_code: str) -> str:
    """Run one sandbox container against `work`; return the rendered MP4 path."""
    code_dir = work / "code"
    out_dir = work / "out"
    code_dir.mkdir()
    out_dir.mkdir()

    # The worker runs as root, so it creates these 0755 root-owned; the sandbox
    # image deliberately runs as the unprivileged `renderer` user and would get
    # EACCES writing the finished MP4 back. The code mount stays read-only and
    # world-readable, but the output mount has to be world-writable. Scoped to
    # this one throwaway job directory.
    out_dir.chmod(0o777)

    # The base scene helpers travel with the code mount so generated scenes can
    # subclass ExplainerScene.
    (code_dir / "scene.py").write_text(scene_code, encoding="utf-8")
    _copy_base_scene(code_dir)

    client = docker.from_env()
    # Detached rather than blocking, so `wait(timeout=...)` can enforce the
    # wall-clock budget. `remove=True` is incompatible with this: the container
    # would auto-delete before its exit code and logs could be read, so it is
    # removed explicitly in the finally below.
    try:
        container = client.containers.run(
            settings.sandbox_image,
            command=["/work/code/scene.py", "GeneratedScene"],
            volumes={
                _host_path(code_dir): {"bind": "/work/code", "mode": "ro"},
                _host_path(out_dir): {"bind": "/work/out", "mode": "rw"},
            },
            network_mode="none",
            mem_limit="2g",
            nano_cpus=2_000_000_000,  # 2 CPUs
            pids_limit=256,
            ulimits=[Ulimit(name="nofile", soft=1024, hard=1024)],
            detach=True,
        )
    except ImageNotFound as exc:
        raise SandboxError(
            f"Sandbox image '{settings.sandbox_image}' not found. Build it with "
            "`docker compose --profile build build`."
        ) from exc

    try:
        status = container.wait(timeout=settings.render_timeout_seconds)
        exit_code = status.get("StatusCode", 1)
        logs = container.logs(stdout=True, stderr=True).decode("utf-8", "replace")
    except requests.exceptions.RequestException as exc:
        # docker-py surfaces an elapsed wait() as a transport-level timeout.
        # Generated code can loop forever; without this the container outlives
        # the Celery task and keeps holding CPU and memory.
        try:
            container.kill()
        except DockerException:
            pass  # already exited between the timeout and the kill
        raise SandboxError(
            "Render exceeded RENDER_TIMEOUT_SECONDS "
            f"({settings.render_timeout_seconds}s) and was killed."
        ) from exc
    finally:
        try:
            container.remove(force=True)
        except DockerException:
            pass  # best-effort cleanup; never mask the original failure

    if exit_code != 0:
        raise SandboxError(f"Render failed in sandbox:\n{logs}")

    videos = list(out_dir.glob("*.mp4"))
    if not videos:
        raise SandboxError("Sandbox produced no video output.")
    return str(videos[0])


def cleanup(video_path: str) -> None:
    """Delete the per-job scratch directory `render_scene` created.

    `render_scene` returns a path *inside* that directory, so callers must copy
    the video into storage before calling this. Without it every completed job
    leaves its scene code and rendered MP4 behind in the work mount.
    """
    work = Path(video_path).resolve().parents[1]
    root = Path(settings.sandbox_work_dir).resolve()
    # Only ever recurse into the sandbox work root — a malformed path must not
    # turn this into an arbitrary recursive delete.
    if work.parent != root:
        return
    shutil.rmtree(work, ignore_errors=True)


def _host_path(path: Path) -> str:
    """Express a worker-side path the way the Docker daemon will resolve it.

    Bind-mount sources are interpreted by the daemon, which runs on the host.
    When the worker is itself containerized, `/data/work/foo` means one thing
    inside the worker and something else (usually nothing) on the host, so the
    path is rebased onto the host's view of the same shared directory.

    Forward slashes throughout: Docker Desktop accepts `C:/Users/...` for
    Windows hosts, and mixing separators breaks the daemon's path parsing.
    """
    if not settings.sandbox_work_host_dir:
        # Worker is running directly on the host — paths already agree.
        return str(path)

    relative = path.relative_to(settings.sandbox_work_dir)
    base = settings.sandbox_work_host_dir.replace("\\", "/").rstrip("/")
    return f"{base}/{relative.as_posix()}"


def _copy_base_scene(code_dir: Path) -> None:
    """Copy the ExplainerScene base into the code mount next to the generated scene."""
    base_src = Path(__file__).resolve().parents[2] / "manim" / "scenes" / "base.py"
    shutil.copyfile(base_src, code_dir / "base.py")
