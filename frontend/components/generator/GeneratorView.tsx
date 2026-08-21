"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PlayGlyph } from "@/components/landing/PlayGlyph";
import { StageTracker } from "@/components/generator/StageTracker";
import {
  createJob,
  getJob,
  subscribeJobProgress,
  videoUrl,
  type JobStatus,
} from "@/lib/api";

const MAX_LENGTH = 800;

type Phase = "idle" | "submitting" | JobStatus;

export function GeneratorView() {
  const searchParams = useSearchParams();

  const [prompt, setPrompt] = useState(() => searchParams.get("prompt") ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Narrated voiceover. On by default; turning it off skips the TTS stage,
  // which makes the render finish sooner and cost slightly less.
  const [voiceover, setVoiceover] = useState(true);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  useEffect(() => () => unsubscribeRef.current?.(), []);

  const isBusy = phase !== "idle" && phase !== "done" && phase !== "failed";
  const isDone = phase === "done";
  const isFailed = phase === "failed";

  const handleSubmit = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isBusy) return;

    unsubscribeRef.current?.();
    setError(null);
    setVideoSrc(null);
    setProgress(0);
    setPhase("submitting");

    try {
      const job = await createJob(trimmed, undefined, voiceover);
      setJobId(job.id);
      setPhase(job.status);
      setProgress(job.progress);

      unsubscribeRef.current = subscribeJobProgress(
        job.id,
        async (update) => {
          setPhase(update.status);
          setProgress(update.progress);

          if (update.status === "failed") {
            setError(update.error ?? "The render failed. Please try again.");
          }

          if (update.status === "done") {
            try {
              const finished = await getJob(job.id);
              setVideoSrc(videoUrl(finished));
            } catch {
              setError("Rendered, but couldn't load the result. Try refreshing.");
            }
          }
        },
        () => setError("Lost connection to the server. Refresh to check status."),
      );
    } catch (err) {
      setPhase("failed");
      setError(err instanceof Error ? err.message : "Couldn't start the job.");
    }
    // `voiceover` belongs here: without it, toggling the checkbox after typing
    // the prompt would submit the value captured when the callback was last
    // rebuilt rather than what's on screen.
  }, [prompt, isBusy, voiceover]);

  const handleReset = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setJobId(null);
    setPhase("idle");
    setProgress(0);
    setError(null);
    setVideoSrc(null);
    setPrompt("");
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <header className="border-b border-paper/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/" className="font-display text-2xl text-paper">
            2DAnimator
          </Link>
          <Link
            href="/"
            className="tag rounded-full bg-paper px-4 py-2 text-ink transition-opacity hover:opacity-80"
          >
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-20">
        <p className="tag mb-4 text-paper/50">Generator</p>
        <h1 className="font-display text-3xl leading-tight text-paper sm:text-4xl">
          Describe it. We&apos;ll animate it.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-paper/55 sm:text-base">
          Plain language in, a short narrated explainer out &mdash; script and
          animation generated from your prompt.
        </p>

        {!isDone && (
          <div className="mt-10 rounded-3xl border border-paper/10 bg-paper/5 p-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, MAX_LENGTH))}
              placeholder="Explain how binary search works…"
              rows={3}
              disabled={isBusy}
              className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-sm text-paper outline-none placeholder:text-paper/35 disabled:opacity-50 sm:text-base"
            />
            <div className="flex items-center justify-between gap-3 border-t border-paper/10 px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="text-xs text-paper/40">
                  {prompt.trim().length}/{MAX_LENGTH}
                </span>
                <label
                  className={`flex cursor-pointer select-none items-center gap-2 text-xs transition-colors ${
                    voiceover ? "text-paper/70" : "text-paper/40"
                  } ${isBusy ? "pointer-events-none opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={voiceover}
                    onChange={(e) => setVoiceover(e.target.checked)}
                    disabled={isBusy}
                    className="h-3.5 w-3.5 accent-highlight"
                  />
                  Voiceover
                </label>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isBusy || prompt.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-full bg-highlight px-5 py-2.5 text-sm font-medium text-ink transition-transform duration-200 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              >
                {isBusy ? "Generating…" : isFailed ? "Try again" : "Generate"}
                {!isBusy && <PlayGlyph className="h-4 w-4 translate-x-[1px]" />}
              </button>
            </div>
          </div>
        )}

        {phase === "submitting" && (
          <p className="mt-8 text-xs text-paper/40">Starting…</p>
        )}

        {phase !== "idle" && phase !== "submitting" && !isDone && !isFailed && (
          <StageTracker phase={phase} progress={progress} />
        )}

        {isFailed && (
          <div className="mt-6 rounded-2xl border border-accent-red/30 bg-accent-red/10 px-5 py-4">
            <p className="text-sm text-paper/90">
              {error ?? "Something went wrong."}
            </p>
            {jobId && (
              <p className="mt-1 font-mono text-xs text-paper/40">job {jobId}</p>
            )}
          </div>
        )}

        {isDone && videoSrc && (
          <div className="mt-10">
            <p className="tag mb-3 text-paper/40">Ready</p>
            <div className="overflow-hidden rounded-3xl border border-paper/10 bg-paper/5">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- generated narration has no track yet */}
              <video src={videoSrc} controls className="w-full" />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="tag rounded-full bg-paper px-4 py-2 text-ink transition-opacity hover:opacity-80"
              >
                Generate another
              </button>
              {/* Re-rendering an edit calls no LLM, so this is the cheap way
                  to fix a scene that came out almost right. */}
              {jobId && (
                <Link
                  href={`/editor?job=${jobId}`}
                  className="tag rounded-full border border-paper/20 px-4 py-2 text-paper/70 transition-opacity hover:opacity-80"
                >
                  Edit the code
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
