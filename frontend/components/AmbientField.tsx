/**
 * Ambient backdrop for the dark surfaces.
 *
 * Flat black reads as unfinished on a product about animation, but a busy
 * backdrop competes with the text over it. So this is two things only: light
 * bleeding in from opposite corners, and a dot grid that breathes. Both drift
 * on 20-to-50-second cycles, so the page is never quite static without
 * anything ever being legible enough to look at.
 *
 * An earlier version also drew outlined circles, squares and triangles — the
 * shapes Manim itself is built from. They were too literal and pulled focus,
 * so they are gone; the grid and the corner light do the same job quietly.
 *
 * Purely decorative, so it is `aria-hidden` and never takes pointer events.
 * No state and no JavaScript: every bit of motion is a CSS animation, which
 * means the compositor handles it and `prefers-reduced-motion` already
 * switches it off through the global rule in globals.css.
 *
 * The parent must be `relative isolate`, not just `relative`. This sits at
 * `-z-10`, and a negative z-index element paints behind the backgrounds of
 * block-level descendants in its stacking context — so without `isolate`
 * forming one, any ancestor carrying `bg-ink` paints straight over it and the
 * whole layer silently disappears. `position: relative` alone does not create
 * a stacking context; `isolation: isolate` does.
 */
export function AmbientField() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Light from two opposite corners, so the frame never reads as flat.
          Oversized and pushed past the edge, so what shows is the middle of
          the falloff rather than a circle with a visible boundary. */}
      <div className="absolute -left-[15%] -top-[25%] h-[85vh] w-[85vh] animate-drift-a rounded-full bg-[radial-gradient(circle,rgba(255,208,40,0.10),transparent_68%)]" />
      <div className="absolute -bottom-[30%] -right-[15%] h-[95vh] w-[95vh] animate-drift-b rounded-full bg-[radial-gradient(circle,rgba(91,155,213,0.10),transparent_68%)]" />

      {/* The dot grid, breathing rather than sitting still. */}
      <div className="bg-dot-grid absolute inset-0 animate-breathe opacity-50" />
    </div>
  );
}
