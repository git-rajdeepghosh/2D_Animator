"""TTS caching.

Re-rendering edited scene code reuses the narration verbatim, so without a
cache every iteration in the editor pays to synthesize identical speech. These
tests use a fake client rather than calling the API.
"""
import pytest

from app.core.config import settings
from app.services import tts


class _FakeResponse:
    def __init__(self, audio: bytes) -> None:
        self._audio = audio

    def read(self) -> bytes:
        return self._audio


class _FakeSpeech:
    """Stands in for client.audio.speech, counting synthesis calls."""

    def __init__(self, audio: bytes = b"ID3-fake-audio") -> None:
        self.audio = audio
        self.calls = 0

    def create(self, **kwargs):
        self.calls += 1
        return _FakeResponse(self.audio)


@pytest.fixture
def fake_openai(monkeypatch, tmp_path):
    """Point TTS at a temp cache and a fake client; yield the call counter."""
    monkeypatch.setattr(settings, "tts_api_key", "test-key")
    monkeypatch.setattr(settings, "tts_cache_dir", str(tmp_path / "cache"))

    speech = _FakeSpeech()

    class _Client:
        def __init__(self, *a, **kw):
            self.audio = type("A", (), {"speech": speech})()

    monkeypatch.setattr(tts.openai, "OpenAI", _Client)
    return speech


NARRATION = "A circle is the set of points equidistant from a centre."


def test_first_call_synthesizes(fake_openai, tmp_path):
    out = tts.synthesize(NARRATION, str(tmp_path / "a"))
    assert fake_openai.calls == 1
    assert open(out, "rb").read() == fake_openai.audio


def test_second_call_with_same_text_is_served_from_cache(fake_openai, tmp_path):
    first = tts.synthesize(NARRATION, str(tmp_path / "a"))
    second = tts.synthesize(NARRATION, str(tmp_path / "b"))

    assert fake_openai.calls == 1, "identical narration was synthesized twice"
    assert open(first, "rb").read() == open(second, "rb").read()
    assert first != second, "each caller still gets its own file"


def test_different_text_is_synthesized_separately(fake_openai, tmp_path):
    tts.synthesize(NARRATION, str(tmp_path / "a"))
    tts.synthesize("Something else entirely.", str(tmp_path / "b"))
    assert fake_openai.calls == 2


def test_changing_voice_invalidates_the_cache(fake_openai, tmp_path, monkeypatch):
    """Same script, different voice, must not replay the old take."""
    tts.synthesize(NARRATION, str(tmp_path / "a"))
    monkeypatch.setattr(settings, "tts_voice", "nova")
    tts.synthesize(NARRATION, str(tmp_path / "b"))
    assert fake_openai.calls == 2


def test_changing_instructions_invalidates_the_cache(
    fake_openai, tmp_path, monkeypatch
):
    tts.synthesize(NARRATION, str(tmp_path / "a"))
    monkeypatch.setattr(settings, "tts_instructions", "Speak quickly and briskly.")
    tts.synthesize(NARRATION, str(tmp_path / "b"))
    assert fake_openai.calls == 2


def test_cache_key_is_stable_across_calls():
    assert tts._cache_key(NARRATION) == tts._cache_key(NARRATION)


def test_cache_key_length_prefixing_avoids_field_collisions(monkeypatch):
    """Concatenating fields naively would make these two configs collide."""
    monkeypatch.setattr(settings, "tts_voice", "ab")
    monkeypatch.setattr(settings, "tts_instructions", "cd")
    first = tts._cache_key(NARRATION)

    monkeypatch.setattr(settings, "tts_voice", "a")
    monkeypatch.setattr(settings, "tts_instructions", "bcd")
    assert tts._cache_key(NARRATION) != first


def test_unwritable_cache_does_not_fail_synthesis(fake_openai, tmp_path, monkeypatch):
    """A broken cache must degrade to synthesizing, never break the job."""
    monkeypatch.setattr(settings, "tts_cache_dir", "/proc/nonexistent/cache")
    out = tts.synthesize(NARRATION, str(tmp_path / "a"))
    assert open(out, "rb").read() == fake_openai.audio


def test_missing_key_raises_not_configured(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "tts_api_key", "")
    monkeypatch.setattr(settings, "llm_api_key", "changeme")
    with pytest.raises(tts.TTSNotConfigured):
        tts.synthesize(NARRATION, str(tmp_path))


def test_empty_narration_raises_not_configured(fake_openai, tmp_path):
    """Nothing to speak — the worker treats this as a soft skip, not a failure."""
    with pytest.raises(tts.TTSNotConfigured):
        tts.synthesize("   ", str(tmp_path))
