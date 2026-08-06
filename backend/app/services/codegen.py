# Prompt -> narration script -> Manim scene code (LLM-driven).
#
# Two LLM calls against the Anthropic Messages API:
#   1. concept prompt      -> a short, timed narration script (source of truth)
#   2. narration script    -> a single Manim Scene subclass that animates it
#
# The generated code is constrained to a safe surface: it must subclass the
# injected `ExplainerScene` base (see backend/manim/scenes/base.py) and is run
# only inside the disposable Docker sandbox, never in this process.
from dataclasses import dataclass

import anthropic

from app.core.config import settings

# Kept in sync with the class the sandbox looks for when rendering.
SCENE_CLASS_NAME = "GeneratedScene"

_SCRIPT_SYSTEM = (
    "You are a scriptwriter for short educational explainer videos. Given a "
    "concept, write a concise voiceover narration of at most 150 words that a "
    "narrator can read in under 60 seconds. Use short, clear sentences. Return "
    "only the narration text, no headings, stage directions, or markdown."
)

_CODE_SYSTEM = (
    "You generate Python animation code using the Manim Community library for a "
    "short explainer video. You are given a narration script. Produce a single "
    f"Manim Scene subclass named `{SCENE_CLASS_NAME}` that subclasses "
    "`ExplainerScene` (already importable — do not import or define it) and "
    "visually illustrates the narration, pacing the animation to roughly match "
    "the narration length.\n\n"
    "Rules:\n"
    "- Output ONLY Python code, no markdown fences or prose.\n"
    "- Do not read files, access the network, or import anything except `manim`.\n"
    "- Define exactly one class, `" + SCENE_CLASS_NAME + "(ExplainerScene)`, with "
    "a `construct(self)` method.\n"
    "- Prefer built-in Manim mobjects (Text, MathTex, shapes, arrows) and "
    "animations (Create, Write, FadeIn, Transform)."
)


@dataclass
class Codegen:
    """Wraps the Anthropic client with the two pipeline prompts."""

    def __post_init__(self) -> None:
        self._client = anthropic.Anthropic(api_key=settings.llm_api_key)

    def narration_script(self, prompt: str) -> str:
        """Turn a plain-language concept into a timed narration script."""
        message = self._client.messages.create(
            model=settings.llm_model,
            max_tokens=1024,
            system=_SCRIPT_SYSTEM,
            thinking={"type": "adaptive"},
            messages=[{"role": "user", "content": prompt}],
        )
        return _first_text(message).strip()

    def scene_code(self, narration: str) -> str:
        """Generate a Manim scene that animates the narration.

        Uses streaming because scene code can approach the token cap and a
        non-streaming request risks an HTTP timeout.
        """
        parts: list[str] = []
        with self._client.messages.stream(
            model=settings.llm_model,
            max_tokens=8000,
            system=_CODE_SYSTEM,
            thinking={"type": "adaptive"},
            messages=[
                {
                    "role": "user",
                    "content": f"Narration script:\n\n{narration}",
                }
            ],
        ) as stream:
            message = stream.get_final_message()
        for block in message.content:
            if block.type == "text":
                parts.append(block.text)
        return _strip_code_fences("".join(parts)).strip()


def _first_text(message: anthropic.types.Message) -> str:
    for block in message.content:
        if block.type == "text":
            return block.text
    return ""


def _strip_code_fences(text: str) -> str:
    """Remove a leading/trailing ```python fence if the model added one anyway."""
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        return "\n".join(lines)
    return text
