# Static checks on Manim scene code before it reaches the sandbox.
#
# Spinning up a render container costs tens of seconds; a missing colon or a
# renamed class is detectable in about a millisecond. Everything here is
# structural (parse the AST, look at the class), never executed — running the
# code to find out whether it works is exactly what the sandbox is for.
#
# This is a usability guard, NOT a security boundary. It rejects code that
# cannot possibly render; it makes no attempt to decide whether code is safe.
# Isolation is the sandbox's job (see services/sandbox.py): no network,
# non-root, read-only code mount, memory/pid caps, wall-clock timeout.
import ast

from app.services.codegen import SCENE_CLASS_NAME

BASE_CLASS_NAME = "ExplainerScene"


class SceneCodeInvalid(ValueError):
    """Raised when scene code cannot render, with a message meant for the editor."""


def validate_scene_code(code: str) -> None:
    """Raise SceneCodeInvalid if `code` could never produce a render.

    Checks, in order: it parses; it defines the class the sandbox renders; that
    class derives from the injected base; and the class has a `construct`
    method for Manim to call.
    """
    if not code.strip():
        raise SceneCodeInvalid("Scene code is empty.")

    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        # exc.lineno is 1-based and matches what the editor gutter shows, so
        # the message can point straight at the offending line.
        location = f"line {exc.lineno}" if exc.lineno else "unknown line"
        raise SceneCodeInvalid(f"Syntax error on {location}: {exc.msg}") from exc

    scene = next(
        (
            node
            for node in tree.body
            if isinstance(node, ast.ClassDef) and node.name == SCENE_CLASS_NAME
        ),
        None,
    )
    if scene is None:
        raise SceneCodeInvalid(
            f"No class named `{SCENE_CLASS_NAME}` found. The renderer looks for "
            f"that exact name — rename your scene class to `{SCENE_CLASS_NAME}`."
        )

    # ast.unparse handles both `ExplainerScene` and dotted forms like
    # `base.ExplainerScene`, so compare against the rendered source text.
    bases = {ast.unparse(base) for base in scene.bases}
    if not any(base.split(".")[-1] == BASE_CLASS_NAME for base in bases):
        listed = ", ".join(sorted(bases)) or "nothing"
        raise SceneCodeInvalid(
            f"`{SCENE_CLASS_NAME}` must subclass `{BASE_CLASS_NAME}` "
            f"(currently subclasses {listed}). It provides the shared "
            "background and the title/caption helpers."
        )

    has_construct = any(
        isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and node.name == "construct"
        for node in scene.body
    )
    if not has_construct:
        raise SceneCodeInvalid(
            f"`{SCENE_CLASS_NAME}` has no `construct(self)` method. Manim calls "
            "that method to build the animation."
        )
