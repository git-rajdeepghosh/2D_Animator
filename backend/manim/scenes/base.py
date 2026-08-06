# Base scene helpers/templates injected into generated Manim code.
#
# Generated scenes subclass ExplainerScene instead of manim.Scene. This gives
# every generated video a consistent look (background, title/caption helpers)
# and a single place to enforce house style, without the LLM having to
# reproduce boilerplate each time.
from manim import DOWN, UP, Scene, Text, VGroup


class ExplainerScene(Scene):
    """Common base for generated explainer scenes.

    Sets a dark background and exposes small helpers for a title and a caption
    line. Generated code overrides `construct` and may call these helpers.
    """

    background_color = "#0B0D12"
    accent_color = "#6366F1"

    def setup(self) -> None:
        super().setup()
        self.camera.background_color = self.background_color

    def title(self, text: str) -> Text:
        """Return a styled title mobject pinned near the top of the frame."""
        label = Text(text, font_size=42, color="#FFFFFF", weight="BOLD")
        label.to_edge(UP, buff=0.6)
        return label

    def caption(self, text: str) -> Text:
        """Return a styled caption mobject pinned near the bottom of the frame."""
        label = Text(text, font_size=28, color="#D1D5DB")
        label.to_edge(DOWN, buff=0.6)
        return label

    def stack(self, *mobjects, buff: float = 0.4) -> VGroup:
        """Arrange mobjects in a vertical group (convenience for generated code)."""
        group = VGroup(*mobjects)
        group.arrange(DOWN, buff=buff)
        return group
