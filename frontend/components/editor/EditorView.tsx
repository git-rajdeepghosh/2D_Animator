"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  ApiError,
  fetchSceneBase,
  getJobDetail,
  listRevisions,
  rerenderJob,
  subscribeJobProgress,
  videoUrl,
  type Job,
  type JobDetail,
} from "@/lib/api";

type Tab = "scene" | "base";

const TERMINAL = new Set(["done", "failed"]);

/**
 * `/editor` — the playground: the Manim source behind a video, editable and
 * re-renderable.
 *
 * Re-rendering calls no LLM (the backend reuses the existing narration), so
 * iterating here is free apart from sandbox time. Each render is a new
 * revision rather than an overwrite, so a working version is never lost to an
 * experiment.
 */
export function EditorView({ jobId }: { jobId: string }) {
  // The revision currently loaded. Re-rendering points this at the new one.
  const [currentId, setCurrentId] = useState(jobId);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [revisions, setRevisions] = useState<Job[]>([]);
  const [code, setCode] = useState("");
  const [baseSource, setBaseSource] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("scene");

  const [loadError, setLoadError] = useState<string | null>(null);
  // Validation rejection from the API — shown above the editor, not fatal.
  const [problem, setProblem] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  // Cleanup for the in-flight progress socket, so unmounting mid-render (or
  // starting another render) doesn't leave one open.
  const unsubscribe = useRef<(() => void) | null>(null);
  useEffect(() => () => unsubscribe.current?.(), []);

  const loadRevision = useCallback(async (id: string) => {
    try {
      const d = await getJobDetail(id);
      setDetail(d);
      setCode(d.scene_code ?? "");
      setCurrentId(id);
      setProblem(null);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load job");
    }
  }, []);

  useEffect(() => {
    void loadRevision(jobId);
  }, [jobId, loadRevision]);

  // Revision list is keyed off the project, so any member id returns them all.
  const refreshRevisions = useCallback(async () => {
    try {
      setRevisions(await listRevisions(jobId));
    } catch {
      // Non-fatal: the editor still works without the history sidebar.
    }
  }, [jobId]);

  useEffect(() => {
    void refreshRevisions();
  }, [refreshRevisions]);

  // Fetched from the API rather than bundled so the helpers shown here can
  // never drift from the base class actually injected into the sandbox.
  useEffect(() => {
    fetchSceneBase()
      .then(setBaseSource)
      .catch(() => setBaseSource(null));
  }, []);

  const dirty = useMemo(
    () => detail !== null && code !== (detail.scene_code ?? ""),
    [code, detail],
  );

  async function handleRender() {
    setBusy(true);
    setProblem(null);
    setStatus("queued");
    setProgress(0);

    let revision: Job;
    try {
      revision = await rerenderJob(currentId, code);
    } catch (err) {
      // 422 carries the validator's message; anything else is a real failure.
      setProblem(
        err instanceof ApiError ? err.message : "Failed to start re-render",
      );
      setBusy(false);
      setStatus(null);
      return;
    }

    void refreshRevisions();

    unsubscribe.current?.();
    unsubscribe.current = subscribeJobProgress(revision.id, (update) => {
      setStatus(update.status);
      setProgress(update.progress);
      if (!TERMINAL.has(update.status)) return;

      setBusy(false);
      unsubscribe.current?.();
      unsubscribe.current = null;
      // Load the finished revision either way: on success for its video, on
      // failure for the render error now stored on the job.
      void loadRevision(revision.id);
      void refreshRevisions();
    });
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-6">
        <div className="text-center">
          <p className="text-sm text-paper-400">{loadError}</p>
          <Link
            href="/my-videos"
            className="tag mt-6 inline-block rounded-full bg-paper px-4 py-2 text-ink"
          >
            Back to your videos
          </Link>
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-sm text-paper-600">Loading…</p>
      </main>
    );
  }

  const src = videoUrl(detail);

  return (
    <main className="min-h-screen bg-ink pb-20">
      <header className="flex items-center justify-between gap-4 px-6 py-6">
        <div className="min-w-0">
          <p className="tag text-paper-400">Editor</p>
          <h1 className="truncate font-display text-2xl text-paper">
            {detail.title ?? "Untitled"}
          </h1>
          <p className="mt-1 truncate text-sm text-paper-600">{detail.prompt}</p>
        </div>
        <Link
          href="/my-videos"
          className="tag shrink-0 rounded-full bg-paper px-4 py-2 text-ink transition-opacity hover:opacity-80"
        >
          Back
        </Link>
      </header>

      <div className="grid gap-6 px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* ---------------- code ---------------- */}
        <section className="flex min-w-0 flex-col rounded-3xl border border-paper/10 bg-paper/5">
          <div className="flex items-center gap-1 border-b border-paper/10 px-3 py-2">
            <TabButton active={tab === "scene"} onClick={() => setTab("scene")}>
              scene.py
            </TabButton>
            <TabButton active={tab === "base"} onClick={() => setTab("base")}>
              base.py
            </TabButton>
            {tab === "base" && (
              <span className="ml-2 text-xs text-paper-600">read-only</span>
            )}
            {tab === "scene" && dirty && (
              <span className="ml-2 text-xs text-highlight">edited</span>
            )}
          </div>

          {tab === "scene" ? (
            <CodeMirror
              value={code}
              height="60vh"
              theme={oneDark}
              extensions={[python()]}
              onChange={setCode}
              editable={!busy}
            />
          ) : (
            <CodeMirror
              value={baseSource ?? "# could not load base.py"}
              height="60vh"
              theme={oneDark}
              extensions={[python()]}
              editable={false}
            />
          )}

          {problem && (
            <p className="border-t border-paper/10 px-4 py-3 font-mono text-xs leading-relaxed text-red-300">
              {problem}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-paper/10 px-4 py-3">
            <span className="text-xs text-paper-600">
              {busy
                ? `${status ?? "working"} · ${progress}%`
                : dirty
                  ? "Unsaved edits — render to see them"
                  : "Renders as a new revision; this one is kept"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCode(detail.scene_code ?? "");
                  setProblem(null);
                }}
                disabled={busy || !dirty}
                className="rounded-full px-4 py-2 text-sm text-paper-400 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Revert
              </button>
              <button
                type="button"
                onClick={handleRender}
                disabled={busy || code.trim().length === 0}
                className="rounded-full bg-highlight px-5 py-2.5 text-sm font-medium text-ink transition-transform duration-200 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              >
                {busy ? "Rendering…" : "Render"}
              </button>
            </div>
          </div>
        </section>

        {/* ---------------- output ---------------- */}
        <section className="flex min-w-0 flex-col gap-6">
          <div className="overflow-hidden rounded-3xl border border-paper/10 bg-black">
            {src ? (
              // key forces the element to reload when switching revisions,
              // otherwise the browser keeps showing the previous video.
              <video key={src} src={src} controls className="w-full" />
            ) : (
              <div className="flex aspect-video items-center justify-center">
                <p className="text-sm text-paper-600">
                  {detail.status === "failed"
                    ? "This revision failed to render."
                    : "No video yet."}
                </p>
              </div>
            )}
          </div>

          {detail.error && (
            <div className="rounded-3xl border border-red-400/25 bg-red-400/5 p-4">
              <p className="tag mb-2 text-red-300/70">Render error</p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-red-200/90">
                {detail.error}
              </pre>
            </div>
          )}

          <div className="rounded-3xl border border-paper/10 bg-paper/5 p-4">
            <p className="tag mb-3 text-paper-600">Revisions</p>
            <ul className="flex flex-col gap-1">
              {revisions.map((rev, i) => {
                const active = rev.id === currentId;
                return (
                  <li key={rev.id}>
                    <button
                      type="button"
                      onClick={() => void loadRevision(rev.id)}
                      disabled={busy}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed ${
                        active
                          ? "bg-paper/10 text-paper"
                          : "text-paper-400 hover:bg-paper/5"
                      }`}
                    >
                      <span className="truncate">
                        {i === revisions.length - 1
                          ? "Original"
                          : `Revision ${revisions.length - i - 1}`}
                        {active && " · viewing"}
                      </span>
                      <span
                        className={`shrink-0 text-xs ${
                          rev.status === "failed"
                            ? "text-red-300/80"
                            : "text-paper-600"
                        }`}
                      >
                        {rev.status}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {detail.narration_script && (
            <div className="rounded-3xl border border-paper/10 bg-paper/5 p-4">
              <p className="tag mb-2 text-paper-600">Narration</p>
              <p className="max-h-40 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-paper-400">
                {detail.narration_script}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
        active ? "bg-paper/10 text-paper" : "text-paper-600 hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}
