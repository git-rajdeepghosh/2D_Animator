import type { JobStatus } from "@/lib/api";

const STAGES: { key: JobStatus; label: string }[] = [
  { key: "queued", label: "Queued" },
  { key: "scripting", label: "Writing narration" },
  { key: "rendering", label: "Animating your scene" },
  { key: "voicing", label: "Finishing up" },
  { key: "done", label: "Ready" },
];

/** Progress bar + stage list for an in-flight job. */
export function StageTracker({
  phase,
  progress,
}: {
  phase: JobStatus;
  progress: number;
}) {
  const activeIndex = STAGES.findIndex((s) => s.key === phase);

  return (
    <div className="mt-8">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper/10">
        <div
          className="h-full rounded-full bg-highlight transition-[width] duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
        />
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {STAGES.map((stage, index) => {
          const state =
            index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
          return (
            <li
              key={stage.key}
              className={`flex items-center gap-2 text-xs ${
                state === "pending" ? "text-paper-600" : "text-paper"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  state === "pending" ? "bg-paper/20" : "bg-highlight"
                } ${state === "active" ? "animate-pulse" : ""}`}
                aria-hidden="true"
              />
              {stage.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
