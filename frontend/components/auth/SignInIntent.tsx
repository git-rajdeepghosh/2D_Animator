"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./AuthProvider";

/**
 * Turns `?signin=1&next=…` into an open sign-in modal that remembers where the
 * reader was headed. `AuthGate` and the OAuth callback both bounce here rather
 * than to a dedicated login page, so sign-in stays a modal everywhere.
 *
 * The params are stripped once consumed, so a refresh doesn't reopen the modal
 * and the URL stays clean.
 */
export function SignInIntent() {
  const { user, loading, openPrompt } = useAuth();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const handled = useRef(false);

  const wants = search.get("signin") === "1";
  const next = search.get("next");

  useEffect(() => {
    if (!wants || loading || handled.current) return;
    handled.current = true;

    const safeNext =
      next && next.startsWith("/") && !next.startsWith("//") ? next : null;

    if (user) {
      // Already signed in — the guard that sent us here was stale.
      router.replace(safeNext ?? pathname);
      return;
    }

    openPrompt(safeNext ?? undefined);

    const params = new URLSearchParams(search.toString());
    params.delete("signin");
    params.delete("next");
    const rest = params.toString();
    router.replace(rest ? `${pathname}?${rest}` : pathname);
  }, [wants, next, loading, user, openPrompt, router, pathname, search]);

  return null;
}

/** True when the current URL is asking for the sign-in modal. */
export function hasSignInIntent(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("signin") === "1";
}
