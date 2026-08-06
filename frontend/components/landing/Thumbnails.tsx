/**
 * Placeholder "looping video" art. Stands in for real render thumbnails —
 * flat line drawings in the Manim idiom, with one slow loop each so the
 * thumbnail areas read as motion rather than as empty boxes.
 */

const spin = (seconds: number) => ({
  transformBox: "fill-box" as const,
  transformOrigin: "center" as const,
  animation: `spin ${seconds}s linear infinite`,
});

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type ThumbProps = { className?: string };

/** Circle, inscribed triangle, sweeping radius. */
export function MathsThumb({ className = "" }: ThumbProps) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      <circle cx="100" cy="75" r="44" {...stroke} opacity={0.55} />
      <path d="M100 31 L138 97 H62 Z" {...stroke} opacity={0.9} />
      <g style={spin(16)}>
        <line x1="100" y1="75" x2="144" y2="75" {...stroke} opacity={0.7} />
        <circle cx="144" cy="75" r="3.5" fill="currentColor" />
      </g>
      <circle cx="100" cy="75" r="3" fill="currentColor" />
    </svg>
  );
}

/** Nucleus with two orbiting electrons. */
export function PhysicsThumb({ className = "" }: ThumbProps) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      <g style={spin(11)}>
        <ellipse cx="100" cy="75" rx="52" ry="21" {...stroke} opacity={0.5} />
        <circle cx="152" cy="75" r="4" fill="currentColor" />
      </g>
      <g style={spin(17)}>
        <ellipse
          cx="100"
          cy="75"
          rx="21"
          ry="52"
          {...stroke}
          opacity={0.5}
        />
        <circle cx="100" cy="23" r="4" fill="currentColor" />
      </g>
      <circle cx="100" cy="75" r="9" fill="currentColor" opacity={0.9} />
    </svg>
  );
}

/** Node graph with a scan line passing over it. */
export function ComputerThumb({ className = "" }: ThumbProps) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      <path d="M100 34 L58 78 M100 34 L142 78 M58 78 L58 116 M58 78 L100 116 M142 78 L142 116" {...stroke} opacity={0.55} />
      {[
        [100, 34],
        [58, 78],
        [142, 78],
        [58, 116],
        [100, 116],
        [142, 116],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="currentColor" />
      ))}
      {/* transform-box defaults to view-box here, so the percentage sweep
          resolves against the 200-unit viewBox rather than the bar itself. */}
      <rect
        x="0"
        y="20"
        width="14"
        height="110"
        fill="currentColor"
        opacity={0.28}
        className="animate-sweep"
      />
    </svg>
  );
}

/** Axes with a plotted curve and a bar series. */
export function GraphsThumb({ className = "" }: ThumbProps) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      <path d="M44 26 V118 H160" {...stroke} opacity={0.55} />
      {[
        [62, 96, 22],
        [82, 80, 38],
        [102, 62, 56],
        [122, 74, 44],
        [142, 48, 70],
      ].map(([x, y, h], i) => (
        <rect
          key={x}
          x={x}
          y={y}
          width="10"
          height={h}
          fill="currentColor"
          opacity={0.35}
          className="animate-drift"
          style={{ animationDelay: `${i * 220}ms` }}
        />
      ))}
      <path
        d="M62 92 L82 74 L102 58 L122 68 L142 42"
        {...stroke}
        opacity={0.95}
      />
      <circle cx="142" cy="42" r="4" fill="currentColor" />
    </svg>
  );
}

/** Waveform — used for the audio/voiceover showcase card. */
export function WaveThumb({ className = "" }: ThumbProps) {
  const bars = [18, 34, 52, 30, 66, 44, 74, 38, 56, 26, 42, 20];
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={26 + i * 13}
          y={75 - h / 2}
          width="6"
          height={h}
          rx="3"
          fill="currentColor"
          opacity={0.6}
          className="animate-drift"
          style={{ animationDelay: `${i * 140}ms` }}
        />
      ))}
    </svg>
  );
}

/** Concentric rings — generic "scene" filler. */
export function OrbitThumb({ className = "" }: ThumbProps) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      {[18, 30, 42, 54].map((r, i) => (
        <circle
          key={r}
          cx="100"
          cy="75"
          r={r}
          {...stroke}
          opacity={0.28 + i * 0.14}
        />
      ))}
      <g style={spin(14)}>
        <circle cx="154" cy="75" r="4.5" fill="currentColor" />
      </g>
    </svg>
  );
}

/** Grid + traced diagonal — generic "transform" filler. */
export function GridThumb({ className = "" }: ThumbProps) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={`v${i}`}
          x1={44 + i * 28}
          y1="26"
          x2={44 + i * 28}
          y2="120"
          {...stroke}
          opacity={0.3}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={`h${i}`}
          x1="44"
          y1={26 + i * 31}
          x2="156"
          y2={26 + i * 31}
          {...stroke}
          opacity={0.3}
        />
      ))}
      <path d="M44 120 L156 26" {...stroke} opacity={0.95} />
      <circle cx="100" cy="73" r="5" fill="currentColor" />
    </svg>
  );
}
