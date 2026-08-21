# Narration script -> voiceover audio, via OpenAI's speech endpoint.
#
# `synthesize()` turns text into an audio file on disk and returns its path;
# the worker muxes it onto the render. Kept behind that one function so the
# provider can be swapped without touching the pipeline.
#
# Why OpenAI rather than a dedicated speech vendor: it reuses the key the app
# already has, and at roughly $0.015 per minute of audio a one-minute narration
# costs about a cent and a half — a fraction of what the render itself costs in
# machine time. ElevenLabs sounds better but is several times the price and
# needs its own account.
from pathlib import Path

import openai

from app.core.config import settings


class TTSNotConfigured(RuntimeError):
    """Raised when synthesis is attempted without a usable API key.

    The worker treats this as a soft failure and ships the silent render, so
    an unconfigured voiceover degrades the video rather than failing the job.
    """


def synthesize(text: str, out_dir: str) -> str:
    """Synthesize narration to an audio file under out_dir; return its path."""
    key = settings.tts_key
    if not key or key == "changeme":
        raise TTSNotConfigured(
            "No TTS key available. Set TTS_API_KEY, or LLM_API_KEY to reuse "
            "the OpenAI account already configured for codegen."
        )

    if not text.strip():
        raise TTSNotConfigured("Narration script is empty; nothing to speak.")

    out = Path(out_dir) / "voiceover.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)

    client = openai.OpenAI(api_key=key)
    response = client.audio.speech.create(
        model=settings.tts_model,
        voice=settings.tts_voice,
        input=text,
        # Delivery direction — supported by gpt-4o-mini-tts, ignored by the
        # older tts-1 models rather than rejected.
        instructions=settings.tts_instructions,
        response_format="mp3",
    )
    # Whole file at once: a minute of speech is a small download, and the
    # caller needs a complete file on disk before ffmpeg can mux it anyway.
    out.write_bytes(response.read())

    return str(out)
