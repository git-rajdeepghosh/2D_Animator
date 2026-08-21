# Base scene helpers/templates injected into generated Manim code.
#
# Generated scenes subclass ExplainerScene instead of manim.Scene. This gives
# every generated video a consistent look (background, title/caption helpers)
# and a single place to enforce house style, without the LLM having to
# reproduce boilerplate each time.
from manim import DOWN, ORIGIN, RIGHT, UP, FadeOut, Mobject, Scene, Text, VGroup

# Manim's default frame is 14.22 x 8 world units. `title()` and `caption()`
# occupy bands at the top and bottom, so content sits in the middle. These are
# the dimensions of that middle band, with margins already subtracted — laying
# content out to fill them is what stops scenes looking like a small cluster
# marooned in the centre of the screen.
CONTENT_WIDTH = 12.0
CONTENT_HEIGHT = 4.6


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

    def stack(self, *mobjects, buff: float = 0.8) -> VGroup:
        """Arrange mobjects vertically.

        The default gap is deliberately generous. A small default reads as a
        floor to work from, and the result is content bunched together in the
        middle of an otherwise empty frame; pair this with `fit` to spread the
        group across the space that's actually available.
        """
        group = VGroup(*mobjects)
        group.arrange(DOWN, buff=buff)
        return group

    def row(self, *mobjects, buff: float = 1.2) -> VGroup:
        """Arrange mobjects horizontally.

        The counterpart to `stack`. Without it, anything side by side has to be
        placed with hand-computed coordinates, which is where cramped and
        overlapping layouts come from.
        """
        group = VGroup(*mobjects)
        group.arrange(RIGHT, buff=buff)
        return group

    def fit(
        self,
        mobject: Mobject,
        width: float = CONTENT_WIDTH,
        height: float = CONTENT_HEIGHT,
    ) -> Mobject:
        """Scale `mobject` to fill the content area and centre it there.

        This is the one that makes a scene use its screen. Build the layout at
        whatever size is convenient, then hand it here and it is scaled to the
        band between the title and caption — up as readily as down, since the
        usual failure is content that is too small rather than too large.

        Returns the same mobject so it can be used inline.
        """
        if mobject.width <= 0 or mobject.height <= 0:
            # A group with no extent (empty, or a single zero-size mobject)
            # has no meaningful scale factor.
            return mobject

        mobject.scale(min(width / mobject.width, height / mobject.height))
        mobject.move_to(ORIGIN)
        return mobject

    def clear_stage(self, *keep: Mobject) -> None:
        """Fade out everything currently on screen, except any `keep` mobjects.

        Elements piling up is the most common way a generated scene becomes
        unreadable: a new section is introduced while the previous one is still
        on screen. Collapsing "remove what's there" into one call makes the
        tidy path the easy one, and costs the model far fewer tokens than
        assembling a FadeOut group by hand each time.
        """
        doomed = [m for m in self.mobjects if m not in keep]
        if not doomed:
            # Manim raises on an empty animation list, and an empty stage is a
            # perfectly ordinary thing for generated code to ask to clear.
            return
        self.play(*(FadeOut(m) for m in doomed))
