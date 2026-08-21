// Typed client for the backend API (jobs, projects, renders).
import { getSupabase } from "./supabase";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const WS_URL = API_URL.replace(/^http/, "ws");

/**
 * Current Supabase access token, or null when signed out or unconfigured.
 *
 * Read per request rather than cached: the Supabase client refreshes tokens in
 * the background, so a cached copy goes stale and starts 401ing mid-session.
 */
async function accessToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Authorization header for API calls.
 *
 * Empty when there's no session, which is deliberate: the backend runs open
 * when SUPABASE_URL is unset and attributes those requests to a local dev
 * user, so an unauthenticated call is still valid in that mode.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const token = await accessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
  /** Whether this render synthesizes a narrated voiceover. */
  voiceover: boolean;
  /** Denormalised from the parent project; null when none was supplied. */
  title: string | null;
  /** Length of the finished video; null until it completes. */
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressUpdate {
  job_id: string;
  status: JobStatus;
  progress: number;
  error?: string;
}

/** One curated video in the public catalogue. */
export interface LibraryVideo {
  id: string;
  title: string;
  url: string;
  duration_seconds: number | null;
}

/** A subject folder and the videos inside it. */
export interface LibraryCollection {
  slug: string;
  name: string;
  videos: LibraryVideo[];
}

/** Job plus its pipeline artifacts — what the editor loads. */
export interface JobDetail extends Job {
  prompt: string;
  title: string | null;
  narration_script: string | null;
  scene_code: string | null;
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

/**
 * Throw an ApiError carrying the server's own message where there is one.
 *
 * Matters most for 422 from /rerender: the body's `detail` is the validation
 * message ("Syntax error on line 4: ..."), and showing the reader a bare
 * "422" instead of that would waste the whole point of validating.
 */
async function raiseFor(res: Response, fallback: string): Promise<never> {
  let detail: string | undefined;
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") detail = body.detail;
  } catch {
    // Non-JSON error body — fall back to the generic message.
  }
  throw new ApiError(detail ?? `${fallback} (${res.status})`, res.status);
}

/**
 * Create a project + queued job for a prompt.
 *
 * `voiceover` defaults to true. Turning it off skips text-to-speech and ships
 * the silent animation, which is both faster and slightly cheaper.
 */
export async function createJob(
  prompt: string,
  title?: string,
  voiceover = true,
): Promise<Job> {
  const res = await fetch(`${API_URL}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ prompt, title, voiceover }),
  });
  if (!res.ok) {
    throw new ApiError(`Failed to create job (${res.status})`, res.status);
  }
  return res.json();
}

/** Fetch a job's current status/result — useful as a fallback if the socket drops. */
export async function getJob(jobId: string): Promise<Job> {
  const res = await fetch(`${API_URL}/jobs/${jobId}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new ApiError(`Failed to fetch job (${res.status})`, res.status);
  }
  return res.json();
}

/** Every job belonging to the signed-in account, newest first. */
export async function listJobs(limit = 50): Promise<Job[]> {
  const res = await fetch(`${API_URL}/jobs?limit=${limit}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return raiseFor(res, "Failed to load your videos");
  return res.json();
}

/**
 * The curated public catalogue, grouped by subject.
 *
 * Unauthenticated — this is the shop window, and it is browsable signed out.
 */
export async function listLibrary(): Promise<LibraryCollection[]> {
  const res = await fetch(`${API_URL}/library`);
  if (!res.ok) return raiseFor(res, "Failed to load the library");
  return res.json();
}

/** Fetch a job together with its narration and scene code, for the editor. */
export async function getJobDetail(jobId: string): Promise<JobDetail> {
  const res = await fetch(`${API_URL}/jobs/${jobId}/detail`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return raiseFor(res, "Failed to load job");
  return res.json();
}

/** Every render of this job's project, newest first. */
export async function listRevisions(jobId: string): Promise<Job[]> {
  const res = await fetch(`${API_URL}/jobs/${jobId}/revisions`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return raiseFor(res, "Failed to load revisions");
  return res.json();
}

/**
 * Render edited scene code as a new revision, leaving the original intact.
 *
 * Costs no API credits — the backend reuses the existing narration and calls
 * no LLM. A 422 means the code failed validation before anything was queued;
 * its message is safe to show verbatim.
 */
export async function rerenderJob(
  jobId: string,
  sceneCode: string,
  voiceover?: boolean,
): Promise<Job> {
  const res = await fetch(`${API_URL}/jobs/${jobId}/rerender`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    // Omitting voiceover inherits the revision's existing setting.
    body: JSON.stringify({
      scene_code: sceneCode,
      ...(voiceover === undefined ? {} : { voiceover }),
    }),
  });
  if (!res.ok) return raiseFor(res, "Failed to start re-render");
  return res.json();
}

/** Source of the ExplainerScene base class, for the editor's reference tab. */
export async function fetchSceneBase(): Promise<string> {
  const res = await fetch(`${API_URL}/scene-base`);
  if (!res.ok) return raiseFor(res, "Failed to load base scene");
  return res.text();
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
  let socket: WebSocket | null = null;
  let cancelled = false;

  // Looking up the token is async, so the socket opens once it resolves. The
  // returned cleanup stays synchronous, and `cancelled` covers unmounting
  // before the handshake starts — otherwise the socket would leak.
  void (async () => {
    const token = await accessToken();
    if (cancelled) return;

    // Browsers can't set headers on a WebSocket handshake, so the backend
    // reads the token from the query string instead (see get_ws_user_id).
    const query = token ? `?token=${encodeURIComponent(token)}` : "";
    const ws = new WebSocket(`${WS_URL}/jobs/${jobId}/progress${query}`);
    socket = ws;

    ws.onmessage = (event) => {
      try {
        onUpdate(JSON.parse(event.data) as ProgressUpdate);
      } catch {
        // Ignore malformed frames rather than crashing the subscriber.
      }
    };
    if (onSocketError) {
      ws.onerror = onSocketError;
    }
  })();

  return () => {
    cancelled = true;
    socket?.close();
  };
}
