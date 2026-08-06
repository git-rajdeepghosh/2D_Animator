import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Generator — 2DAnimator",
};

/** Page 2. Deliberately empty — the generator interface lands here. */
export default function GeneratorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <header className="border-b border-paper/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <h1 className="font-display text-2xl text-paper">
            Generator — placeholder
          </h1>
          <Link
            href="/"
            className="tag rounded-full bg-paper px-4 py-2 text-ink transition-opacity hover:opacity-80"
          >
            Back
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <p className="max-w-sm text-center text-sm leading-relaxed text-paper/40">
          Placeholder screen. The prompt input, render progress and timeline
          editor will live here.
        </p>
      </main>
    </div>
  );
}
