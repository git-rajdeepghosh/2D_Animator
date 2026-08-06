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
from docker.errors import ContainerError, ImageNotFound
from docker.types import Ulimit

from app.core.config import settings


class SandboxError(RuntimeError):
    """Raised when the sandbox fails to produce a video (bad code, timeout, etc.)."""


def render_scene(scene_code: str) -> str:
    """Render generated Manim code to an MP4 inside the sandbox.

    Returns the host path of the rendered video. Caller owns the temp dir's
    lifetime is handled here except the returned file, which the caller should
    move into storage promptly.
    """
    work = Path(tempfile.mkdtemp(prefix="2danim-"))
    code_dir = work / "code"
    out_dir = work / "out"
    code_dir.mkdir()
    out_dir.mkdir()

    # The base scene helpers travel with the code mount so generated scenes can
    # subclass ExplainerScene.
    (code_dir / "scene.py").write_text(scene_code, encoding="utf-8")
    _copy_base_scene(code_dir)

    client = docker.from_env()
    try:
        client.containers.run(
            settings.sandbox_image,
            command=["/work/code/scene.py", "GeneratedScene"],
            volumes={
                str(code_dir): {"bind": "/work/code", "mode": "ro"},
                str(out_dir): {"bind": "/work/out", "mode": "rw"},
            },
            network_mode="none",
            mem_limit="2g",
            nano_cpus=2_000_000_000,  # 2 CPUs
            pids_limit=256,
            ulimits=[Ulimit(name="nofile", soft=1024, hard=1024)],
            remove=True,
            stderr=True,
        )
    except ImageNotFound as exc:
        raise SandboxError(
            f"Sandbox image '{settings.sandbox_image}' not found. Build it with "
            "`docker compose --profile build build`."
        ) from exc
    except ContainerError as exc:
        logs = exc.stderr.decode() if isinstance(exc.stderr, bytes) else str(exc.stderr)
        raise SandboxError(f"Render failed in sandbox:\n{logs}") from exc

    videos = list(out_dir.glob("*.mp4"))
    if not videos:
        shutil.rmtree(work, ignore_errors=True)
        raise SandboxError("Sandbox produced no video output.")
    return str(videos[0])


def _copy_base_scene(code_dir: Path) -> None:
    """Copy the ExplainerScene base into the code mount next to the generated scene."""
    base_src = Path(__file__).resolve().parents[2] / "manim" / "scenes" / "base.py"
    shutil.copyfile(base_src, code_dir / "base.py")
