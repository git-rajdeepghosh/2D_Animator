"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { GitHubIcon, GoogleIcon } from "./ProviderIcons";

/**
 * `/settings` — display name is editable, everything sourced from the OAuth
 * provider is read-only, because we have no way to write it back.
 */
export function SettingsView() {
  const { user, updateName, signOut, configured } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  // The profile arrives asynchronously; seed the field once it does.
  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  if (!user) return null;

  const dirty = name.trim() !== user.name && name.trim().length > 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    setStatus("saving");
    await updateName(name);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  };

  const providerLabel =
    user.provider === "github"
      ? "GitHub"
      : user.provider === "google"
        ? "Google"
        : "Unknown";

  return (
    <div className="bg-paper pb-28 pt-32 sm:pt-40">
      <div className="mx-auto max-w-2xl px-6">
        <header className="border-b border-ink/10 pb-12">
          <p className="tag mb-5 inline-block text-ink-400">Settings</p>
          <h1 className="font-display text-[clamp(2.4rem,5vw,3.6rem)] font-bold leading-[1.05] text-ink">
            Your account.
          </h1>
        </header>

        <section className="border-b border-ink/10 py-12">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Profile
          </h2>

          <div className="mt-8 flex items-center gap-5">
            <ReadOnlyAvatar
              url={user.avatarUrl}
              name={user.name || user.email}
            />
            <div>
              <p className="text-sm font-medium text-ink">Profile photo</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-ink-400">
                Managed by {providerLabel}. Change it there and sign in again.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-10">
            <label
              htmlFor="display-name"
              className="tag mb-3 block text-ink-400"
            >
              Display name
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-w-0 flex-1 rounded-full border border-ink/15 bg-paper px-5 py-3 text-sm font-medium text-ink outline-none focus-visible:border-ink"
                placeholder="How you'd like to be known"
              />
              <button
                type="submit"
                disabled={!dirty || status === "saving"}
                className="tag rounded-full bg-ink px-5 py-3 text-paper transition-opacity duration-200 hover:opacity-85 disabled:opacity-35"
              >
                {status === "saving" ? "Saving" : "Save"}
              </button>
            </div>
            <p
              role="status"
              aria-live="polite"
              className="mt-3 h-4 text-xs font-medium text-ink-400"
            >
              {status === "saved" ? "Saved." : ""}
            </p>
          </form>

          <div className="mt-8">
            <p className="tag mb-3 text-ink-400">Email</p>
            <p className="text-sm font-medium text-ink-400">{user.email}</p>
          </div>
        </section>

        <section className="border-b border-ink/10 py-12">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Connected account
          </h2>
          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-ink/10 px-5 py-4">
            {user.provider === "github" ? (
              <GitHubIcon className="h-6 w-6 shrink-0 text-ink" />
            ) : (
              <GoogleIcon className="h-6 w-6 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{providerLabel}</p>
              <p className="mt-0.5 truncate text-xs font-medium text-ink-400">
                {user.email}
              </p>
            </div>
          </div>
          {!configured && (
            <p className="mt-4 text-xs font-medium leading-relaxed text-ink-400">
              Supabase isn&apos;t configured, so this is mock session data.
            </p>
          )}
        </section>

        <section className="py-12">
          <button
            type="button"
            onClick={() => void signOut()}
            className="tag rounded-full border border-ink/15 px-5 py-3 text-ink transition-colors duration-200 hover:bg-ink hover:text-paper"
          >
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}

function ReadOnlyAvatar({
  url,
  name,
}: {
  url: string | null;
  name: string;
}) {
  const [broken, setBroken] = useState(false);

  if (url && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary OAuth
      // CDN hosts; not worth enumerating in next/image remote patterns.
      <img
        src={url}
        alt=""
        width={72}
        height={72}
        onError={() => setBroken(true)}
        className="h-[72px] w-[72px] rounded-full object-cover"
      />
    );
  }

  const initials =
    name
      .replace(/@.*$/, "")
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <span
      aria-hidden="true"
      className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-card-blue text-2xl font-medium text-ink"
    >
      {initials}
    </span>
  );
}
