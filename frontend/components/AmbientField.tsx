/**
 * Ambient backdrop for the dark surfaces.
 *
 * A flat black page reads as "unfinished" on a product whose whole subject is
 * animation, but a busy one competes with the text sitting on top of it. So
 * this is deliberately almost invisible: a handful of oversized geometric
 * primitives — the vocabulary Manim itself draws in — at three to six percent
 * opacity, drifting on 30-to-90-second cycles. The effect is that the
 * background is never quite static, not that anything is moving.
 *
 * Purely decorative, so it is `aria-hidden` and never takes pointer events.
 * It renders no state and runs no JavaScript: every bit of motion is a CSS
 * animation, which means the compositor handles it and
 * `prefers-reduced-motion` already switches it off through the global rule in
 * globals.css.
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
      {/* Big soft wash, so the corners aren't pure flat black. */}
      <div className="absolute -left-1/4 top-[-20%] h-[70vh] w-[70vh] animate-drift-a rounded-full bg-[radial-gradient(circle,rgba(255,208,40,0.08),transparent_70%)]" />
      <div className="absolute -right-1/4 bottom-[-25%] h-[80vh] w-[80vh] animate-drift-b rounded-full bg-[radial-gradient(circle,rgba(91,155,213,0.08),transparent_70%)]" />

      {/* Outlined primitives — circle, square, triangle: the shapes a Manim
          scene is built from, scaled up far past their usual size. */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        strokeWidth="1"
      >
        <g className="animate-drift-a" stroke="#F5F4F0" strokeOpacity={0.09}>
          <circle cx="180" cy="200" r="140" />
          <circle cx="180" cy="200" r="86" />
        </g>

        <g className="animate-drift-b" stroke="#F5F4F0" strokeOpacity={0.08}>
          <rect x="880" y="470" width="220" height="220" rx="8" />
          <path d="M990 520 L1070 660 L910 660 Z" />
        </g>

        {/* A lone rotating square, centred on its own box so the spin doesn't
            walk it across the screen. */}
        <g
          className="animate-spin-slow"
          stroke="#F5F4F0"
          strokeOpacity={0.07}
          style={{ transformOrigin: "620px 280px" }}
        >
          <rect x="540" y="200" width="160" height="160" />
        </g>

        {/* Axis-like guides, the faintest layer of all. */}
        <g stroke="#F5F4F0" strokeOpacity={0.05}>
          <path d="M0 640 H1200" />
          <path d="M760 0 V800" />
        </g>
      </svg>

      {/* The existing dot grid, breathing rather than sitting still. */}
      <div className="bg-dot-grid absolute inset-0 animate-breathe opacity-40" />
    </div>
  );
}
