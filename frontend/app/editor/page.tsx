import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthGate, AuthGateSkeleton } from "@/components/auth/AuthGate";
import { EditorView } from "@/components/editor/EditorView";

export const metadata: Metadata = {
  title: "Editor — 2DAnimator",
  robots: { index: false, follow: false },
};

/**
 * Editing layer: refine the generated Manim source and re-render it.
 *
 * The job is read from `?job=<id>` server-side rather than with
 * useSearchParams, which keeps the client component free of its own Suspense
 * requirement — the AuthGate boundary below is the only one needed.
 */
export default function EditorPage({
  searchParams,
}: {
  searchParams: { job?: string };
}) {
  const jobId = searchParams.job;

  if (!jobId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-6">
        <div className="text-center">
          <p className="tag mb-3 text-paper/50">Editor</p>
          <p className="text-sm text-paper/60">
            Open a video from your library to edit its scene.
          </p>
          <Link
            href="/my-videos"
            className="tag mt-6 inline-block rounded-full bg-paper px-4 py-2 text-ink transition-opacity hover:opacity-80"
          >
            Your videos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <Suspense fallback={<AuthGateSkeleton />}>
      <AuthGate>
        <EditorView jobId={jobId} />
      </AuthGate>
    </Suspense>
  );
}
