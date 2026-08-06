/**
 * The single recurring motif: intro path → CTA bar → docked orb → card hover.
 * Always the same triangle, always ink-on-yellow.
 */
export function PlayGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M9 6.6 17.4 12 9 17.4Z" fill="currentColor" />
    </svg>
  );
}

/** Yellow disc carrying the glyph. Sized by the caller. */
export function PlayOrb({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-highlight text-ink ${className}`}
    >
      <PlayGlyph className="h-[45%] w-[45%] translate-x-[4%]" />
    </span>
  );
}
