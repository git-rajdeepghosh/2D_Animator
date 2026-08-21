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
import hashlib
import logging
import os
import shutil
from pathlib import Path

import openai

from app.core.config import settings

logger = logging.getLogger(__name__)


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

    cached = Path(settings.tts_cache_dir) / f"{_cache_key(text)}.mp3"
    if cached.is_file():
        # Re-rendering edited scene code reuses the narration verbatim, so this
        # is the common path once someone starts iterating in the editor.
        logger.info("TTS cache hit for %s", cached.name)
        shutil.copyfile(cached, out)
        return str(out)

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
    audio = response.read()
    out.write_bytes(audio)
    _store_in_cache(cached, audio)

    return str(out)


def _cache_key(text: str) -> str:
    """Digest of everything that changes the audio.

    The voice and delivery instructions are part of the key, not just the
    script: changing either should produce new audio rather than silently
    replaying the old take.
    """
    digest = hashlib.sha256()
    for part in (
        text,
        settings.tts_model,
        settings.tts_voice,
        settings.tts_instructions,
    ):
        # Length-prefixed so that moving a boundary between fields can't
        # collide with a different set of values.
        digest.update(f"{len(part)}:{part}".encode("utf-8"))
    return digest.hexdigest()


def _store_in_cache(path: Path, audio: bytes) -> None:
    """Write audio into the cache, or skip if that isn't possible.

    Written to a temporary file and then renamed, because rename is atomic:
    concurrent workers rendering the same narration would otherwise be able to
    read a half-written file. A cache failure is never fatal — the audio has
    already been delivered to the caller.
    """
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_name(f"{path.name}.{os.getpid()}.tmp")
        tmp.write_bytes(audio)
        tmp.replace(path)
    except OSError as exc:
        logger.warning("Could not cache TTS audio at %s: %s", path, exc)
