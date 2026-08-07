/**
 * The intro swoosh.
 *
 * Studying the reference frame by frame, the shape is not a blob whose outline
 * changes — it is one fixed cursive path drawn with an enormous, animating
 * stroke width. That single fact explains everything on screen: the thin arc
 * that enters from the corner, the bold ribbon it thickens into, and the
 * concave notches left in the corners at full spread, which are the gaps a
 * very thick round-joined stroke leaves between its own curve lobes.
 *
 * So nothing here interpolates geometry. Two scalars drive the whole sequence
 * along a constant path:
 *
 *   head  — how much of the path is painted, 0 to 1 (an SVG dash offset)
 *   width — the stroke width in CSS pixels
 *
 *   sweep    head 0 → 1     width thin → bold    the arc flies in and thickens
 *   expand   head 1         width bold → peak    the ribbon floods the viewport
 *   retract  head 1 → 0.16  width peak → small   it recedes back up its own
 *                                                path, leaving a corner mark
 *
 * Coordinates live in a 1440x900 viewBox stretched to the viewport, and the
 * stroke is non-scaling, so `width` is real screen pixels on any display.
 */

/**
 * Enters off-canvas beyond the top-left corner and exits off-canvas beyond the
 * bottom-right, hooking through a cursive S on the way. The middle deliberately
 * bows up toward the top-right: a straight corner-to-corner diagonal leaves
 * that corner the furthest point from the stroke, and every pixel of extra
 * distance there costs stroke width at the peak.
 */
export const SWOOSH_PATH =
  "M -250 -80 C 180 60 330 330 245 505 C 168 662 500 700 780 560 C 1030 435 1180 560 1290 760 C 1370 905 1440 1010 1600 1120";

export const INTRO_MS = 2400;

/** Leg boundaries as a fraction of the timeline. */
const SWEEP_END = 0.34;
const EXPAND_END = 0.6;

/**
 * When the curtain hiding the page is dropped. Must sit at the point the
 * stroke is wide enough to cover the viewport on its own — the CSS keyframe
 * `curtainLift` has to match this.
 */
export const CURTAIN_LIFT = EXPAND_END;

const WIDTH_START = 6;
const WIDTH_BOLD = 130;

/**
 * The swoosh retracts to nothing: the stroke recedes back off the top-left
 * corner it flew in from and its width goes to zero.
 *
 * It used to stop at `head 0.16, width 64` and stay on as a decorative corner
 * mark, but the path enters across the wordmark, so the leftover shape sat on
 * top of the logo. Bring these back above zero to restore the mark — though
 * the resting segment then needs moving somewhere the header isn't.
 */
const WIDTH_REST = 0;
const HEAD_REST = 0;

/**
 * Used only if the viewport can't be measured. Generous on purpose: covering
 * too much at the peak is invisible, covering too little lets the page pop in
 * through an uncovered corner.
 */
export const FALLBACK_PEAK_WIDTH = 2800;

export type IntroFrame = { head: number; width: number };

/** Where the sequence comes to rest, and what a skipped intro renders. */
export const RESTING_FRAME: IntroFrame = {
  head: HEAD_REST,
  width: WIDTH_REST,
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/**
 * `t` runs 0 to 1 across the whole intro. `peakWidth` is measured per viewport
 * rather than hard-coded, because how thick the stroke must get to cover the
 * screen depends on how far the furthest corner sits from this particular
 * curve — and that changes with the window's size and aspect.
 */
export function introFrameAt(t: number, peakWidth: number): IntroFrame {
  const time = clamp01(t);

  if (time <= SWEEP_END) {
    // Flies in fast and settles — the arc should feel thrown, not eased in.
    const e = easeOutCubic(time / SWEEP_END);
    return { head: e, width: lerp(WIDTH_START, WIDTH_BOLD, e) };
  }

  if (time <= EXPAND_END) {
    const e = easeInOutCubic((time - SWEEP_END) / (EXPAND_END - SWEEP_END));
    return { head: 1, width: lerp(WIDTH_BOLD, peakWidth, e) };
  }

  // Recedes back up its own path rather than shrinking in place, which is what
  // makes the page appear to be uncovered from the far side first.
  const e = easeInOutCubic((time - EXPAND_END) / (1 - EXPAND_END));
  return {
    head: lerp(1, HEAD_REST, e),
    width: lerp(peakWidth, WIDTH_REST, e),
  };
}

/**
 * How wide the stroke must get for this path to cover the whole box, in screen
 * pixels: twice the distance from the furthest corner to the nearest point on
 * the curve, plus a little margin.
 */
export function measurePeakWidth(
  path: SVGPathElement,
  box: { left: number; top: number; width: number; height: number },
): number {
  const ctm = path.getScreenCTM();
  const svg = path.ownerSVGElement;
  if (!ctm || !svg) return FALLBACK_PEAK_WIDTH;

  const point = svg.createSVGPoint();
  const total = path.getTotalLength();
  if (!total) return FALLBACK_PEAK_WIDTH;

  const SAMPLES = 240;
  const onCurve: { x: number; y: number }[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const p = path.getPointAtLength((i / SAMPLES) * total);
    point.x = p.x;
    point.y = p.y;
    const s = point.matrixTransform(ctm);
    onCurve.push({ x: s.x - box.left, y: s.y - box.top });
  }

  const corners = [
    [0, 0],
    [box.width, 0],
    [0, box.height],
    [box.width, box.height],
  ];

  let furthest = 0;
  for (const [cx, cy] of corners) {
    let nearest = Infinity;
    for (const q of onCurve) {
      nearest = Math.min(nearest, Math.hypot(q.x - cx, q.y - cy));
    }
    furthest = Math.max(furthest, nearest);
  }

  return Math.ceil(furthest * 2 * 1.06);
}
