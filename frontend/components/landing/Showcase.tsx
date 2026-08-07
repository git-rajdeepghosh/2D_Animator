"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useSectionProgress } from "./useSectionProgress";
import {
  GraphsThumb,
  GridThumb,
  MathsThumb,
  OrbitThumb,
  PhysicsThumb,
  WaveThumb,
} from "./Thumbnails";

/**
 * Section 3 — proof, not menu.
 *
 * The heading sits dead centre of the stage with the cards ringed around it.
 * As the section travels up the viewport they drive hard outward, clearing the
 * viewport edges entirely by the time the section leaves — the ring opens up
 * around the text rather than scrolling past it.
 *
 * Each card carries the outward vector for its own corner as `--ux`/`--uy`,
 * scaled by the section's inherited `--p`. The resting arrangement is the
 * tightest the ring ever gets, so the cards only ever open away from the
 * heading and never track back across it.
 *
 * The push is mostly horizontal by design. The section has to clip (otherwise
 * cards leaving sideways would widen the page), so a large vertical component
 * would slice cards in half against the section's own top and bottom edges
 * while they were still on screen. Sideways they simply leave the frame.
 *
 * Below `lg` the absolute ring is dropped for a plain two-column grid with the
 * heading above it — a radial layout has nowhere to go on a phone.
 */

type Work = {
  tag: string;
  caption: string;
  Thumb: (props: { className?: string }) => JSX.Element;
  panel: string;
  /** Inner thumbnail panel: the same hue as the card, a step deeper. */
  inner: string;
  aspect: string;
  /** Desktop placement, as percentages of the stage. */
  x: string;
  y: string;
  w: string;
  /** Outward push, added to the resting radius as the section scrolls by. */
  ux: string;
  uy: string;
  /** Resting tilt. */
  rot: string;
  delay: string;
};

const WORKS: Work[] = [
  {
    tag: "Featured",
    caption: "Why π shows up in a circle's area",
    Thumb: MathsThumb,
    panel: "bg-card-blue",
    inner: "bg-card-blue-deep",
    aspect: "aspect-[4/3]",
    x: "8%",
    y: "6%",
    w: "17%",
    ux: "-430px",
    uy: "-180px",
    rot: "-1.6deg",
    delay: "0ms",
  },
  {
    tag: "Featured",
    caption: "A binary search, one step at a time",
    Thumb: GridThumb,
    panel: "bg-card-blush",
    inner: "bg-card-blush-deep",
    aspect: "aspect-[16/10]",
    x: "76%",
    y: "4%",
    w: "18%",
    ux: "430px",
    uy: "-170px",
    rot: "1.4deg",
    delay: "80ms",
  },
  {
    tag: "New",
    caption: "Reading a distribution properly",
    Thumb: GraphsThumb,
    panel: "bg-card-amber",
    inner: "bg-card-amber-deep",
    aspect: "aspect-[4/3]",
    x: "1%",
    y: "40%",
    w: "15%",
    ux: "-420px",
    uy: "-20px",
    rot: "2deg",
    delay: "160ms",
  },
  {
    tag: "Popular",
    caption: "Orbital resonance, slowed right down",
    Thumb: OrbitThumb,
    panel: "bg-card-blue",
    inner: "bg-card-blue-deep",
    aspect: "aspect-[4/3]",
    x: "84%",
    y: "43%",
    w: "15%",
    ux: "420px",
    uy: "20px",
    rot: "-1.8deg",
    delay: "120ms",
  },
  {
    tag: "Selected",
    caption: "Momentum, before and after impact",
    Thumb: PhysicsThumb,
    panel: "bg-card-sage",
    inner: "bg-card-sage-deep",
    aspect: "aspect-[16/10]",
    x: "14%",
    y: "71%",
    w: "18%",
    ux: "-440px",
    uy: "200px",
    rot: "1.5deg",
    delay: "220ms",
  },
  {
    tag: "Staff pick",
    caption: "How a voiceover gets timed to a scene",
    Thumb: WaveThumb,
    panel: "bg-card-blush",
    inner: "bg-card-blush-deep",
    aspect: "aspect-[4/3]",
    x: "70%",
    y: "73%",
    w: "17%",
    ux: "450px",
    uy: "190px",
    rot: "-2deg",
    delay: "280ms",
  },
];

export function Showcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState(false);

  useSectionProgress(sectionRef);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    if (!("IntersectionObserver" in window)) {
      setSettled(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSettled(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // Extra room above and below on lg: the ring opens past the stage box and
  // the section clips, so the cards need somewhere to travel into.
  return (
    <section
      id="showcase"
      ref={sectionRef}
      className="overflow-hidden bg-ink py-24 sm:py-32 lg:py-48"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Heading, above the grid on small screens and dead centre of the
            ring on large ones. */}
        <div className="mx-auto mb-16 max-w-2xl text-center lg:hidden">
          <p className="tag mb-5 text-paper/40">Showcase</p>
          <h2 className="font-display text-[clamp(2.1rem,5vw,3.6rem)] font-bold leading-[1.05] text-paper">
            A few things people have made
          </h2>
          <p className="mx-auto mt-6 max-w-md text-sm font-medium leading-relaxed text-paper/55 sm:text-base">
            Placeholder subheading. Every one of these started as a single
            sentence typed into the bar above.
          </p>
        </div>

        <div
          ref={stageRef}
          className={`relative grid grid-cols-1 gap-10 sm:grid-cols-2 lg:block lg:h-[860px] ${
            settled ? "is-settled" : ""
          }`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 hidden -translate-y-1/2 px-4 text-center lg:block">
            {/* inline-block so the label's box hugs its text — as a full-width
                block it reaches across the whole ring. */}
            <p className="tag mb-5 inline-block text-paper/40">Showcase</p>
            <h2 className="mx-auto max-w-xl font-display text-[clamp(2.1rem,5vw,3.6rem)] font-bold leading-[1.05] text-paper">
              A few things people have made
            </h2>
            <p className="mx-auto mt-6 max-w-md text-sm font-medium leading-relaxed text-paper/55 sm:text-base">
              Placeholder subheading. Every one of these started as a single
              sentence typed into the bar above.
            </p>
          </div>

          {WORKS.map((work) => (
            <figure
              key={work.caption}
              className="radial-card lg:absolute lg:left-[var(--x)] lg:top-[var(--y)] lg:w-[var(--w)]"
              style={
                {
                  "--x": work.x,
                  "--y": work.y,
                  "--w": work.w,
                  "--ux": work.ux,
                  "--uy": work.uy,
                  "--rot": work.rot,
                  "--delay": work.delay,
                } as CSSProperties
              }
            >
              {/* Light fill with the deeper tone of the same hue inset as a
                  frame around the thumbnail. */}
              <div
                className={`relative overflow-hidden rounded-2xl p-2 ${work.panel} ${work.aspect}`}
              >
                <div
                  className={`relative h-full w-full overflow-hidden rounded-xl ${work.inner}`}
                >
                  <work.Thumb className="absolute inset-0 h-full w-full text-ink/55" />
                </div>

                <span className="tag absolute right-3 top-3 z-10 rounded-full bg-ink px-2 py-0.5 text-[9px] text-paper">
                  {work.tag}
                </span>
              </div>

              <figcaption className="mt-3 text-xs font-medium leading-relaxed text-paper/70">
                {work.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
