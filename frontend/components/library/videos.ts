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
 * Mock "my videos" data.
 *
 * The backend has `GET /jobs/{id}` but no per-user listing endpoint yet, and
 * there is no auth on the API at all, so there is nothing real to call. This
 * stands in with the same shape a real payload would have; swap `fetchMyVideos`
 * for the API call when the endpoint lands.
 */

export type VideoCard = {
  id: string;
  title: string;
  /** ISO date, formatted at render time. */
  createdAt: string;
  /** Seconds. */
  duration: number;
  tone: "blue" | "sage" | "blush" | "amber";
  Thumb: (props: { className?: string }) => JSX.Element;
};

export const TONE_STYLES: Record<
  VideoCard["tone"],
  { fill: string; deep: string; border: string }
> = {
  blue: {
    fill: "bg-card-blue",
    deep: "bg-card-blue-deep",
    border: "border-card-blue-deep",
  },
  sage: {
    fill: "bg-card-sage",
    deep: "bg-card-sage-deep",
    border: "border-card-sage-deep",
  },
  blush: {
    fill: "bg-card-blush",
    deep: "bg-card-blush-deep",
    border: "border-card-blush-deep",
  },
  amber: {
    fill: "bg-card-amber",
    deep: "bg-card-amber-deep",
    border: "border-card-amber-deep",
  },
};

const MOCK: VideoCard[] = [
  {
    id: "v1",
    title: "Why π shows up in a circle's area",
    createdAt: "2026-08-05T14:02:00Z",
    duration: 48,
    tone: "blue",
    Thumb: MathsThumb,
  },
  {
    id: "v2",
    title: "Momentum, before and after impact",
    createdAt: "2026-08-04T09:41:00Z",
    duration: 44,
    tone: "sage",
    Thumb: PhysicsThumb,
  },
  {
    id: "v3",
    title: "A binary search, one step at a time",
    createdAt: "2026-08-02T18:15:00Z",
    duration: 50,
    tone: "blush",
    Thumb: GridThumb,
  },
  {
    id: "v4",
    title: "Reading a distribution properly",
    createdAt: "2026-07-29T11:07:00Z",
    duration: 43,
    tone: "amber",
    Thumb: GraphsThumb,
  },
  {
    id: "v5",
    title: "Orbital resonance, slowed right down",
    createdAt: "2026-07-27T16:30:00Z",
    duration: 58,
    tone: "blue",
    Thumb: OrbitThumb,
  },
  {
    id: "v6",
    title: "How a hash table avoids collisions",
    createdAt: "2026-07-24T08:52:00Z",
    duration: 57,
    tone: "blush",
    Thumb: ComputerThumb,
  },
  {
    id: "v7",
    title: "How a voiceover gets timed to a scene",
    createdAt: "2026-07-21T13:19:00Z",
    duration: 49,
    tone: "sage",
    Thumb: WaveThumb,
  },
];

/** Stand-in for the listing endpoint, latency included so the skeleton shows. */
export function fetchMyVideos(): Promise<VideoCard[]> {
  return new Promise((resolve) => setTimeout(() => resolve(MOCK), 700));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
