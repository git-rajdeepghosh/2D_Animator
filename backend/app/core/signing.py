"""Short-lived signed URLs for private render output.

A `<video>` element cannot send an Authorization header, so the obvious fix for
an unprotected /renders — require a Bearer token — would simply stop videos
playing. Putting the user's access token in the URL instead would be worse: it
grants the whole API, and video URLs get copied, embedded, and logged.

So the URL carries its own capability instead. The signature covers one exact
path and an expiry, is useless for anything else, and stops working on its own.
The API signs `video_url` on the way out, which is why nothing on the frontend
had to change.
"""
import hmac
import time
from hashlib import sha256
from urllib.parse import urlencode

from app.core.config import settings

# Long enough to watch a video and come back to it, short enough that a leaked
# URL stops working the same day.
DEFAULT_TTL_SECONDS = 6 * 60 * 60

# Marks a secret the operator never set. Checked at startup so the warning is
# loud, rather than discovered when a URL turns out to be forgeable.
INSECURE_SECRET = "changeme"


def is_configured() -> bool:
    """False when the signing secret is missing or still the placeholder."""
    return bool(settings.render_url_secret) and (
        settings.render_url_secret != INSECURE_SECRET
    )


def _signature(path: str, expires: int) -> str:
    # The path is inside the signed payload, so a signature for one video can't
    # be replayed against another.
    payload = f"{path}:{expires}".encode("utf-8")
    return hmac.new(
        settings.render_url_secret.encode("utf-8"), payload, sha256
    ).hexdigest()


def sign_path(path: str, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> str:
    """Return `path` with an expiry and signature appended."""
    expires = int(time.time()) + ttl_seconds
    query = urlencode({"expires": expires, "sig": _signature(path, expires)})
    return f"{path}?{query}"


def verify_path(path: str, expires: int | None, sig: str | None) -> bool:
    """Whether `sig` is a valid, unexpired signature for `path`."""
    if expires is None or not sig:
        return False
    if expires < int(time.time()):
        return False
    # Constant-time: a plain == leaks how much of the digest matched, which is
    # enough to forge one byte at a time.
    return hmac.compare_digest(_signature(path, expires), sig)
