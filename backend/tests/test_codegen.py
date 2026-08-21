"""Codegen behaviour that does not require calling a provider.

Covers the two failure modes that cost real time this session: a provider
parameter that was silently wrong for the configured model, and a "successful"
response carrying no content.
"""
import pytest

from app.core.config import settings
from app.services import codegen
from app.services.codegen import Codegen, CodegenError, _strip_code_fences


class _NoNetworkCodegen(Codegen):
    """Codegen without the client construction, which would need real keys."""

    def __post_init__(self) -> None:  # noqa: D105 - deliberately does nothing
        pass


# --- Gemini thinking config is generation-specific -------------------------
# 3.x takes a string `thinking_level`, 2.5 takes an integer `thinking_budget`,
# and sending the wrong one is rejected by the API.


def test_thinking_config_uses_level_for_gemini_3():
    cfg = codegen._thinking_config("gemini-3.7-flash")
    # The SDK normalises the string into a ThinkingLevel enum, so compare the
    # underlying value rather than the representation it happens to use.
    level = getattr(cfg.thinking_level, "value", cfg.thinking_level)
    assert str(level).lower() == "low"
    assert cfg.thinking_budget is None


def test_thinking_config_uses_budget_for_gemini_25():
    cfg = codegen._thinking_config("gemini-2.5-flash")
    assert cfg.thinking_budget == 0
    assert cfg.thinking_level is None


# --- fence stripping -------------------------------------------------------


def test_strips_python_tagged_fence():
    assert _strip_code_fences("```python\nx = 1\n```") == "x = 1"


def test_strips_bare_fence():
    assert _strip_code_fences("```\nx = 1\n```") == "x = 1"


def test_leaves_unfenced_code_alone():
    assert _strip_code_fences("x = 1\n") == "x = 1\n"


def test_does_not_mangle_inner_backticks():
    code = "```python\ns = '```'\n```"
    assert _strip_code_fences(code) == "s = '```'"


# --- empty-completion retry ------------------------------------------------
# An empty completion arrives as HTTP 200, so the SDK's own retry never fires.


def test_scene_code_retries_an_empty_completion(monkeypatch):
    calls = {"n": 0}

    def flaky(self, narration):
        calls["n"] += 1
        if calls["n"] == 1:
            return "", "length"
        return "class GeneratedScene: pass", "stop"

    monkeypatch.setattr(Codegen, "_scene_code_once", flaky)
    assert _NoNetworkCodegen().scene_code("x") == "class GeneratedScene: pass"
    assert calls["n"] == 2


def test_scene_code_gives_up_with_a_useful_message(monkeypatch):
    monkeypatch.setattr(Codegen, "_scene_code_once", lambda self, n: ("", "length"))

    with pytest.raises(CodegenError) as exc:
        _NoNetworkCodegen().scene_code("x")

    message = str(exc.value)
    # The operator needs to know it was the token budget, not a dead provider.
    assert "max_completion_tokens" in message
    assert "length" in message


def test_scene_code_does_not_retry_a_good_response(monkeypatch):
    calls = {"n": 0}

    def once(self, narration):
        calls["n"] += 1
        return "class GeneratedScene: pass", "stop"

    monkeypatch.setattr(Codegen, "_scene_code_once", once)
    _NoNetworkCodegen().scene_code("x")
    assert calls["n"] == 1


# --- narration provider fallback -------------------------------------------


def test_narration_falls_back_to_openai_when_gemini_fails(monkeypatch):
    """A transient Gemini 503 must not take the whole job down with it."""
    monkeypatch.setattr(settings, "narration_provider", "gemini")

    def boom(self, prompt):
        raise RuntimeError("503 UNAVAILABLE")

    monkeypatch.setattr(Codegen, "_narration_gemini", boom)
    monkeypatch.setattr(Codegen, "_narration_openai", lambda self, p: "fallback script")

    assert _NoNetworkCodegen().narration_script("x") == "fallback script"


def test_narration_provider_openai_skips_gemini_entirely(monkeypatch):
    monkeypatch.setattr(settings, "narration_provider", "openai")

    def should_not_run(self, prompt):
        raise AssertionError("Gemini was called despite narration_provider=openai")

    monkeypatch.setattr(Codegen, "_narration_gemini", should_not_run)
    monkeypatch.setattr(Codegen, "_narration_openai", lambda self, p: "direct")

    assert _NoNetworkCodegen().narration_script("x") == "direct"


def test_narration_prefers_gemini_when_it_works(monkeypatch):
    monkeypatch.setattr(settings, "narration_provider", "gemini")
    monkeypatch.setattr(Codegen, "_narration_gemini", lambda self, p: "gemini script")
    monkeypatch.setattr(
        Codegen,
        "_narration_openai",
        lambda self, p: pytest.fail("fell back despite Gemini succeeding"),
    )

    assert _NoNetworkCodegen().narration_script("x") == "gemini script"
