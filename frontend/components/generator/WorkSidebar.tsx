"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listJobs, type Job } from "@/lib/api";

const STORAGE_KEY = "2danimator:sidebar-collapsed";

/** Dot colour per status, so the list scans without reading every label. */
const STATUS_TONE: Record<string, string> = {
  done: "bg-accent-green",
  failed: "bg-accent-red",
};

/**
 * Past work, alongside the generator.
 *
 * Generating is the only thing on this page that costs money, so having
 * everything already made sitting next to the prompt box is what stops someone
 * regenerating a video they already have.
 *
 * `refreshKey` is bumped by the parent when a job finishes; the list reloads
 * rather than trying to splice a new row in, since the server also fills in
 * the title, duration and poster.
 */
export function WorkSidebar({
  activeJobId,
  refreshKey = 0,
}: {
  activeJobId?: string | null;
  refreshKey?: number;
}) {
  // Starts expanded on both server and client — reading localStorage during
  // the first render would make the markup disagree with the server's and
  // trip a hydration warning. The stored value is applied just after mount.
  const [collapsed, setCollapsed] = useState(false);
  const [jobs, setJobs] = useState<Job[] | null>(null);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((was) => {
      const next = !was;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  useEffect(() => {
    let active = true;
    listJobs(30)
      .then((rows) => active && setJobs(rows))
      .catch(() => active && setJobs([]));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-paper/10 bg-paper/[0.03] transition-[width] duration-300 md:flex ${
        collapsed ? "w-14" : "w-72"
      }`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-5 ${
          collapsed ? "justify-center" : "justify-between pl-5"
        }`}
      >
        {!collapsed && <p className="tag text-paper-600">Your work</p>}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-paper-600 transition-colors hover:bg-paper/10 hover:text-paper"
        >
          <ChevronIcon className={collapsed ? "rotate-180" : ""} />
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="px-3 pb-3">
            <Link
              href="/generator"
              className="flex items-center justify-center rounded-xl border border-paper/15 px-3 py-2 text-sm font-medium text-paper transition-colors hover:bg-paper/10"
            >
              New video
            </Link>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-6">
            {jobs === null ? (
              <ul className="space-y-1.5 px-1" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <li
                    key={i}
                    className="h-11 animate-pulse rounded-lg bg-paper/[0.06]"
                  />
                ))}
              </ul>
            ) : jobs.length === 0 ? (
              <p className="px-3 py-6 text-xs leading-relaxed text-paper-600">
                Nothing here yet. Your generated videos will collect in this
                list.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {jobs.map((job) => {
                  const active = job.id === activeJobId;
                  return (
                    <li key={job.id}>
                      <Link
                        href={`/editor?job=${job.id}`}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                          active
                            ? "bg-paper/10 text-paper"
                            : "text-paper-400 hover:bg-paper/[0.06] hover:text-paper"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            STATUS_TONE[job.status] ?? "bg-paper-600"
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {job.title?.trim() || "Untitled video"}
                          </span>
                          <span className="block truncate text-[11px] text-paper-600">
                            {relativeDate(job.created_at)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>

          <div className="border-t border-paper/10 px-3 py-3">
            <Link
              href="/my-videos"
              className="block rounded-lg px-3 py-2 text-xs font-medium text-paper-600 transition-colors hover:bg-paper/[0.06] hover:text-paper"
            >
              All videos →
            </Link>
          </div>
        </>
      )}
    </aside>
  );
}

/** "3h ago" / "2d ago" — a full date is more precision than this list needs. */
function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  const days = Math.round(minutes / (60 * 24));
  if (days < 30) return `${days}d ago`;
  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={`h-4 w-4 transition-transform duration-300 ${className}`}
    >
      <path
        d="M10 3.5 5.5 8l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
