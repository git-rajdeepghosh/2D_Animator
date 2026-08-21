import {
  ComputerThumb,
  GraphsThumb,
  GridThumb,
  MathsThumb,
  OrbitThumb,
  PhysicsThumb,
  WaveThumb,
} from "@/components/landing/Thumbnails";
import { API_URL, listJobs, type Job, type JobStatus } from "@/lib/api";

/**
 * The signed-in account's own generated videos, shaped for the card grid.
 *
 * Cards keep the hand-drawn thumbnails rather than a frame pulled from the
 * video: art is picked deterministically from the job id, so a given video
 * always looks the same without any per-render extraction work.
 */

export type Thumb = (props: { className?: string }) => JSX.Element;

export type VideoCard = {
  id: string;
  title: string;
  /** ISO date, formatted at render time. */
  createdAt: string;
  /** Seconds; null while a render is still in flight or has failed. */
  duration: number | null;
  tone: "blue" | "sage" | "blush" | "amber";
  Thumb: Thumb;
  status: JobStatus;
  /** Absolute URL of the finished video, or null if there isn't one yet. */
  videoUrl: string | null;
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

const THUMBS: Thumb[] = [
  MathsThumb,
  PhysicsThumb,
  GraphsThumb,
  OrbitThumb,
  WaveThumb,
  GridThumb,
  ComputerThumb,
];

const TONES = Object.keys(TONE_STYLES) as VideoCard["tone"][];

/**
 * Stable index derived from a job id.
 *
 * Deterministic on purpose: a random pick would reshuffle every card on each
 * render, so the same video would change colour as you navigate.
 */
function hashIndex(id: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

function toCard(job: Job): VideoCard {
  return {
    id: job.id,
    // A job only carries a title if one was supplied at creation; the prompt
    // itself isn't on the listing payload, so fall back to something neutral
    // rather than showing a bare id.
    title: job.title?.trim() || "Untitled video",
    createdAt: job.created_at,
    duration: job.duration_seconds,
    tone: TONES[hashIndex(job.id, TONES.length)],
    Thumb: THUMBS[hashIndex(job.id, THUMBS.length)],
    status: job.status,
    videoUrl: job.video_url ? `${API_URL}${job.video_url}` : null,
  };
}

/**
 * The account's videos, newest first.
 *
 * Failed and in-flight jobs are included rather than hidden: a failed render
 * still has editable scene code behind it, so the card is the way back into
 * the editor to fix it. Silently dropping them would just look like the video
 * vanished.
 */
export async function fetchMyVideos(): Promise<VideoCard[]> {
  const jobs = await listJobs();
  return jobs.map(toCard);
}

/** A filename-safe version of the title, for downloads. */
export function downloadName(video: VideoCard): string {
  const slug = video.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "video"}.mp4`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return "—";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
