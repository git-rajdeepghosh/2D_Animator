"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Writes how far a section has travelled through the viewport onto the element
 * itself as a `--p` custom property, from 0 (just below the fold) to 1 (just
 * above it).
 *
 * Children read the inherited variable in their own `calc()`, so a section
 * with a dozen moving cards still costs one style write per frame rather than
 * one per card. Reads are batched into rAF so a burst of scroll events can
 * only ever schedule a single layout read.
 */
export function useSectionProgress(
  ref: RefObject<HTMLElement>,
  /** Trim the head and tail of the travel so the motion peaks on screen. */
  { from = 0.12, to = 0.88 }: { from?: number; to?: number } = {},
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Resting position, no scroll linkage.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--p", "0.5");
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      const travel = rect.height + viewport;
      if (travel <= 0) return;

      const raw = (viewport - rect.top) / travel;
      const scaled = (raw - from) / (to - from);
      el.style.setProperty("--p", Math.min(1, Math.max(0, scaled)).toFixed(4));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, from, to]);
}
