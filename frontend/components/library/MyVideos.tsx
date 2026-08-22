"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayGlyph } from "@/components/landing/PlayGlyph";
import { VideoCardItem } from "./VideoCardItem";
import { fetchMyVideos, type VideoCard } from "./videos";

/**
 * `/library` — the videos this account has generated.
 *
 * Card treatment matches the showcase section: pastel fill, the same hue a
 * step deeper framing the thumbnail, ink type.
 */
export function MyVideos() {
  const [videos, setVideos] = useState<VideoCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchMyVideos()
      .then((rows) => {
        if (active) setVideos(rows);
      })
      .catch((err) => {
        // Real request now, so a real failure path: an expired session or a
        // backend that isn't up would otherwise hang on the skeleton forever.
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load videos");
        setVideos([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // Update in place rather than refetching: the list is already correct and a
  // round-trip would make renaming and deleting feel slower than they are.
  function handleRenamed(id: string, title: string) {
    setVideos((rows) =>
      rows?.map((v) => (v.id === id ? { ...v, title } : v)) ?? rows,
    );
  }

  function handleDeleted(id: string) {
    setVideos((rows) => rows?.filter((v) => v.id !== id) ?? rows);
  }

  return (
    <div className="bg-paper pb-28 pt-32 sm:pt-40">
      <div className="mx-auto max-w-6xl px-6">
        <header className="border-b border-ink/10 pb-12">
          <p className="tag mb-5 inline-block text-ink-400">Library</p>
          <h1 className="max-w-3xl font-display text-[clamp(2.6rem,6vw,4.6rem)] font-bold leading-[1.02] text-ink">
            Your videos.
          </h1>
          <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-ink-400">
            Everything you&apos;ve generated, newest first.
          </p>
        </header>

        {error && (
          <p className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-ink-600">
            {error}
          </p>
        )}

        {videos === null ? (
          <VideoGridSkeleton />
        ) : videos.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <li key={video.id}>
                <VideoCardItem
                  video={video}
                  onRenamed={handleRenamed}
                  onDeleted={handleDeleted}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function VideoGridSkeleton() {
  return (
    <ul
      aria-busy="true"
      className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      <li className="sr-only">Loading your videos…</li>
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="rounded-3xl border border-ink/10 p-3 pb-6">
          <div className="aspect-[4/3] animate-pulse rounded-2xl bg-ink/10" />
          <div className="px-3 pt-5">
            <div className="h-4 w-4/5 animate-pulse rounded-full bg-ink/10" />
            <div className="mt-3 h-3 w-1/3 animate-pulse rounded-full bg-ink/10" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="mt-20 flex flex-col items-center rounded-3xl border border-ink/10 px-6 py-20 text-center">
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-highlight text-ink"
      >
        <PlayGlyph className="h-7 w-7 translate-x-[1px]" />
      </span>
      <h2 className="mt-7 font-display text-3xl font-bold text-ink">
        You haven&apos;t made any videos yet
      </h2>
      <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-ink-400">
        Describe a concept in plain language and we&apos;ll script, animate and
        narrate it for you.
      </p>
      <Link
        href="/generator"
        className="tag mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-paper transition-opacity duration-200 hover:opacity-85"
      >
        Generate a video
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
