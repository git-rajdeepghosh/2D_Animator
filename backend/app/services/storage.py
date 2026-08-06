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


def store(job_id: str, src_path: str) -> str:
    """Copy a rendered file into storage keyed by job id; return its served URL."""
    dest_dir = _STORAGE_ROOT / job_id
    dest_dir.mkdir(parents=True, exist_ok=True)

    src = Path(src_path)
    dest = dest_dir / f"video{src.suffix or '.mp4'}"
    shutil.copyfile(src, dest)

    # Relative URL; the API/host is responsible for serving STORAGE_DIR.
    return f"/renders/{job_id}/{dest.name}"
