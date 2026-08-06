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
 * The heading sits dead centre of the stage and the cards are ringed around
 * it. As the section travels up the viewport they push radially outward from
 * that centre, so the field opens up around the text rather than scrolling
 * past it.
 *
 * Each card carries the outward vector for its own corner as `--ux`/`--uy`,
 * scaled by the section's inherited `--p`. The resting arrangement is the
 * tightest the ring ever gets, so the cards only ever open away from the
 * heading and never track back across it.
 *
 * Below `lg` the absolute ring is dropped for a plain two-column grid with the
 * heading above it — a radial layout has nowhere to go on a phone.
 */

type Work = {
  tag: string;
  caption: string;
  Thumb: (props: { className?: string }) => JSX.Element;
  panel: string;
  /** Corner tag fill — always a different pastel to the panel it sits on. */
  tint: string;
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
    panel: "bg-pastel-blue",
    tint: "bg-pastel-amber",
    aspect: "aspect-[4/3]",
    x: "1%",
    y: "2%",
    w: "23%",
    ux: "-110px",
    uy: "-112px",
    rot: "-1.6deg",
    delay: "0ms",
  },
  {
    tag: "Featured",
    caption: "A binary search, one step at a time",
    Thumb: GridThumb,
    panel: "bg-pastel-blush",
    tint: "bg-pastel-blue",
    aspect: "aspect-[16/10]",
    x: "74%",
    y: "0%",
    w: "25%",
    ux: "112px",
    uy: "-106px",
    rot: "1.4deg",
    delay: "80ms",
  },
  {
    tag: "New",
    caption: "Reading a distribution properly",
    Thumb: GraphsThumb,
    panel: "bg-pastel-amber",
    tint: "bg-pastel-sage",
    aspect: "aspect-[4/3]",
    x: "0%",
    y: "40%",
    w: "18%",
    ux: "-157px",
    uy: "-8px",
    rot: "2deg",
    delay: "160ms",
  },
  {
    tag: "Popular",
    caption: "Orbital resonance, slowed right down",
    Thumb: OrbitThumb,
    panel: "bg-pastel-blue",
    tint: "bg-pastel-blush",
    aspect: "aspect-[4/3]",
    x: "82%",
    y: "43%",
    w: "18%",
    ux: "157px",
    uy: "10px",
    rot: "-1.8deg",
    delay: "120ms",
  },
  {
    tag: "Selected",
    caption: "Momentum, before and after impact",
    Thumb: PhysicsThumb,
    panel: "bg-pastel-sage",
    tint: "bg-pastel-blush",
    aspect: "aspect-[16/10]",
    x: "11%",
    y: "70%",
    w: "26%",
    ux: "-95px",
    uy: "104px",
    rot: "1.5deg",
    delay: "220ms",
  },
  {
    tag: "Staff pick",
    caption: "How a voiceover gets timed to a scene",
    Thumb: WaveThumb,
    panel: "bg-pastel-blush",
    tint: "bg-pastel-sage",
    aspect: "aspect-[4/3]",
    x: "64%",
    y: "72%",
    w: "24%",
    ux: "91px",
    uy: "100px",
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

  return (
    <section
      id="showcase"
      ref={sectionRef}
      className="overflow-hidden bg-ink py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Heading, above the grid on small screens and dead centre of the
            ring on large ones. */}
        <div className="mx-auto mb-16 max-w-2xl text-center lg:hidden">
          <p className="tag mb-5 text-paper/40">Showcase</p>
          <h2 className="font-display text-[clamp(2.1rem,5vw,3.6rem)] leading-[1.05] text-paper">
            A few things people have made
          </h2>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-paper/50 sm:text-base">
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
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 hidden -translate-y-1/2 px-4 text-center lg:block">
            {/* inline-block so the label's box hugs its text — as a full-width
                block it reaches across the whole ring. */}
            <p className="tag mb-5 inline-block text-paper/40">Showcase</p>
            <h2 className="mx-auto max-w-xl font-display text-[clamp(2.1rem,5vw,3.6rem)] leading-[1.05] text-paper">
              A few things people have made
            </h2>
            <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-paper/50 sm:text-base">
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
              <div
                className={`relative overflow-hidden rounded-2xl ${work.panel} ${work.aspect}`}
              >
                <work.Thumb className="absolute inset-0 h-full w-full text-paper" />

                <span
                  className={`tag absolute right-3 top-3 rounded-full px-2.5 py-1 text-paper ${work.tint}`}
                >
                  {work.tag}
                </span>
              </div>

              <figcaption className="mt-4 text-sm leading-relaxed text-paper/70">
                {work.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
