# Persist final MP4 + assets; return served URLs.
#
# Local-filesystem implementation: renders are written under STORAGE_DIR
# (mounted to ./storage/renders in dev) and served back as a relative URL.
# Swap this module for an S3/CDN-backed one in production without touching the
# pipeline — the interface is just `store(job_id, src_path) -> url`.
import shutil
from pathlib import Path

from app.core.config import settings

_STORAGE_ROOT = Path(settings.storage_dir)


def store(job_id: str, src_path: str, name: str | None = None) -> str:
    """Copy a rendered file into storage keyed by job id; return its served URL.

    `name` overrides the destination filename, so a job's directory can hold
    more than just the video — the poster frame lives alongside it.
    """
    dest_dir = _STORAGE_ROOT / job_id
    dest_dir.mkdir(parents=True, exist_ok=True)

    src = Path(src_path)
    dest = dest_dir / (name or f"video{src.suffix or '.mp4'}")
    # A file already sitting at its destination is stored by definition;
    # copyfile would raise SameFileError rather than treat it as a no-op.
    if src.resolve() != dest.resolve():
        shutil.copyfile(src, dest)

    # Relative URL; the API/host is responsible for serving STORAGE_DIR.
    return f"/renders/{job_id}/{dest.name}"


def delete(job_id: str) -> None:
    """Remove everything stored for a job. Safe to call when nothing exists.

    Deleting the row without this would leave the video and poster on disk
    forever, invisible to the app and impossible to attribute to anything.
    """
    target = (_STORAGE_ROOT / job_id).resolve()
    root = _STORAGE_ROOT.resolve()
    # job_id reaches here from a URL path, so confirm the resolved directory is
    # genuinely inside the storage root before recursing into it.
    if target.parent != root:
        return
    shutil.rmtree(target, ignore_errors=True)
