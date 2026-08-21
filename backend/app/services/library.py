# The public catalogue: videos curated by hand, grouped by subject.
#
# Backed by the filesystem rather than the database, because curating is a
# manual act — drop an MP4 into a subject folder and it appears:
#
#   storage/library/physics/why-orbits-are-ellipses.mp4
#   storage/library/maths/completing-the-square.mp4
#
# Folder name becomes the subject, filename becomes the title. Nothing to
# migrate, nothing to keep in sync, and removing a video means deleting a file.
# Distinct from `/renders`, which holds every user's generated output keyed by
# job id — this directory only ever contains what someone chose to publish.
import re
import subprocess
from pathlib import Path

from app.core.config import settings

VIDEO_SUFFIXES = {".mp4", ".webm", ".mov"}

# Duration costs an ffprobe subprocess, so it is cached per file. Keyed on
# identity *and* mtime/size so replacing a file in place invalidates the entry.
_duration_cache: dict[tuple[str, int, int], float | None] = {}


def _title_from_filename(stem: str) -> str:
    """`why-orbits-are-ellipses` -> `Why orbits are ellipses`."""
    words = re.split(r"[-_\s]+", stem.strip())
    text = " ".join(w for w in words if w)
    return text[:1].upper() + text[1:] if text else stem


def _duration(path: Path) -> float | None:
    """Length in seconds, or None if ffprobe can't read the file."""
    try:
        stat = path.stat()
    except OSError:
        return None

    key = (str(path), stat.st_mtime_ns, stat.st_size)
    if key in _duration_cache:
        return _duration_cache[key]

    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(path),
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=15,
        )
        value: float | None = float(result.stdout.strip())
    except (subprocess.SubprocessError, ValueError):
        # A malformed or half-copied file shouldn't take the whole page down;
        # the card just renders without a duration badge.
        value = None

    _duration_cache[key] = value
    return value


def list_collections() -> list[dict]:
    """Every subject folder and the videos inside it, both sorted by name."""
    root = Path(settings.library_dir)
    if not root.is_dir():
        return []

    collections = []
    for folder in sorted(p for p in root.iterdir() if p.is_dir()):
        videos = [
            {
                "id": f"{folder.name}/{f.stem}",
                "title": _title_from_filename(f.stem),
                # Served by the static mount in main.py.
                "url": f"/library-videos/{folder.name}/{f.name}",
                "duration_seconds": _duration(f),
            }
            for f in sorted(folder.iterdir())
            if f.is_file() and f.suffix.lower() in VIDEO_SUFFIXES
        ]
        # Skip empty folders so a stray directory doesn't render as a
        # collection with nothing in it.
        if videos:
            collections.append(
                {
                    "slug": folder.name,
                    "name": _title_from_filename(folder.name),
                    "videos": videos,
                }
            )
    return collections
