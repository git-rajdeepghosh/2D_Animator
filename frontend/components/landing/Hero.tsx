"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayGlyph } from "./PlayGlyph";
import { SiteNav } from "./SiteNav";

/**
 * Section 1 — the intro sequence.
 *
 * The hero text is in place from the first frame and never moves: it fades up
 * once and then stays put. Alongside it a squiggly line draws itself across
 * the screen with a yellow play button riding its leading edge, and once the
 * head reaches the end the tail chases it down the *same* path — the line
 * retraces itself out of existence rather than fading or redrawing.
 *
 * Both ends are two offsets into one dash pattern, so the retrace is
 * mathematically the same curve as the draw; there is no second geometry that
 * could drift out of alignment.
 *
 * The dot and the line's head are driven by one rAF loop rather than by CSS
 * animations, so they stay locked together frame for frame regardless of how
 * the SVG is scaled.
 */

// The final point sits at roughly 80% of the viewBox height so the dot lands
// on the search bar's play button rather than below it.
const SQUIGGLE =
  "M -90 210 C 150 96 318 342 498 272 C 678 202 716 58 900 132 C 1084 206 1158 424 1330 352 C 1502 280 1524 606 1232 646 C 940 686 898 470 700 522 C 520 566 566 686 720 725";

const DRAW_MS = 1900;
/** A beat at full length before the tail sets off. */
const DWELL_MS = 420;
const RETRACE_MS = 1500;
const HOLD_MS = 2600;
const EXPAND_MS = 640;

type Phase = "drawing" | "retracing" | "settle" | "docked" | "expanding";

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeInOutQuart = (t: number) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

export function Hero() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("drawing");

  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // While the reader is typing we leave the bar alone; docking re-arms on blur.
  const [focused, setFocused] = useState(false);
  const [dockNonce, setDockNonce] = useState(0);

  const docked = phase === "docked" || phase === "expanding";
  /** The dot rides the head of the line and is handed to the bar at the end. */
  const dotRiding = phase === "drawing" || phase === "retracing";

  /* One loop covers draw, dwell and retrace. `pathLength` is normalised to 1,
     so head and tail are both plain 0→1 numbers along the same curve. */
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const path = pathRef.current;
    const dot = dotRef.current;
    const stage = stageRef.current;

    if (prefersReduced || !path || !dot || !stage) {
      setPhase("settle");
      return;
    }

    const total = path.getTotalLength();
    const ctm = path.getScreenCTM();
    const stageRect = stage.getBoundingClientRect();
    const point = path.ownerSVGElement?.createSVGPoint();

    if (!ctm || !point) {
      setPhase("settle");
      return;
    }

    const TOTAL_MS = DRAW_MS + DWELL_MS + RETRACE_MS;
    let frame = 0;
    // Clock starts on the first delivered frame, not at mount, so a tab that
    // is restored mid-intro still plays the whole thing rather than jumping.
    let start = 0;

    // rAF is throttled to a standstill in a background tab. Without this the
    // line would sit half-drawn and the CTA would never arrive, so force the
    // resting state if the sequence hasn't finished in time.
    const safety = setTimeout(
      () => setPhase((p) => (p === "drawing" || p === "retracing" ? "settle" : p)),
      TOTAL_MS + 1400,
    );

    const moveDot = (at: number) => {
      const p = path.getPointAtLength(at * total);
      point.x = p.x;
      point.y = p.y;
      const screen = point.matrixTransform(ctm);
      dot.style.transform = `translate3d(${screen.x - stageRect.left}px, ${
        screen.y - stageRect.top
      }px, 0) translate(-50%, -50%)`;
    };

    let announced: Phase = "drawing";
    const announce = (next: Phase) => {
      if (announced === next) return;
      announced = next;
      setPhase((p) => (p === "settle" || p === "docked" ? p : next));
    };

    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;

      // head — where the line ends; tail — where it begins. The visible line is
      // everything between them.
      let head = 1;
      let tail = 0;

      if (elapsed < DRAW_MS) {
        head = easeInOutCubic(elapsed / DRAW_MS);
        announce("drawing");
      } else if (elapsed < DRAW_MS + DWELL_MS) {
        head = 1;
      } else {
        const t = Math.min(1, (elapsed - DRAW_MS - DWELL_MS) / RETRACE_MS);
        tail = easeInOutQuart(t);
        announce("retracing");
      }

      // One dash the length of the drawn span, offset so only [tail, head]
      // paints. Both ends index into the same curve, so the retrace runs back
      // over precisely the stroke the draw laid down.
      path.style.strokeDasharray = `${head - tail} 1`;
      path.style.strokeDashoffset = `${-tail}`;

      // The dot rides the head out and then holds at the end while the tail
      // sweeps up to meet it, so the line retracts into the button rather than
      // the dot snapping back to the start of the path.
      moveDot(head);

      if (elapsed < TOTAL_MS) {
        frame = requestAnimationFrame(tick);
      } else {
        announce("settle");
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(safety);
    };
  }, []);

  /* Once settled, hold a beat and then dock into the corner. */
  useEffect(() => {
    if (phase !== "settle" || focused) return;
    const timer = setTimeout(() => setPhase("docked"), HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase, focused, dockNonce]);

  /* Scrolling away also docks it — no reason to keep a bar mid-screen. */
  useEffect(() => {
    if (phase !== "settle") return;
    const onScroll = () => {
      if (window.scrollY > 80) setPhase("docked");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [phase]);

  const openGenerator = useCallback(() => {
    if (phase === "expanding") return;
    setPhase("expanding");
    setTimeout(() => router.push("/generator"), EXPAND_MS);
  }, [phase, router]);

  return (
    <section
      id="top"
      ref={stageRef}
      className="relative min-h-screen overflow-hidden bg-ink"
    >
      {/* The line. Stretched to the section so the path lands predictably; the
          squiggle is abstract enough that non-uniform scaling reads fine. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          ref={pathRef}
          d={SQUIGGLE}
          fill="none"
          stroke="#F5F4F0"
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          style={{ strokeDasharray: "0 1", strokeDashoffset: 0, opacity: 0.85 }}
        />
      </svg>

      {/* The dot rides whichever end of the line is currently moving. */}
      <div
        ref={dotRef}
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-highlight text-ink transition-opacity duration-300 ${
          dotRiding ? "opacity-100" : "opacity-0"
        }`}
      >
        <PlayGlyph className="h-6 w-6 translate-x-[1px]" />
      </div>

      <SiteNav />

      {/* Hero copy. Fades up once on entry and then holds — the line moves
          around it, it never moves with the line. */}
      <div className="relative z-20 mx-auto flex min-h-screen max-w-5xl animate-hero-in flex-col items-center justify-center px-6 pb-40 text-center">
        <p className="tag mb-8 text-paper/50">Manim-powered explainers</p>

        {/* The vh term only bites on short, wide windows — without it the
            headline grows on width alone and runs under the search bar. */}
        <h1 className="font-display text-[clamp(2.5rem,min(7.4vw,9.2vh),5.6rem)] font-bold leading-[1.02] text-paper">
          Turn any idea into a video.
          <br />
          <span className="italic text-paper/75">
            Type a topic, get an animation.
          </span>
        </h1>

        <p className="mt-8 max-w-xl text-base font-medium leading-relaxed text-paper/60 sm:text-lg">
          Describe a concept in plain language. We write the script, animate it
          and lay the voiceover over the top — no timeline to learn.
        </p>
      </div>

      {/* The CTA. One element for three states: bar → docked orb → fullscreen.
          Anchored by its right edge so the yellow button is the fixed point
          the whole morph pivots around. */}
      <div
        className={`fixed z-40 flex items-center rounded-full transition-all duration-[750ms] [transition-timing-function:cubic-bezier(0.65,0,0.2,1)] ${
          dotRiding ? "pointer-events-none opacity-0" : "opacity-100"
        } ${
          docked
            ? "bottom-7 right-7 h-[72px] w-[72px] justify-center bg-transparent p-0"
            : "bottom-[15vh] h-[72px] w-[min(620px,88vw)] justify-between bg-paper py-2 pl-7 pr-2"
        }`}
        style={docked ? undefined : { right: "calc(50% - min(310px, 44vw))" }}
      >
        {/* `flex-none` once docked matters: left growing, the input shoves the
            button off-centre and the fullscreen wipe starts 8px adrift of the
            orb it is supposed to grow out of. */}
        <input
          type="text"
          placeholder="Describe the video you want to generate…"
          aria-label="Describe the video you want to generate"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setDockNonce((n) => n + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") openGenerator();
          }}
          className={`min-w-0 bg-transparent text-sm font-medium text-ink outline-none transition-opacity duration-200 placeholder:text-ink-400 sm:text-base ${
            docked
              ? "pointer-events-none w-0 flex-none opacity-0"
              : "flex-1 opacity-100"
          }`}
          tabIndex={docked ? -1 : 0}
        />

        <button
          type="button"
          onClick={openGenerator}
          aria-label="Open the generator"
          className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-highlight text-ink transition-transform duration-300 hover:scale-105 ${
            phase === "expanding" ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* A slow ring, only while docked, so the orb reads as live. */}
          {docked && (
            <span className="pointer-events-none absolute inset-0 animate-pulse-ring rounded-full bg-highlight" />
          )}
          <PlayGlyph className="relative h-6 w-6 translate-x-[1px]" />
        </button>
      </div>

      {/* Fullscreen wipe into the generator. */}
      {phase === "expanding" && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[70] overflow-hidden"
        >
          <span className="absolute bottom-[36px] right-[36px] block h-14 w-14 animate-orb-expand rounded-full bg-highlight" />
        </div>
      )}
    </section>
  );
}
