// Typed client for the backend API (jobs, projects, renders).
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const WS_URL = API_URL.replace(/^http/, "ws");

export type JobStatus =
  | "queued"
  | "scripting"
  | "rendering"
  | "voicing"
  | "done"
  | "failed";

export interface Job {
  id: string;
  project_id: string;
  status: JobStatus;
  progress: number;
  video_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressUpdate {
  job_id: string;
  status: JobStatus;
  progress: number;
  error?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Create a project + queued job for a prompt. */
export async function createJob(prompt: string, title?: string): Promise<Job> {
  const res = await fetch(`${API_URL}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, title }),
  });
  if (!res.ok) {
    throw new ApiError(`Failed to create job (${res.status})`, res.status);
  }
  return res.json();
}

/** Fetch a job's current status/result — useful as a fallback if the socket drops. */
export async function getJob(jobId: string): Promise<Job> {
  const res = await fetch(`${API_URL}/jobs/${jobId}`);
  if (!res.ok) {
    throw new ApiError(`Failed to fetch job (${res.status})`, res.status);
  }
  return res.json();
}

/** Absolute URL for a job's rendered video, or null if it isn't ready yet. */
export function videoUrl(job: Pick<Job, "video_url">): string | null {
  return job.video_url ? `${API_URL}${job.video_url}` : null;
}

/**
 * Opens the job's progress WebSocket and forwards updates. The socket closes
 * itself once the job reaches a terminal status (done/failed); call the
 * returned cleanup function on unmount to close it early.
 */
export function subscribeJobProgress(
  jobId: string,
  onUpdate: (update: ProgressUpdate) => void,
  onSocketError?: () => void,
): () => void {
  const socket = new WebSocket(`${WS_URL}/jobs/${jobId}/progress`);

  socket.onmessage = (event) => {
    try {
      onUpdate(JSON.parse(event.data) as ProgressUpdate);
    } catch {
      // Ignore malformed frames rather than crashing the subscriber.
    }
  };
  if (onSocketError) {
    socket.onerror = onSocketError;
  }

  return () => socket.close();
}
