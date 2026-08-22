"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayGlyph } from "@/components/landing/PlayGlyph";
import { collectionStyle, videoThumb } from "./collections";
import { formatDuration } from "./videos";
import { API_URL, listLibrary, type LibraryCollection } from "@/lib/api";

/**
 * `/library` — the public catalogue, grouped by subject. Open to everyone; a
 * reader's own generated videos live behind auth at `/my-videos`.
 *
 * Collections come from the backend, which reads them off disk: one folder per
 * subject under `storage/library`, MP4s inside. Adding a video is copying a
 * file, so this page has no notion of publishing or ordering beyond that.
 */
export function LibraryBrowser() {
  const [collections, setCollections] = useState<LibraryCollection[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listLibrary()
      .then((rows) => {
        if (active) setCollections(rows);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load library");
        setCollections([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const total = (collections ?? []).reduce((n, c) => n + c.videos.length, 0);

  return (
    <div className="bg-paper pb-28 pt-32 sm:pt-40">
      <div className="mx-auto max-w-6xl px-6">
        <header className="border-b border-ink/10 pb-14">
          <p className="tag mb-5 inline-block text-ink-400">Library</p>
          <h1 className="max-w-3xl font-display text-[clamp(2.6rem,6vw,4.6rem)] font-bold leading-[1.02] text-ink">
            Every explainer, by collection.
          </h1>
          <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-ink-400">
            {collections === null
              ? "Loading the catalogue…"
              : total === 0
                ? "Nothing published yet — generate a video and add it to a subject folder to see it here."
                : `${total} video${total === 1 ? "" : "s"} across ${collections.length} collection${collections.length === 1 ? "" : "s"} — browse one, or describe your own and generate it.`}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/generator"
              className="tag inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-paper transition-opacity duration-200 hover:opacity-85"
            >
              Generate your own
              <span aria-hidden="true">→</span>
            </Link>
            {(collections ?? []).map((collection) => (
              <a
                key={collection.slug}
                href={`#${collection.slug}`}
                className={`tag rounded-full border px-4 py-3 text-ink transition-colors duration-200 hover:bg-ink hover:text-paper ${collectionStyle(collection.slug).border}`}
              >
                {collection.name}
              </a>
            ))}
          </div>
        </header>

        {error && (
          <p className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-ink-600">
            {error}
          </p>
        )}

        {collections !== null && collections.length === 0 && !error && (
          <EmptyLibrary />
        )}

        {(collections ?? []).map((collection) => {
          const style = collectionStyle(collection.slug);
          return (
            <section
              key={collection.slug}
              id={collection.slug}
              className="scroll-mt-28 border-b border-ink/10 py-16 last:border-b-0"
            >
              <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-tight text-ink">
                  {collection.name}
                </h2>
                <span className="tag pb-2 text-ink-400">
                  {collection.videos.length} video
                  {collection.videos.length === 1 ? "" : "s"}
                </span>
              </div>

              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {collection.videos.map((video) => {
                  const Thumb = videoThumb(video.id);
                  const src = `${API_URL}${video.url}`;
                  return (
                    <li key={video.id}>
                      <article
                        className={`group h-full overflow-hidden rounded-3xl border p-3 pb-6 ${style.fill} ${style.border}`}
                      >
                        <a href={src} target="_blank" rel="noreferrer">
                          <div
                            className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${style.deep}`}
                          >
                            <Thumb className="absolute inset-0 h-full w-full text-ink-400" />

                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-highlight text-ink">
                                <PlayGlyph className="h-5 w-5 translate-x-[1px]" />
                              </span>
                            </span>

                            <span className="tag absolute right-3 top-3 rounded-full bg-paper/85 px-2.5 py-1 text-ink">
                              {formatDuration(video.duration_seconds)}
                            </span>
                          </div>
                        </a>

                        <h3 className="px-3 pt-5 font-display text-xl font-semibold leading-snug text-ink">
                          <a
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="outline-none focus-visible:underline"
                          >
                            {video.title}
                          </a>
                        </h3>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="mt-16 rounded-3xl border border-ink/10 px-8 py-16 text-center">
      <p className="font-display text-2xl font-semibold text-ink">
        The catalogue is empty.
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-400">
        Drop an <code className="font-mono text-ink-600">.mp4</code> into a
        subject folder under{" "}
        <code className="font-mono text-ink-600">storage/library/</code> — for
        example{" "}
        <code className="font-mono text-ink-600">
          physics/why-orbits-are-ellipses.mp4
        </code>{" "}
        — and it appears here. The filename becomes the title.
      </p>
    </div>
  );
}
