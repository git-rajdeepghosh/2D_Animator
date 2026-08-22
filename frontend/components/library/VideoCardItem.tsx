"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { PlayGlyph } from "@/components/landing/PlayGlyph";
import { deleteJob, renameJob } from "@/lib/api";
import {
  TONE_STYLES,
  downloadName,
  formatDate,
  formatDuration,
  type VideoCard,
} from "./videos";

/**
 * One video in `/my-videos`.
 *
 * The thumbnail is the real poster frame extracted from the render, falling
 * back to the generated illustration for jobs that produced no video (still
 * rendering, or failed). Clicking it plays inline rather than navigating away,
 * because "watch it" is the thing people come here to do.
 */
export function VideoCardItem({
  video,
  onRenamed,
  onDeleted,
}: {
  video: VideoCard;
  onRenamed: (id: string, title: string) => void;
  onDeleted: (id: string) => void;
}) {
  const tone = TONE_STYLES[video.tone];

  const [playing, setPlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(video.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const playable = video.status === "done" && Boolean(video.videoUrl);

  async function commitRename() {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === video.title) {
      setDraft(video.title); // nothing to save, or nothing changed
      return;
    }
    // Optimistic: the card updates immediately and rolls back if the save
    // fails, so renaming never feels like it lagged behind the keystroke.
    onRenamed(video.id, next);
    try {
      await renameJob(video.id, next);
    } catch (err) {
      onRenamed(video.id, video.title);
      setDraft(video.title);
      setError(err instanceof Error ? err.message : "Couldn't rename");
    }
  }

  async function commitDelete() {
    setBusy(true);
    try {
      await deleteJob(video.id);
      onDeleted(video.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete");
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-3xl border p-3 pb-5 ${tone.fill} ${tone.border}`}
    >
      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${tone.deep}`}
      >
        {playing && video.videoUrl ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- generated narration has no track yet
          <video
            src={video.videoUrl}
            poster={video.posterUrl ?? undefined}
            controls
            autoPlay
            className="absolute inset-0 h-full w-full bg-black object-contain"
          />
        ) : (
          <button
            type="button"
            onClick={() => playable && setPlaying(true)}
            disabled={!playable}
            aria-label={playable ? `Play ${video.title}` : video.status}
            className="absolute inset-0 h-full w-full cursor-pointer disabled:cursor-default"
          >
            {video.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed, expiring URL; the optimizer would cache a stale one
              <img
                src={video.posterUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <video.Thumb className="absolute inset-0 h-full w-full text-ink-400" />
            )}

            {playable && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-highlight text-ink shadow-lg">
                  <PlayGlyph className="h-5 w-5 translate-x-[1px]" />
                </span>
              </span>
            )}
          </button>
        )}

        <span
          className={`tag pointer-events-none absolute right-3 top-3 rounded-full px-2.5 py-1 ${
            video.status === "failed"
              ? "bg-red-500/90 text-paper"
              : "bg-paper/85 text-ink"
          }`}
        >
          {video.status === "done" ? formatDuration(video.duration) : video.status}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-3 pt-4">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value.slice(0, 200))}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") inputRef.current?.blur();
              if (e.key === "Escape") {
                setDraft(video.title); // discard before blur commits it
                setEditing(false);
              }
            }}
            className="w-full rounded-lg bg-paper/70 px-2 py-1 font-display text-xl font-semibold text-ink outline-none ring-1 ring-ink/20"
          />
        ) : (
          <h2 className="font-display text-xl font-semibold leading-snug text-ink">
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Rename"
              className="text-left outline-none hover:underline focus-visible:underline"
            >
              {video.title}
            </button>
          </h2>
        )}

        <p className="mt-1.5 text-xs font-medium text-ink-600">
          {formatDate(video.createdAt)}
        </p>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-auto flex items-center gap-3 pt-4 text-xs font-medium">
          <Link
            href={`/editor?job=${video.id}`}
            className="text-ink-600 underline underline-offset-2 transition-opacity hover:opacity-70"
          >
            Edit
          </Link>
          {video.videoUrl && (
            <a
              href={video.videoUrl}
              download={downloadName(video)}
              className="text-ink-600 underline underline-offset-2 transition-opacity hover:opacity-70"
            >
              Download
            </a>
          )}
          {confirmingDelete ? (
            // Inline confirm rather than window.confirm: deleting is
            // irreversible and a native dialog is easy to dismiss by reflex.
            <span className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={commitDelete}
                disabled={busy}
                className="text-red-600 underline underline-offset-2 disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
                className="text-ink-400 underline underline-offset-2"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="ml-auto text-ink-400 underline underline-offset-2 transition-colors hover:text-red-600"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
