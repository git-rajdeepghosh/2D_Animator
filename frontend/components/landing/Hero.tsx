"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayGlyph } from "./PlayGlyph";
import { SiteNav } from "./SiteNav";
import { hasSignInIntent } from "@/components/auth/SignInIntent";
import {
  FALLBACK_PEAK_WIDTH,
  INTRO_MS,
  RESTING_FRAME,
  SWOOSH_PATH,
  introFrameAt,
  measurePeakWidth,
} from "./introShape";

/**
 * Section 1 — the intro reveal.
 *
 * A bold cursive swoosh flies in from off-canvas top-left, thickens into a
 * ribbon, floods the viewport in off-white, then recedes back up its own path
 * and comes to rest as a small mark in the corner. Its retreat is literally
 * what uncovers the page: a curtain hides the layout at the start and is
 * dropped while the swoosh is wide enough to cover the screen unaided, so by
 * the time it pulls back there is nothing between the reader and the homepage.
 *
 * The shape is one fixed path whose stroke width animates — see
 * `introShape.ts` for why that, and not a morphing outline, is what the
 * reference is actually doing.
 *
 * The hero copy never moves and never changes colour in code. It sits above
 * the swoosh with `mix-blend-mode: difference`, so it renders white over the
 * dark backdrop and flips to black wherever the off-white ribbon passes
 * beneath it.
 */

/**
 * Module scope, so it survives client-side navigation but resets on a real
 * load. That gives "plays on every refresh, never on an internal route
 * change" without touching storage.
 */
let hasPlayedThisLoad = false;

const EXPAND_MS = 640;

type Phase = "intro" | "settle" | "docked" | "expanding";

export function Hero() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>(() =>
    hasPlayedThisLoad ? "settle" : "intro",
  );
  // Rendered only on a genuine page load. It hides itself on a CSS timer, so
  // no effect has to run for the page to become visible — see `animate-curtain`.
  const [curtain] = useState(() => !hasPlayedThisLoad);

  const pathRef = useRef<SVGPathElement>(null);

  const intro = phase === "intro";
  const docked = phase === "docked" || phase === "expanding";

  /* The morph.
   *
   * The completion flag is set when the run *finishes*, never on entry. Under
   * StrictMode React mounts twice — effect, cleanup, effect — so an effect that
   * bailed on a flag it had already set would cancel its own loop and never
   * restart it, stranding the page behind the curtain. */
  useEffect(() => {
    const path = pathRef.current;

    /** The only two things that animate: how much is painted, and how thick. */
    const paint = ({ head, width }: { head: number; width: number }) => {
      if (!path) return;
      path.style.strokeDasharray = `${head} 1`;
      path.style.strokeWidth = String(width);
    };

    const finish = () => {
      hasPlayedThisLoad = true;
      setPhase((p) => (p === "intro" ? "settle" : p));
    };

    // Already played earlier in this page load: a client-side navigation back
    // to `/` remounts the hero, and the reveal is a load-time event only.
    if (hasPlayedThisLoad) {
      paint(RESTING_FRAME);
      setPhase((p) => (p === "intro" ? "settle" : p));
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // A guard bounced someone here to sign in. Playing the reveal underneath
    // the modal they were sent for would just be in the way.
    if (!path || reduced || hasSignInIntent()) {
      paint(RESTING_FRAME);
      finish();
      return;
    }

    // How thick the stroke has to get to cover this particular window,
    // measured once rather than guessed: a corner-to-corner path leaves the
    // opposite corners furthest from the curve, and how far that is depends on
    // the viewport's size and aspect.
    const section = path.ownerSVGElement?.parentElement;
    const peak = section
      ? measurePeakWidth(path, section.getBoundingClientRect())
      : FALLBACK_PEAK_WIDTH;

    let frame = 0;
    let start = 0;

    // rAF is throttled to a standstill in a background tab, so the sequence
    // needs a wall-clock backstop to reach its resting state either way.
    const safety = setTimeout(() => {
      cancelAnimationFrame(frame);
      paint(RESTING_FRAME);
      finish();
    }, INTRO_MS + 1200);

    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / INTRO_MS);

      paint(introFrameAt(t, peak));

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        clearTimeout(safety);
        finish();
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(safety);
    };
  }, []);

  /* Nothing behind the intro should be reachable while it plays. */
  useEffect(() => {
    if (!intro) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [intro]);

  /* Scrolling docks it — and only scrolling.
     This used to also dock on a timer a couple of seconds after the intro
     settled, which pulled the prompt out from under anyone still reading it.
     The bar is the main call to action, so it now holds its place until the
     reader actually moves down the page. */
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

  /* The section sets no background of its own: the page wrapper supplies
     bg-ink, and a background here would paint over the ambient backdrop
     sitting behind it. */
  return (
    <section id="top" className="relative min-h-screen overflow-hidden">
      {/* Curtain: hides the layout until the shape has covered the screen. */}
      {curtain && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[70] animate-curtain bg-ink"
        />
      )}

      {/* The swoosh. Absolute inside the hero, so once the intro is over it
          stays put as the hero's decorative mark rather than following the
          reader down the page.

          It rides above everything while it is covering the screen, then drops
          behind the content once it has settled — by then it is a small corner
          mark and the swap is invisible. */}
      <svg
        className={`pointer-events-none absolute inset-0 h-full w-full ${
          intro ? "z-[80]" : "z-0"
        }`}
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          ref={pathRef}
          d={SWOOSH_PATH}
          fill="none"
          stroke="#F5F4F0"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          style={
            hasPlayedThisLoad && !intro
              ? {
                  strokeDasharray: `${RESTING_FRAME.head} 1`,
                  strokeWidth: RESTING_FRAME.width,
                }
              : { strokeDasharray: "0 1", strokeWidth: 6 }
          }
        />
      </svg>

      <SiteNav />

      {/* Hero copy. Dead centre, never moves, never has its colour set twice:
          `difference` against whatever is behind it does all the work. */}
      <div className="pointer-events-none relative z-[90] mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 pb-40 text-center mix-blend-difference">
        <h1 className="font-display text-[clamp(2.5rem,min(7.4vw,9.2vh),5.6rem)] font-bold leading-[1.02] text-paper">
          Turn any idea into a video.
          <br />
          <span className="italic">Type a topic, get an animation.</span>
        </h1>

        <p className="mt-8 max-w-xl text-base font-medium leading-relaxed text-paper sm:text-lg">
          Describe a concept in plain language. We write the script, animate it
          and lay the voiceover over the top — no timeline to learn.
        </p>
      </div>

      {/* The CTA. One element for three states: bar → docked orb → fullscreen.
          Anchored by its right edge so the yellow button is the fixed point
          the whole morph pivots around. */}
      <div
        className={`fixed z-40 flex items-center rounded-full transition-all duration-[750ms] [transition-timing-function:cubic-bezier(0.65,0,0.2,1)] ${
          intro ? "pointer-events-none opacity-0" : "opacity-100"
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
          onKeyDown={(e) => {
            if (e.key === "Enter") openGenerator();
          }}
          className={`min-w-0 bg-transparent text-sm font-medium text-ink outline-none transition-opacity duration-200 placeholder:text-ink-400 sm:text-base ${
            docked
              ? "pointer-events-none w-0 flex-none opacity-0"
              : "flex-1 opacity-100"
          }`}
          tabIndex={docked || intro ? -1 : 0}
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
          className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
        >
          <span className="absolute bottom-[36px] right-[36px] block h-14 w-14 animate-orb-expand rounded-full bg-highlight" />
        </div>
      )}
    </section>
  );
}
