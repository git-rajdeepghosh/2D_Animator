"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./AuthProvider";

/**
 * Where Supabase lands after OAuth.
 *
 * The SDK reads the session straight out of the redirect URL, so all this
 * needs to do is wait for `loading` to clear and then send the reader back to
 * whatever they were doing, via the `next` param the sign-in call attached.
 */

/** Only ever return to a path on this origin — never an attacker-supplied URL. */
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export function AuthCallbackView() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [stalled, setStalled] = useState(false);

  const next = safeNext(search.get("next"));
  const error = search.get("error_description") ?? search.get("error");

  useEffect(() => {
    if (error) return;
    if (loading) return;
    router.replace(user ? next : `/?signin=1&next=${encodeURIComponent(next)}`);
  }, [loading, user, next, router, error]);

  // If the session never arrives, say so rather than spinning forever.
  useEffect(() => {
    const timer = setTimeout(() => setStalled(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      {error ? (
        <>
          <h1 className="font-display text-3xl font-bold text-ink">
            Sign in didn&apos;t complete
          </h1>
          <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-ink-400">
            {error}
          </p>
          <a
            href={`/?signin=1&next=${encodeURIComponent(next)}`}
            className="tag mt-8 rounded-full bg-ink px-5 py-3 text-paper transition-opacity hover:opacity-85"
          >
            Try again
          </a>
        </>
      ) : (
        <>
          <span
            aria-hidden="true"
            className="h-9 w-9 animate-spin rounded-full border-2 border-ink/15 border-t-ink"
          />
          <p
            className="tag mt-6 text-ink-400"
            role="status"
            aria-live="polite"
          >
            {stalled ? "Still working" : "Signing you in"}
          </p>
          {stalled && (
            <p className="mt-3 max-w-xs text-xs font-medium leading-relaxed text-ink-400">
              This is taking longer than expected. You can{" "}
              <a href="/" className="underline">
                go back home
              </a>{" "}
              and try again.
            </p>
          )}
        </>
      )}
    </main>
  );
}
