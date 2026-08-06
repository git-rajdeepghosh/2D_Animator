"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayGlyph } from "./PlayGlyph";

/**
 * Section 1 — the intro sequence.
 *
 * A yellow play button rides a hand-drawn squiggle, trailing a white line.
 * That line then floods: its stroke swells until it has painted the whole
 * screen off-white. A beat later the paint retracts back down into the line,
 * and the page it was covering is revealed underneath — so the landing page
 * reads as having been projected out of the line the dot just drew. What is
 * left behind is the same squiggle at a whisper of opacity.
 *
 * The flood is a single `stroke-width` transition on the path the dot already
 * traced — no masks, no second geometry, so the paint is guaranteed to bloom
 * from exactly where the line is.
 *
 * The dot and the tip of the trail are driven by one rAF loop rather than two
 * CSS animations, so they stay locked together frame for frame regardless of
 * how the SVG is scaled.
 */

// The final point sits at roughly 80% of the viewBox height so the dot lands
// on the search bar's play button rather than below it.
const SQUIGGLE =
  "M -90 210 C 150 96 318 342 498 272 C 678 202 716 58 900 132 C 1084 206 1158 424 1330 352 C 1502 280 1524 606 1232 646 C 940 686 898 470 700 522 C 520 566 566 686 720 725";

const TRACE_MS = 1900;
const FLOOD_MS = 440;
const REVEAL_MS = 780;
const HOLD_MS = 2800;
const EXPAND_MS = 640;

/** Wide enough that the swollen stroke covers any viewport from the line. */
const FLOOD_WIDTH = 3600;
const RESIDUAL_WIDTH = 1.2;
const RESIDUAL_OPACITY = 0.16;

type Phase = "trace" | "flood" | "reveal" | "settle" | "docked" | "expanding";

const NAV_LINKS = [
  { label: "Home", href: "#top" },
  { label: "Categories", href: "#categories" },
  { label: "Showcase", href: "#showcase" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function Hero() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("trace");

  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // While the reader is typing we leave the bar alone; docking re-arms on blur.
  const [focused, setFocused] = useState(false);
  const [dockNonce, setDockNonce] = useState(0);

  /** The page sits under the paint from the flood onward and is uncovered by it. */
  const revealed = phase !== "trace";
  const docked = phase === "docked" || phase === "expanding";
  /** The paint is on screen: thin line, flooding, or retracting. */
  const tracing =
    phase === "trace" || phase === "flood" || phase === "reveal";
  /** Nothing under the paint should be clickable while it is covering. */
  const painting = phase === "flood" || phase === "reveal";

  /* Trace: walk the dot along the path while drawing the trail behind it. */
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

    let frame = 0;
    // Clock starts on the first delivered frame, not at mount, so a tab that
    // is restored mid-intro still plays the whole thing rather than jumping.
    let start = 0;

    // rAF is throttled to a standstill in a background tab. Without this the
    // hero would sit empty — no nav, no headline, no CTA — until the tab was
    // focused, so force the resting state if the walk hasn't finished in time.
    const safety = setTimeout(
      () => setPhase((p) => (p === "trace" ? "settle" : p)),
      TRACE_MS + 1400,
    );

    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / TRACE_MS);
      const p = easeInOutCubic(t);

      path.style.strokeDashoffset = String(1 - p);

      const at = path.getPointAtLength(p * total);
      point.x = at.x;
      point.y = at.y;
      const screen = point.matrixTransform(ctm);
      dot.style.transform = `translate3d(${screen.x - stageRect.left}px, ${
        screen.y - stageRect.top
      }px, 0) translate(-50%, -50%)`;

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setPhase((p2) => (p2 === "trace" ? "flood" : p2));
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(safety);
    };
  }, []);

  /* Flood → retract → settled. */
  useEffect(() => {
    if (phase === "flood") {
      const t = setTimeout(() => setPhase("reveal"), FLOOD_MS);
      return () => clearTimeout(t);
    }
    if (phase === "reveal") {
      const t = setTimeout(() => setPhase("settle"), REVEAL_MS);
      return () => clearTimeout(t);
    }
  }, [phase]);

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

  /* The paint: thin line while tracing, screen-filling during the flood, back
     to a hairline as it retracts. */
  const paint =
    phase === "trace"
      ? { width: 1.6, opacity: 1, ms: 0, ease: "linear" }
      : phase === "flood"
        ? {
            width: FLOOD_WIDTH,
            opacity: 1,
            ms: FLOOD_MS,
            ease: "cubic-bezier(0.7, 0, 0.84, 0.35)",
          }
        : {
            width: RESIDUAL_WIDTH,
            opacity: RESIDUAL_OPACITY,
            ms: REVEAL_MS,
            ease: "cubic-bezier(0.16, 0.84, 0.34, 1)",
          };

  return (
    <section
      id="top"
      ref={stageRef}
      className="relative min-h-screen overflow-hidden bg-ink"
    >
      {/* Once the paint has retracted this fixed layer hands over to a static
          copy in the hero, so the trace does not follow the reader down the
          page. At scroll 0 the two are pixel-identical, so the swap is
          invisible. */}
      {tracing && (
        <svg
          className="pointer-events-none fixed inset-0 z-50 h-full w-full"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            ref={pathRef}
            d={SQUIGGLE}
            fill="none"
            stroke="#F5F4F0"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1,
              strokeWidth: paint.width,
              opacity: paint.opacity,
              transition: paint.ms
                ? `stroke-width ${paint.ms}ms ${paint.ease}, opacity ${paint.ms}ms ${paint.ease}`
                : "none",
            }}
          />
        </svg>
      )}

      {/* What the flood leaves behind. Swapped in with no transition: the
          retracting paint has already reached exactly this width and opacity,
          so the handoff is pixel-identical and a crossfade would only make the
          line blink. */}
      <svg
        className={`pointer-events-none absolute inset-0 h-full w-full ${
          tracing ? "opacity-0" : "opacity-100"
        }`}
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={SQUIGGLE}
          fill="none"
          stroke="#F5F4F0"
          strokeWidth={RESIDUAL_WIDTH}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          opacity={RESIDUAL_OPACITY}
        />
      </svg>

      {/* The traveling dot. Rides above the paint so it stays legible against
          the white, then hands off to the search bar. */}
      <div
        ref={dotRef}
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-highlight text-ink transition-opacity duration-300 ${
          phase === "trace" || phase === "flood" ? "opacity-100" : "opacity-0"
        }`}
      >
        <PlayGlyph className="h-6 w-6 translate-x-[1px]" />
      </div>

      {/* Navbar. Already in place under the paint — the retraction uncovers it. */}
      <header
        className={`fixed inset-x-0 top-5 z-40 flex justify-center px-4 transition-all duration-700 ${
          revealed
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <nav className="flex items-center gap-0.5 rounded-full bg-paper px-1.5 py-1.5 sm:gap-1 sm:px-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="nav-link px-2.5 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      <span
        className={`fixed left-6 top-8 z-40 hidden font-display text-xl text-paper transition-opacity duration-700 lg:block ${
          revealed ? "opacity-100" : "opacity-0"
        }`}
      >
        2DAnimator
      </span>

      {/* Hero copy. Blooms very slightly as the paint pulls back off it. */}
      <div
        className={`relative z-20 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 pb-40 text-center transition-all duration-1000 ${
          revealed ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
        }`}
      >
        <p className="tag mb-8 text-paper/50">Manim-powered explainers</p>

        {/* The vh term only bites on short, wide windows — without it the
            headline grows on width alone and runs under the search bar. */}
        <h1 className="font-display text-[clamp(2.5rem,min(7.4vw,9.2vh),5.6rem)] leading-[0.98] text-paper">
          Turn any idea into a video.
          <br />
          <span className="italic text-paper/70">
            Type a topic, get an animation.
          </span>
        </h1>

        <p className="mt-8 max-w-xl text-base leading-relaxed text-paper/55 sm:text-lg">
          Describe a concept in plain language. We write the script, animate it
          and lay the voiceover over the top — no timeline to learn.
        </p>
      </div>

      {/* The CTA. One element for three states: bar → docked orb → fullscreen.
          Anchored by its right edge so the yellow button is the fixed point
          the whole morph pivots around. */}
      <div
        className={`fixed z-40 flex items-center rounded-full transition-all duration-[750ms] [transition-timing-function:cubic-bezier(0.65,0,0.2,1)] ${
          revealed ? "opacity-100" : "pointer-events-none opacity-0"
        } ${painting ? "pointer-events-none" : ""} ${
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
          className={`min-w-0 bg-transparent text-sm text-ink outline-none transition-opacity duration-200 placeholder:text-ink-400 sm:text-base ${
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
