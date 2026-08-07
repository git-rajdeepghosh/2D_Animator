"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth, type Profile } from "./AuthProvider";

/**
 * Top-right auth control: a "Sign in" button when logged out, an avatar with
 * a dropdown when logged in.
 *
 * Same restraint as the modal — the dropdown is a flat panel with a single
 * fade, so it never competes with the hero reveal.
 */

const AVATAR_TONES = [
  "bg-card-blue",
  "bg-card-sage",
  "bg-card-blush",
  "bg-card-amber",
];

function initials(profile: Profile): string {
  const source = profile.name || profile.email || "?";
  const words = source.replace(/@.*$/, "").split(/[\s._-]+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]);
  return (letters.join("") || source[0] || "?").toUpperCase();
}

/** Stable per-user tone, so the fallback avatar doesn't change colour. */
function toneFor(profile: Profile): string {
  let hash = 0;
  for (const ch of profile.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function Avatar({ profile, size }: { profile: Profile; size: number }) {
  const [broken, setBroken] = useState(false);
  const showImage = profile.avatarUrl && !broken;

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from
      // arbitrary OAuth CDNs; configuring next/image remote patterns for every
      // provider host buys nothing here.
      <img
        src={profile.avatarUrl as string}
        alt=""
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex items-center justify-center rounded-full font-medium text-ink ${toneFor(profile)}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(profile)}
    </span>
  );
}

export function ProfileMenu({ theme = "dark" }: { theme?: "dark" | "light" }) {
  const { user, loading, openPrompt, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onLight = theme === "light";

  if (loading) {
    return (
      <span
        aria-hidden="true"
        className={`block h-10 w-10 animate-pulse rounded-full ${
          onLight ? "bg-ink/10" : "bg-paper/15"
        }`}
      />
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openPrompt()}
        className={`tag rounded-full px-5 py-3 transition-opacity duration-200 hover:opacity-85 ${
          onLight ? "bg-ink text-paper" : "bg-paper text-ink"
        }`}
      >
        Sign in
      </button>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={`flex items-center rounded-full outline-none ring-offset-2 focus-visible:ring-2 ${
          onLight ? "ring-ink ring-offset-paper" : "ring-paper ring-offset-ink"
        }`}
      >
        <Avatar profile={user} size={40} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] w-64 animate-fade-in overflow-hidden rounded-2xl bg-paper py-2"
        >
          <div className="px-4 py-3">
            <p className="truncate text-sm font-medium text-ink">
              {user.name || "Signed in"}
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-ink-400">
              {user.email}
            </p>
          </div>

          <div className="my-1 h-px bg-ink/10" />

          <Link
            href="/my-videos"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-ink hover:text-paper"
          >
            My Videos
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-ink hover:text-paper"
          >
            Settings
          </Link>

          <div className="my-1 h-px bg-ink/10" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-ink transition-colors duration-150 hover:bg-ink hover:text-paper"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
