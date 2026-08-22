"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { PlayGlyph } from "./PlayGlyph";
import { useSectionProgress } from "./useSectionProgress";
import { COLLECTIONS, type Collection } from "@/components/library/collections";

/**
 * Section 2 — the library teaser, two big cards across rather than four small
 * ones. The full browsing experience lives at `/library`.
 *
 * Cards sit at staggered heights and drift vertically as the section passes
 * through the viewport, so the grid never reads as a straight line. Drift runs
 * monotonically off the inherited `--p` from `useSectionProgress`, and the two
 * rows drift in opposite directions — the grid opens up rather than closing,
 * which also guarantees a row can never drift into the one below it.
 *
 * The play icon tracks the cursor anywhere inside the card, clamped so it can
 * never cross the rounded edge.
 */

const ICON = 52;
/** Keeps the icon clear of the rounded corners at the extremes. */
const EDGE = 18;

/** Static stagger, then drift. Row 1 rises, row 2 falls: they never converge. */
const MOTION = [
  { offset: "0px", drift: "-56px" },
  { offset: "56px", drift: "-34px" },
  { offset: "22px", drift: "38px" },
  { offset: "74px", drift: "60px" },
];

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

function SubjectCard({
  collection,
  motion,
  coarse,
}: {
  collection: Collection;
  motion: (typeof MOTION)[number];
  coarse: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
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
    <div
      ref={cardRef}
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
      className={`group relative overflow-hidden rounded-[28px] border p-4 pb-8 lg:[transform:translateY(calc(var(--offset)+var(--drift)*var(--p,0)))] ${collection.fill} ${collection.border}`}
      style={
        { "--offset": motion.offset, "--drift": motion.drift } as CSSProperties
      }
    >
      <Link
        href="/library"
        className="absolute inset-0 z-10 rounded-[28px] outline-none focus-visible:ring-2 focus-visible:ring-ink"
        aria-label={`${collection.name} — browse the library`}
      />

      {/* Placeholder looping-video thumbnail area. */}
      <div
        className={`relative aspect-[16/9] overflow-hidden rounded-[20px] ${collection.deep}`}
      >
        <collection.Thumb className="absolute inset-0 h-full w-full text-ink-400" />
      </div>

      <div className="flex items-end justify-between gap-6 px-4 pt-7">
        <div>
          <h3 className="font-display text-[clamp(1.9rem,3vw,2.6rem)] font-bold leading-tight text-ink">
            {collection.name}
          </h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ink-600 sm:text-base">
            Short animated explainers for {collection.topic} concepts.
          </p>
        </div>
        <span className="tag shrink-0 whitespace-nowrap pb-1.5 text-ink-400">
          {collection.videos.length} videos
        </span>
      </div>

      {/* Roams the full card. Clamped in `place` and clipped by the card's own
          overflow, so it cannot cross the radius. */}
      <span
        ref={iconRef}
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 z-20 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-highlight text-ink duration-300 ease-out [transition-property:transform,opacity] ${
          active ? "opacity-100" : "opacity-0"
        }`}
      >
        <PlayGlyph className="h-6 w-6 translate-x-[1px]" />
      </span>

      {/* Touch devices get no hover, so the motif is pinned instead of roaming. */}
      {coarse && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-8 top-8 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-highlight text-ink"
        >
          <PlayGlyph className="h-5 w-5 translate-x-[1px]" />
        </span>
      )}
    </div>
  );
}

export function LibraryPreview() {
  const sectionRef = useRef<HTMLElement>(null);
  const [coarse, setCoarse] = useState(false);

  useSectionProgress(sectionRef);

  useEffect(() => {
    setCoarse(!window.matchMedia("(hover: hover)").matches);
  }, []);

  return (
    <section
      id="library"
      ref={sectionRef}
      className="overflow-hidden bg-paper py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Roomier on lg: the first card drifts upward into this gap. */}
        <div className="mb-14 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:mb-24">
          <div>
            <Link
              href="/library"
              className="tag group mb-5 inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-ink transition-colors duration-200 hover:bg-ink hover:text-paper"
            >
              Explore library
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
            <h2 className="max-w-xl font-display text-[clamp(2.2rem,4.6vw,3.4rem)] font-bold leading-[1.05] text-ink">
              Pick a subject, or just start typing.
            </h2>
          </div>
          <p className="max-w-xs text-sm font-medium leading-relaxed text-ink-400">
            Browse by subject to see what the animations look like. Every
            collection is a starting point, not a template — the script still
            comes from your prompt.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:items-start lg:pb-40">
          {COLLECTIONS.map((collection, i) => (
            <SubjectCard
              key={collection.slug}
              collection={collection}
              motion={MOTION[i]}
              coarse={coarse}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
