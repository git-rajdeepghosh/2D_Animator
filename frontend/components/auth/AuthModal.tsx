"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { GitHubIcon, GoogleIcon } from "./ProviderIcons";

/**
 * Sign-in modal. OAuth only — no email/password.
 *
 * Kept deliberately plain: flat surface, one fade, no scale or slide. The
 * hero's reveal and the showcase's radiating cards are the page's motion
 * budget, and a bouncy modal on top of them would read as noise.
 */
export function AuthModal() {
  const { promptOpen, closePrompt, signIn, returnTo, configured } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!promptOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePrompt();
    };
    document.addEventListener("keydown", onKey);
    firstButtonRef.current?.focus();

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [promptOpen, closePrompt]);

  if (!promptOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <button
        type="button"
        aria-label="Close sign in"
        onClick={closePrompt}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/70"
      />

      <div
        ref={panelRef}
        className="relative w-full max-w-sm animate-fade-in rounded-3xl bg-paper p-8"
      >
        <h2
          id="auth-modal-title"
          className="font-display text-3xl font-bold leading-tight text-ink"
        >
          Sign in
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-ink-400">
          Continue with a provider to save the videos you generate.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <button
            ref={firstButtonRef}
            type="button"
            onClick={() => signIn("google", returnTo ?? undefined)}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-ink/15 bg-paper px-5 py-3.5 text-sm font-medium text-ink transition-colors duration-200 hover:bg-ink hover:text-paper"
          >
            <GoogleIcon className="h-5 w-5 shrink-0" />
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => signIn("github", returnTo ?? undefined)}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-ink/15 bg-paper px-5 py-3.5 text-sm font-medium text-ink transition-colors duration-200 hover:bg-ink hover:text-paper"
          >
            <GitHubIcon className="h-5 w-5 shrink-0" />
            Continue with GitHub
          </button>
        </div>

        {!configured && (
          <p className="mt-6 rounded-2xl bg-ink/5 px-4 py-3 text-[11px] font-medium leading-relaxed text-ink-400">
            Supabase isn&apos;t configured, so these buttons sign you in as a
            mock user for layout work only. Set
            <code className="mx-1 font-mono">NEXT_PUBLIC_SUPABASE_URL</code>
            and
            <code className="mx-1 font-mono">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>
            for real OAuth.
          </p>
        )}
      </div>
    </div>
  );
}
