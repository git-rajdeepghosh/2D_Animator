"""Static validation of generated / user-edited scene code.

This is the gate that keeps broken code from reaching the sandbox, so the
cases below are the ones a render would otherwise waste ~60s discovering.
"""
import pytest

from app.services.scene_validation import SceneCodeInvalid, validate_scene_code

VALID = """
from base import ExplainerScene


class GeneratedScene(ExplainerScene):
    def construct(self):
        pass
"""


def test_accepts_valid_scene():
    validate_scene_code(VALID)  # must not raise


def test_accepts_dotted_base_reference():
    """`base.ExplainerScene` is the same class, written differently."""
    validate_scene_code(
        "import base\n\n\nclass GeneratedScene(base.ExplainerScene):\n"
        "    def construct(self):\n        pass\n"
    )


def test_syntax_error_reports_the_line():
    # A line number is the whole point — the editor shows a gutter.
    with pytest.raises(SceneCodeInvalid, match="line 1"):
        validate_scene_code("class GeneratedScene(ExplainerScene)\n    pass\n")


def test_rejects_wrong_class_name():
    with pytest.raises(SceneCodeInvalid, match="GeneratedScene"):
        validate_scene_code(
            "from base import ExplainerScene\n\n\n"
            "class MyScene(ExplainerScene):\n    def construct(self):\n        pass\n"
        )


def test_rejects_wrong_base_class():
    """Subclassing manim.Scene loses the injected helpers and the background."""
    with pytest.raises(SceneCodeInvalid, match="ExplainerScene"):
        validate_scene_code(
            "from manim import Scene\n\n\n"
            "class GeneratedScene(Scene):\n    def construct(self):\n        pass\n"
        )


def test_rejects_missing_construct():
    with pytest.raises(SceneCodeInvalid, match="construct"):
        validate_scene_code(
            "from base import ExplainerScene\n\n\n"
            "class GeneratedScene(ExplainerScene):\n    x = 1\n"
        )


@pytest.mark.parametrize("code", ["", "   ", "\n\n"])
def test_rejects_empty(code):
    with pytest.raises(SceneCodeInvalid, match="empty"):
        validate_scene_code(code)


def test_does_not_execute_the_code():
    """Validation is static only — it must never run what it is checking.

    The sandbox is the thing that runs untrusted code. If validation executed
    it, the editor would be a remote code execution hole in the API process.
    """
    with pytest.raises(SceneCodeInvalid):
        # Would raise SystemExit / write a file if this were exec'd.
        validate_scene_code(
            "import sys\n"
            "raise SystemExit('validation executed the module body')\n"
        )
