import Link from "next/link";
import { PlayGlyph } from "@/components/landing/PlayGlyph";
import { COLLECTIONS } from "./collections";

/**
 * `/library` — every video, grouped by the collection it belongs to. This is
 * the browsing page the homepage section only teases.
 */
export function LibraryBrowser() {
  const total = COLLECTIONS.reduce((n, c) => n + c.videos.length, 0);

  return (
    <div className="bg-paper pb-28 pt-32 sm:pt-40">
      <div className="mx-auto max-w-6xl px-6">
        <header className="border-b border-ink/10 pb-14">
          <p className="tag mb-5 inline-block text-ink-400">Library</p>
          <h1 className="max-w-3xl font-display text-[clamp(2.6rem,6vw,4.6rem)] font-bold leading-[1.02] text-ink">
            Every explainer, by collection.
          </h1>
          <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-ink-400">
            Placeholder copy. {total} placeholder videos across{" "}
            {COLLECTIONS.length} collections — browse one, or describe your own
            and generate it.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/generator"
              className="tag inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-paper transition-opacity duration-200 hover:opacity-85"
            >
              Generate your own
              <span aria-hidden="true">→</span>
            </Link>
            {COLLECTIONS.map((collection) => (
              <a
                key={collection.slug}
                href={`#${collection.slug}`}
                className={`tag rounded-full border px-4 py-3 text-ink transition-colors duration-200 hover:bg-ink hover:text-paper ${collection.border}`}
              >
                {collection.name}
              </a>
            ))}
          </div>
        </header>

        {COLLECTIONS.map((collection) => (
          <section
            key={collection.slug}
            id={collection.slug}
            className="scroll-mt-28 border-b border-ink/10 py-16 last:border-b-0"
          >
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-tight text-ink">
                  {collection.name}
                </h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-ink-400">
                  Short animated explainers for {collection.topic} concepts.
                </p>
              </div>
              <span className="tag pb-2 text-ink/45">
                {collection.videos.length} videos
              </span>
            </div>

            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {collection.videos.map((video) => (
                <li key={video.title}>
                  <article
                    className={`group h-full overflow-hidden rounded-3xl border p-3 pb-6 ${collection.fill} ${collection.border}`}
                  >
                    <div
                      className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${collection.deep}`}
                    >
                      <video.Thumb className="absolute inset-0 h-full w-full text-ink/55" />

                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-highlight text-ink">
                          <PlayGlyph className="h-5 w-5 translate-x-[1px]" />
                        </span>
                      </span>

                      <span className="tag absolute right-3 top-3 rounded-full bg-paper/85 px-2.5 py-1 text-ink">
                        {video.length}
                      </span>
                    </div>

                    <h3 className="px-3 pt-5 font-display text-xl font-semibold leading-snug text-ink">
                      <a
                        href="#"
                        className="outline-none focus-visible:underline"
                      >
                        {video.title}
                      </a>
                    </h3>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
