"""Signed render URLs.

Rendered videos used to be served by a plain StaticFiles mount, so anyone with
a URL could read anyone's output. These cover the signature that replaced it.
"""
import time

import pytest

from app.core import signing
from app.core.config import settings

PATH = "/renders/job-abc/video.mp4"


@pytest.fixture(autouse=True)
def secret(monkeypatch):
    monkeypatch.setattr(settings, "render_url_secret", "test-secret-value")


def _params(url: str) -> dict[str, str]:
    from urllib.parse import parse_qs, urlparse

    return {k: v[0] for k, v in parse_qs(urlparse(url).query).items()}


def test_signed_url_verifies():
    p = _params(signing.sign_path(PATH))
    assert signing.verify_path(PATH, int(p["expires"]), p["sig"])


def test_signature_is_bound_to_the_path():
    """A signature for one video must not unlock another."""
    p = _params(signing.sign_path(PATH))
    assert not signing.verify_path(
        "/renders/someone-elses-job/video.mp4", int(p["expires"]), p["sig"]
    )


def test_tampering_with_expiry_invalidates():
    """Extending your own expiry must not work — it is inside the signature."""
    p = _params(signing.sign_path(PATH))
    assert not signing.verify_path(PATH, int(p["expires"]) + 86400, p["sig"])


def test_expired_signature_is_rejected():
    p = _params(signing.sign_path(PATH, ttl_seconds=-1))
    assert not signing.verify_path(PATH, int(p["expires"]), p["sig"])


def test_missing_signature_is_rejected():
    assert not signing.verify_path(PATH, int(time.time()) + 60, None)
    assert not signing.verify_path(PATH, int(time.time()) + 60, "")
    assert not signing.verify_path(PATH, None, "abc")


def test_wrong_signature_is_rejected():
    assert not signing.verify_path(PATH, int(time.time()) + 60, "0" * 64)


def test_changing_the_secret_invalidates_old_urls(monkeypatch):
    """Rotating the secret should revoke every URL already handed out."""
    p = _params(signing.sign_path(PATH))
    monkeypatch.setattr(settings, "render_url_secret", "rotated-secret")
    assert not signing.verify_path(PATH, int(p["expires"]), p["sig"])


# --- configuration detection ----------------------------------------------


def test_is_configured_false_when_unset(monkeypatch):
    monkeypatch.setattr(settings, "render_url_secret", "")
    assert not signing.is_configured()


def test_is_configured_false_for_the_placeholder(monkeypatch):
    """`changeme` from .env.example must not count as configured."""
    monkeypatch.setattr(settings, "render_url_secret", signing.INSECURE_SECRET)
    assert not signing.is_configured()


def test_is_configured_true_for_a_real_secret():
    assert signing.is_configured()


# --- serialization ---------------------------------------------------------


def test_jobread_signs_video_url_on_output():
    from datetime import datetime

    from app.schemas import JobRead

    job = JobRead(
        id="job-abc",
        project_id="p1",
        status="done",
        progress=100,
        video_url=PATH,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    signed = job.model_dump()["video_url"]
    assert signed.startswith(PATH + "?")
    assert "sig=" in signed and "expires=" in signed


def test_jobread_leaves_video_url_alone_when_unconfigured(monkeypatch):
    from datetime import datetime

    from app.schemas import JobRead

    monkeypatch.setattr(settings, "render_url_secret", "")
    job = JobRead(
        id="job-abc",
        project_id="p1",
        status="done",
        progress=100,
        video_url=PATH,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    assert job.model_dump()["video_url"] == PATH


def test_jobread_handles_a_missing_video():
    from datetime import datetime

    from app.schemas import JobRead

    job = JobRead(
        id="job-abc",
        project_id="p1",
        status="queued",
        progress=0,
        video_url=None,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    assert job.model_dump()["video_url"] is None
