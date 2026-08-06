# Invoked inside the container. Reads mounted scene code, runs Manim,
# writes the video to the output volume. No network access.
#
# Usage (set as the image ENTRYPOINT): render.py <scene_file> <scene_class>
#   <scene_file>  absolute path to the generated scene, e.g. /work/code/scene.py
#   <scene_class> the Scene subclass to render, e.g. GeneratedScene
#
# The rendered MP4 is copied to /work/out, which the worker mounts read-write
# and reads back on the host.
import shutil
import subprocess
import sys
from pathlib import Path

OUT_DIR = Path("/work/out")


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: render.py <scene_file> <scene_class>", file=sys.stderr)
        return 2

    scene_file, scene_class = sys.argv[1], sys.argv[2]
    code_dir = Path(scene_file).parent

    # Render at medium quality (-qm) to a known media directory. Manim writes
    # the MP4 under <media>/videos/<scene>/<quality>/<Class>.mp4.
    media_dir = Path("/work/media")
    cmd = [
        "manim",
        "render",
        "-qm",
        "--media_dir",
        str(media_dir),
        scene_file,
        scene_class,
    ]

    # Run from the code dir so `from base import ExplainerScene` resolves.
    result = subprocess.run(cmd, cwd=str(code_dir), capture_output=True, text=True)
    if result.returncode != 0:
        sys.stderr.write(result.stdout)
        sys.stderr.write(result.stderr)
        return result.returncode

    videos = list(media_dir.rglob("*.mp4"))
    if not videos:
        print("manim produced no .mp4 output", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(videos[0], OUT_DIR / f"{scene_class}.mp4")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
