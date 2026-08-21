"""Host-path translation and scratch cleanup.

Both of these are load-bearing and neither is obvious from reading the code:
the worker runs inside a container but drives the *host* Docker daemon, which
resolves bind-mount sources on the host. Getting this wrong silently mounts an
empty directory, so every render fails with "no video output" and nothing
points at the cause.
"""
from pathlib import Path

import pytest

from app.core.config import settings
from app.services import sandbox


def test_host_path_is_identity_when_not_containerised(monkeypatch):
    """No host dir configured means the worker runs on the host: paths agree."""
    monkeypatch.setattr(settings, "sandbox_work_host_dir", "")
    p = Path(settings.sandbox_work_dir) / "2danim-abc" / "code"
    assert sandbox._host_path(p) == str(p)


def test_host_path_rebases_onto_the_host_directory(monkeypatch):
    monkeypatch.setattr(settings, "sandbox_work_dir", "/data/work")
    monkeypatch.setattr(settings, "sandbox_work_host_dir", "/srv/app/storage/work")
    got = sandbox._host_path(Path("/data/work/2danim-abc/out"))
    assert got == "/srv/app/storage/work/2danim-abc/out"


def test_host_path_normalises_windows_separators(monkeypatch):
    """Docker Desktop accepts C:/... but chokes on mixed separators."""
    monkeypatch.setattr(settings, "sandbox_work_dir", "/data/work")
    monkeypatch.setattr(
        settings, "sandbox_work_host_dir", r"C:\Users\dev\project\storage\work"
    )
    got = sandbox._host_path(Path("/data/work/2danim-abc/code"))
    assert got == "C:/Users/dev/project/storage/work/2danim-abc/code"
    assert "\\" not in got


def test_host_path_tolerates_trailing_slash(monkeypatch):
    monkeypatch.setattr(settings, "sandbox_work_dir", "/data/work")
    monkeypatch.setattr(settings, "sandbox_work_host_dir", "/srv/work/")
    assert sandbox._host_path(Path("/data/work/j/out")) == "/srv/work/j/out"


def test_cleanup_removes_the_job_directory(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "sandbox_work_dir", str(tmp_path))
    job = tmp_path / "2danim-xyz"
    (job / "out").mkdir(parents=True)
    video = job / "out" / "GeneratedScene.mp4"
    video.write_bytes(b"fake")

    sandbox.cleanup(str(video))

    assert not job.exists()


def test_cleanup_refuses_paths_outside_the_work_root(tmp_path, monkeypatch):
    """The guard that stops a malformed path becoming an arbitrary delete."""
    work_root = tmp_path / "work"
    work_root.mkdir()
    monkeypatch.setattr(settings, "sandbox_work_dir", str(work_root))

    # Lives somewhere else entirely — cleanup must leave it alone.
    outside = tmp_path / "important" / "out"
    outside.mkdir(parents=True)
    victim = outside / "video.mp4"
    victim.write_bytes(b"precious")

    sandbox.cleanup(str(victim))

    assert victim.exists(), "cleanup deleted a directory outside the work root"


def test_cleanup_ignores_a_missing_directory(tmp_path, monkeypatch):
    """Called twice, or after a failure already cleaned up — must not raise."""
    monkeypatch.setattr(settings, "sandbox_work_dir", str(tmp_path))
    ghost = tmp_path / "2danim-gone" / "out" / "video.mp4"
    sandbox.cleanup(str(ghost))  # no exception
