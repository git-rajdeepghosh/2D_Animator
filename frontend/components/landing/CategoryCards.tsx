"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { PlayGlyph } from "./PlayGlyph";
import { useSectionProgress } from "./useSectionProgress";
import {
  ComputerThumb,
  GraphsThumb,
  MathsThumb,
  PhysicsThumb,
} from "./Thumbnails";

/**
 * Section 2 — the menu, but no longer a flat row.
 *
 * The four cards sit at staggered heights and drift vertically at different
 * rates as the section passes through the viewport, so the row never reads as
 * a straight line. Drift runs monotonically off the inherited `--p` from
 * `useSectionProgress`, and each card's drift pushes the same way as its
 * static offset — centring the drift instead would have the cards converge
 * into a near-straight row on the way in, which is the one thing this layout
 * is not supposed to do.
 *
 * The play icon no longer bobs in the middle of the thumbnail: it tracks the
 * cursor anywhere inside the card, clamped so it can never cross the rounded
 * edge.
 */

const ICON = 48;
/** Keeps the icon clear of the rounded corners at the extremes. */
const EDGE = 14;

const CATEGORIES = [
  {
    name: "Maths",
    topic: "algebra and geometry",
    fill: "bg-pastel-blue",
    Thumb: MathsThumb,
    /** Static stagger, then how far it drifts across the scroll. */
    offset: "0px",
    drift: "-74px",
  },
  {
    name: "Physics",
    topic: "mechanics and waves",
    fill: "bg-pastel-sage",
    Thumb: PhysicsThumb,
    offset: "72px",
    drift: "58px",
  },
  {
    name: "Computer science",
    topic: "data structure",
    fill: "bg-pastel-blush",
    Thumb: ComputerThumb,
    offset: "26px",
    drift: "-46px",
  },
  {
    name: "Graphs",
    topic: "data and plotting",
    fill: "bg-pastel-amber",
    Thumb: GraphsThumb,
    offset: "104px",
    drift: "82px",
  },
];

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

function CategoryCard({
  name,
  topic,
  fill,
  Thumb,
  offset,
  drift,
  coarse,
}: (typeof CATEGORIES)[number] & { coarse: boolean }) {
  const cardRef = useRef<HTMLElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);

  const place = (event: ReactMouseEvent, snap: boolean) => {
    const card = cardRef.current;
    const icon = iconRef.current;
    if (!card || !icon) return;

    const rect = card.getBoundingClientRect();
    const half = ICON / 2;
    const x = clamp(event.clientX - rect.left, half + EDGE, rect.width - half - EDGE);
    const y = clamp(event.clientY - rect.top, half + EDGE, rect.height - half - EDGE);

    // On entry, jump to the cursor with no easing — otherwise the icon glides
    // in from the card's top-left corner on the very first move.
    if (snap) icon.style.transition = "none";
    icon.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    if (snap) {
      void icon.offsetWidth;
      icon.style.transition = "";
    }
  };

  return (
    <article
      ref={cardRef}
      tabIndex={0}
      onMouseEnter={(e) => {
        if (coarse) return;
        place(e, true);
        setActive(true);
      }}
      onMouseMove={(e) => {
        if (coarse) return;
        place(e, false);
      }}
      onMouseLeave={() => setActive(false)}
      className={`group relative overflow-hidden rounded-3xl p-3 pb-6 outline-none focus-visible:ring-2 focus-visible:ring-ink lg:[transform:translateY(calc(var(--offset)+var(--drift)*var(--p,0)))] ${fill}`}
      style={
        {
          "--offset": offset,
          "--drift": drift,
        } as CSSProperties
      }
    >
      {/* Placeholder looping-video thumbnail area. */}
      <div className="relative overflow-hidden rounded-2xl bg-ink/20">
        <Thumb className="h-auto w-full text-paper" />
      </div>

      <div className="px-3 pt-5">
        <h3 className="font-display text-2xl leading-tight text-paper">
          {name}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-paper/85">
          Short animated explainers for {topic} concepts.
        </p>
      </div>

      {/* Roams the full card, not just the thumbnail. Clamped in `place` and
          clipped by the card's own overflow, so it cannot cross the radius. */}
      <span
        ref={iconRef}
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full bg-highlight text-ink duration-300 ease-out [transition-property:transform,opacity] ${
          active ? "opacity-100" : "opacity-0"
        }`}
      >
        <PlayGlyph className="h-5 w-5 translate-x-[1px]" />
      </span>

      {/* Touch devices get no hover, so the motif is pinned instead of roaming. */}
      {coarse && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-highlight text-ink"
        >
          <PlayGlyph className="h-5 w-5 translate-x-[1px]" />
        </span>
      )}
    </article>
  );
}

export function CategoryCards() {
  const sectionRef = useRef<HTMLElement>(null);
  const [coarse, setCoarse] = useState(false);

  useSectionProgress(sectionRef);

  useEffect(() => {
    setCoarse(!window.matchMedia("(hover: hover)").matches);
  }, []);

  return (
    <section
      id="categories"
      ref={sectionRef}
      className="overflow-hidden bg-paper py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Roomier on lg: the first card drifts upward into this gap. */}
        <div className="mb-14 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-24">
          <div>
            <p className="tag mb-4 text-ink-400">Categories</p>
            <h2 className="max-w-lg font-display text-[clamp(2rem,4.4vw,3.2rem)] leading-[1.05] text-ink">
              Pick a subject, or just start typing.
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-ink-400">
            Placeholder description line. Every category is a starting point,
            not a template — the script still comes from your prompt.
          </p>
        </div>

        {/* Extra bottom room so the lowest-staggered card has somewhere to
            drift into without dragging the section's height around. Only
            needed where the stagger applies. */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-start lg:pb-52">
          {CATEGORIES.map((category) => (
            <CategoryCard key={category.name} {...category} coarse={coarse} />
          ))}
        </div>
      </div>
    </section>
  );
}
