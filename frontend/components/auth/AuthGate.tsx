"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./AuthProvider";

/**
 * Route protection.
 *
 * Three states, and the middle one matters most: while the session is still
 * resolving we render a skeleton rather than either the real content or a
 * redirect. Redirecting early would bounce signed-in users out of their own
 * pages on every refresh.
 */
export function AuthGate({
  children,
  skeleton,
}: {
  children: React.ReactNode;
  skeleton?: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (loading || user) return;
    const query = search.toString();
    const next = query ? `${pathname}?${query}` : pathname;
    router.replace(`/?signin=1&next=${encodeURIComponent(next)}`);
  }, [loading, user, router, pathname, search]);

  if (loading || !user) {
    return <>{skeleton ?? <AuthGateSkeleton />}</>;
  }

  return <>{children}</>;
}

export function AuthGateSkeleton() {
  return (
    <div className="bg-paper pb-28 pt-32 sm:pt-40" aria-busy="true">
      <div className="mx-auto max-w-6xl px-6">
        <span className="sr-only">Checking your session…</span>
        <div className="h-4 w-28 animate-pulse rounded-full bg-ink/10" />
        <div className="mt-6 h-14 w-2/3 animate-pulse rounded-2xl bg-ink/10" />
        <div className="mt-4 h-4 w-1/3 animate-pulse rounded-full bg-ink/10" />
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-3xl bg-ink/5 p-3 pb-6">
              <div className="aspect-[4/3] animate-pulse rounded-2xl bg-ink/10" />
              <div className="mt-5 h-4 w-3/4 animate-pulse rounded-full bg-ink/10" />
              <div className="mt-3 h-3 w-1/2 animate-pulse rounded-full bg-ink/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
