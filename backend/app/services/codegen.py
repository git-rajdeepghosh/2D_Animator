# Prompt -> narration script -> Manim scene code. Two calls, no intermediate
# storyboard stage:
#   1. concept prompt      -> narration script, via Gemini (fast/cheap; the
#                              script is short, so a heavier model buys little),
#                              falling back to a nano-tier OpenAI model when
#                              Gemini is unavailable — see narration_script()
#   2. narration script    -> a single Manim Scene subclass, via OpenAI
#                              (a reasoning model, run at high effort)
#
# The generated code is constrained to a safe surface: it must subclass the
# injected `ExplainerScene` base (see backend/manim/scenes/base.py) and is run
# only inside the disposable Docker sandbox, never in this process.
import logging
from dataclasses import dataclass

import openai
from google import genai
from google.genai import types as genai_types

from app.core.config import settings

logger = logging.getLogger(__name__)

# Kept in sync with the class the sandbox looks for when rendering.
SCENE_CLASS_NAME = "GeneratedScene"

# How many times to re-ask when the model returns an empty completion.
# Not a config knob: this is a property of how reasoning budgets behave,
# not something an operator should be tuning per deployment.
_EMPTY_COMPLETION_ATTEMPTS = 2


class CodegenError(RuntimeError):
    """Raised when a provider returns nothing usable for a pipeline stage."""


def _thinking_config(model: str) -> genai_types.ThinkingConfig:
    """Build the thinking config matching the configured Gemini generation.

    The knob was renamed across generations and the two are not
    interchangeable — sending the wrong one is rejected — so it is keyed off
    the model id rather than hardcoded:
      * 3.x  -> `thinking_level`, a string ("low" / "medium" / "high")
      * 2.5  -> `thinking_budget`, an int (0 disables thinking on Flash)
    """
    if model.startswith("gemini-3"):
        return genai_types.ThinkingConfig(thinking_level="low")
    return genai_types.ThinkingConfig(thinking_budget=0)

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
    "`ExplainerScene` and visually illustrates the narration, pacing the "
    "animation to roughly match the narration length.\n\n"
    "Rules:\n"
    "- Output ONLY Python code, no markdown fences or prose.\n"
    # base.py is copied next to the generated scene and Manim is invoked with
    # that directory as cwd, so this import resolves. It is required: without
    # it the class body raises NameError before Manim can render anything.
    "- Start with `from base import ExplainerScene`. Do not define that class "
    "yourself.\n"
    "- Do not read files, access the network, or import anything except "
    "`manim` and the `base` import above.\n"
    "- Define exactly one class, `" + SCENE_CLASS_NAME + "(ExplainerScene)`, with "
    "a `construct(self)` method.\n"
    "- Prefer built-in Manim mobjects (Text, MathTex, shapes, arrows) and "
    "animations (Create, Write, FadeIn, Transform).\n"
    # Layout guidance. Measured at ~125 extra input tokens per job (fractions
    # of a cent) against the cost of a wasted ~60s render plus a full
    # regeneration, so it pays for itself many times over.
    #
    # Naming the base-class helpers is the highest-value part: without it the
    # model hand-computes absolute coordinates, which is where overlap comes
    # from. The helpers already pin to edges and arrange with a buff, so using
    # them prevents collisions structurally rather than by instruction.
    "- `ExplainerScene` gives you `self.title(str)` (top), `self.caption(str)` "
    "(bottom), `self.stack(*mobjects)` (vertical), `self.row(*mobjects)` "
    "(horizontal), `self.fit(mobject)` (scales a group to fill the content "
    "area) and `self.clear_stage()` (fades out everything on screen). Use "
    "these instead of positioning by hand.\n"
    # The goal is stated as "fill the frame" rather than "don't overlap":
    # a small tight cluster in the centre satisfies a non-overlap rule
    # perfectly, which is exactly the failure this is meant to prevent.
    "- Fill the frame. Assemble each layout with `stack`/`row`, then pass the "
    "group to `self.fit(...)` so it uses the screen instead of sitting as a "
    "small cluster in the middle. Favour a few large elements over many small "
    "ones, and never let them overlap.\n"
    # A range rather than a minimum: given a floor, the floor gets used.
    "- Space generously — buff between 0.8 and 1.5. If a layout still feels "
    "tight, show fewer things at once rather than shrinking them.\n"
    "- Clear the stage between sections: call `self.clear_stage()` before "
    "introducing elements where something already is.\n"
    "- Stay inside the frame: |x| < 7, |y| < 4."
)


@dataclass
class Codegen:
    """Wraps both provider clients with the two pipeline prompts."""

    def __post_init__(self) -> None:
        self._openai = openai.OpenAI(
            api_key=settings.llm_api_key,
            max_retries=settings.llm_max_retries,
        )
        self._gemini = genai.Client(api_key=settings.gemini_api_key)

    def narration_script(self, prompt: str) -> str:
        """Turn a plain-language concept into a timed narration script.

        Gemini writes the script by default, with OpenAI as an automatic
        fallback. The free Gemini tier returns 503 ("high demand") and 429 in
        bursts, and losing the whole job to a transient upstream blip is
        expensive in the wrong way — the ~60s render that would have followed
        never happens, and the user just sees a failure.

        The fallback is deliberately broad rather than matching specific
        status codes: any narration failure is recoverable this way, and the
        alternative is a dead job. A persistent Gemini problem (bad key, wrong
        model) still shows up loudly in the worker log.
        """
        if settings.narration_provider == "openai":
            return self._narration_openai(prompt)

        try:
            return self._narration_gemini(prompt)
        except Exception as exc:  # noqa: BLE001 — any failure is recoverable here
            logger.warning(
                "Narration via %s failed (%s: %s); falling back to %s.",
                settings.gemini_model,
                type(exc).__name__,
                exc,
                settings.narration_fallback_model,
            )
            return self._narration_openai(prompt)

    def _narration_gemini(self, prompt: str) -> str:
        """Narration via Gemini.

        Thinking is kept minimal: the script is a couple of sentences, so
        deeper reasoning only adds latency and cost.
        """
        response = self._gemini.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                system_instruction=_SCRIPT_SYSTEM,
                max_output_tokens=1024,
                thinking_config=_thinking_config(settings.gemini_model),
            ),
        )
        script = (response.text or "").strip()
        if not script:
            raise CodegenError(
                f"{settings.gemini_model} returned an empty narration script."
            )
        return script

    def _narration_openai(self, prompt: str) -> str:
        """Narration via OpenAI, on a nano-tier model.

        `max_completion_tokens` is set well above the ~200 tokens a script
        needs because on reasoning models it budgets reasoning *and* visible
        output together — too tight a cap returns an empty string rather than
        an error. `reasoning_effort` is left unset: nano-tier support for it
        varies, and sending an unsupported value is a 400.
        """
        model = settings.narration_fallback_model
        response = self._openai.chat.completions.create(
            model=model,
            max_completion_tokens=2000,
            messages=[
                {"role": "system", "content": _SCRIPT_SYSTEM},
                {"role": "user", "content": prompt},
            ],
        )
        choice = response.choices[0]
        script = (choice.message.content or "").strip()
        if not script:
            raise CodegenError(
                f"{model} returned an empty narration script "
                f"(finish_reason={choice.finish_reason!r})."
            )
        return script

    def scene_code(self, narration: str) -> str:
        """Generate a Manim scene that animates the narration (OpenAI).

        Streams because scene code can approach the token cap and a
        non-streaming request risks an HTTP timeout. `max_completion_tokens`
        (not `max_tokens`) and `reasoning_effort` are the reasoning-model
        parameters; sampling knobs like `temperature` are rejected.

        Note `max_completion_tokens` budgets reasoning tokens *and* visible
        output together. If reasoning exhausts it the request still succeeds,
        just with empty content and finish_reason="length".

        That case is retried here rather than left to the SDK: an empty
        completion arrives as a perfectly good HTTP 200, so the client's own
        retry (which covers 429s and 5xxs) never fires for it. The budget is
        usually only marginally exceeded, so asking again generally works.
        Transport-level failures are left to the SDK, which already backs off
        exponentially — see Settings.llm_max_retries.
        """
        finish_reason: str | None = None

        for attempt in range(1, _EMPTY_COMPLETION_ATTEMPTS + 1):
            code, finish_reason = self._scene_code_once(narration)
            if code:
                return code
            logger.warning(
                "%s returned no scene code (finish_reason=%r), attempt %d of %d.",
                settings.llm_model,
                finish_reason,
                attempt,
                _EMPTY_COMPLETION_ATTEMPTS,
            )

        hint = (
            " The reasoning budget consumed max_completion_tokens before any "
            "code was emitted; raise it or lower reasoning_effort."
            if finish_reason == "length"
            else ""
        )
        raise CodegenError(
            f"{settings.llm_model} returned no scene code after "
            f"{_EMPTY_COMPLETION_ATTEMPTS} attempts "
            f"(finish_reason={finish_reason!r}).{hint}"
        )

    def _scene_code_once(self, narration: str) -> tuple[str, str | None]:
        """One codegen request. Returns (code, finish_reason); code may be ""."""
        stream = self._openai.chat.completions.create(
            model=settings.llm_model,
            max_completion_tokens=16000,
            reasoning_effort="high",
            messages=[
                {"role": "system", "content": _CODE_SYSTEM},
                {"role": "user", "content": f"Narration script:\n\n{narration}"},
            ],
            stream=True,
        )

        parts: list[str] = []
        finish_reason: str | None = None
        for chunk in stream:
            if not chunk.choices:
                continue
            choice = chunk.choices[0]
            if choice.delta.content:
                parts.append(choice.delta.content)
            if choice.finish_reason:
                finish_reason = choice.finish_reason

        return _strip_code_fences("".join(parts)).strip(), finish_reason


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
