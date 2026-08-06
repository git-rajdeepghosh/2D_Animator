# Narration script -> voiceover audio (text-to-speech provider).
#
# Provider-agnostic: `synthesize()` turns text into an audio file on disk and
# returns its path. The concrete HTTP call depends on the TTS vendor; the
# request shape below is a placeholder that most REST TTS APIs resemble
# (POST text + voice, receive audio bytes). Wire it to your provider by
# setting TTS_API_KEY / TTS_VOICE and adjusting the endpoint + payload.
from pathlib import Path

import httpx

from app.core.config import settings

# Set this to your provider's synthesis endpoint.
_TTS_ENDPOINT = ""


class TTSNotConfigured(RuntimeError):
    """Raised when synthesis is attempted without a configured provider."""


def synthesize(text: str, out_dir: str) -> str:
    """Synthesize narration to an audio file under out_dir; return its path."""
    if not _TTS_ENDPOINT or settings.tts_api_key == "changeme":
        raise TTSNotConfigured(
            "TTS provider is not configured. Set TTS_API_KEY and the endpoint "
            "in app/services/tts.py."
        )

    out = Path(out_dir) / "voiceover.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)

    with httpx.Client(timeout=60) as client:
        resp = client.post(
            _TTS_ENDPOINT,
            headers={"Authorization": f"Bearer {settings.tts_api_key}"},
            json={"text": text, "voice": settings.tts_voice, "format": "mp3"},
        )
        resp.raise_for_status()
        out.write_bytes(resp.content)

    return str(out)
