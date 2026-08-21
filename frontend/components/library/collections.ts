import {
  ComputerThumb,
  GraphsThumb,
  GridThumb,
  MathsThumb,
  OrbitThumb,
  PhysicsThumb,
  WaveThumb,
} from "@/components/landing/Thumbnails";

/**
 * The library's collections, shared by the homepage teaser and `/library` so
 * the two can never drift apart. Placeholder titles throughout.
 */

export type Thumb = (props: { className?: string }) => JSX.Element;

export type Collection = {
  slug: string;
  name: string;
  topic: string;
  /** Base fill and the deeper tone used for inner panels and borders. */
  fill: string;
  deep: string;
  border: string;
  Thumb: Thumb;
  videos: { title: string; length: string; Thumb: Thumb }[];
};

export const COLLECTIONS: Collection[] = [
  {
    slug: "maths",
    name: "Maths",
    topic: "algebra and geometry",
    fill: "bg-card-blue",
    deep: "bg-card-blue-deep",
    border: "border-card-blue-deep",
    Thumb: MathsThumb,
    videos: [
      { title: "Why π shows up in a circle's area", length: "0:48", Thumb: MathsThumb },
      { title: "Completing the square, geometrically", length: "0:52", Thumb: GridThumb },
      { title: "What a derivative actually measures", length: "1:00", Thumb: GraphsThumb },
      { title: "Euler's identity, one term at a time", length: "0:55", Thumb: OrbitThumb },
    ],
  },
  {
    slug: "physics",
    name: "Physics",
    topic: "mechanics and waves",
    fill: "bg-card-sage",
    deep: "bg-card-sage-deep",
    border: "border-card-sage-deep",
    Thumb: PhysicsThumb,
    videos: [
      { title: "Momentum, before and after impact", length: "0:44", Thumb: PhysicsThumb },
      { title: "Orbital resonance, slowed right down", length: "0:58", Thumb: OrbitThumb },
      { title: "Standing waves on a fixed string", length: "0:41", Thumb: WaveThumb },
    ],
  },
  {
    slug: "computer-science",
    name: "Computer science",
    topic: "data structure",
    fill: "bg-card-blush",
    deep: "bg-card-blush-deep",
    border: "border-card-blush-deep",
    Thumb: ComputerThumb,
    videos: [
      { title: "A binary search, one step at a time", length: "0:50", Thumb: GridThumb },
      { title: "How a hash table avoids collisions", length: "0:57", Thumb: ComputerThumb },
      { title: "Breadth-first search across a graph", length: "0:46", Thumb: ComputerThumb },
      { title: "Why quicksort picks a pivot", length: "1:00", Thumb: GraphsThumb },
    ],
  },
  {
    slug: "graphs",
    name: "Graphs",
    topic: "data and plotting",
    fill: "bg-card-amber",
    deep: "bg-card-amber-deep",
    border: "border-card-amber-deep",
    Thumb: GraphsThumb,
    videos: [
      { title: "Reading a distribution properly", length: "0:43", Thumb: GraphsThumb },
      { title: "When a log scale is the honest one", length: "0:54", Thumb: GridThumb },
      { title: "How a voiceover gets timed to a scene", length: "0:49", Thumb: WaveThumb },
    ],
  },
];

/**
 * Card styling for a real (filesystem-backed) collection.
 *
 * `COLLECTIONS` above is the landing page's teaser art and stays hard-coded;
 * the actual catalogue is whatever subject folders exist on disk, so its
 * styling has to be derived from a slug rather than looked up.
 *
 * Known subjects get matching artwork; anything else falls back to a stable
 * pick from the palette, so a new folder looks deliberate without needing an
 * entry added here.
 */
const PALETTE: { fill: string; deep: string; border: string; Thumb: Thumb }[] = [
  { fill: "bg-card-blue", deep: "bg-card-blue-deep", border: "border-card-blue-deep", Thumb: MathsThumb },
  { fill: "bg-card-sage", deep: "bg-card-sage-deep", border: "border-card-sage-deep", Thumb: PhysicsThumb },
  { fill: "bg-card-blush", deep: "bg-card-blush-deep", border: "border-card-blush-deep", Thumb: WaveThumb },
  { fill: "bg-card-amber", deep: "bg-card-amber-deep", border: "border-card-amber-deep", Thumb: ComputerThumb },
];

const KNOWN_SUBJECTS: Record<string, number> = {
  maths: 0,
  math: 0,
  physics: 1,
  biology: 1,
  chemistry: 2,
  "computer-science": 3,
};

export function collectionStyle(slug: string) {
  const known = KNOWN_SUBJECTS[slug.toLowerCase()];
  if (known !== undefined) return PALETTE[known];

  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/** Per-video thumbnail, varied within a collection so cards aren't identical. */
const VIDEO_THUMBS: Thumb[] = [
  MathsThumb,
  GraphsThumb,
  OrbitThumb,
  WaveThumb,
  GridThumb,
  PhysicsThumb,
  ComputerThumb,
];

export function videoThumb(id: string): Thumb {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return VIDEO_THUMBS[hash % VIDEO_THUMBS.length];
}
