"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getSupabase,
  isSupabaseConfigured,
  type OAuthProvider,
} from "@/lib/supabase";

/**
 * Session state for the whole app.
 *
 * When Supabase env vars are absent the provider runs in demo mode: sign-in
 * stores a mock profile in localStorage so every authed surface — dropdown,
 * library, settings, route guards — can still be built and reviewed. The
 * modal says so plainly; nothing here pretends to be a real session.
 */

export type Profile = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  provider: OAuthProvider | null;
};

type AuthValue = {
  user: Profile | null;
  /** True until the first session check resolves. Guards render on this. */
  loading: boolean;
  configured: boolean;
  signIn: (provider: OAuthProvider, returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  /** Sign-in modal plumbing, shared by the nav and the route guards. */
  promptOpen: boolean;
  openPrompt: (returnTo?: string) => void;
  closePrompt: () => void;
  returnTo: string | null;
};

const AuthContext = createContext<AuthValue | null>(null);

const DEMO_KEY = "2danimator.demo-user";

const DEMO_USER: Record<OAuthProvider, Profile> = {
  google: {
    id: "demo-google",
    name: "Placeholder User",
    email: "placeholder@example.com",
    avatarUrl: null,
    provider: "google",
  },
  github: {
    id: "demo-github",
    name: "Placeholder User",
    email: "placeholder@users.noreply.github.com",
    avatarUrl: null,
    provider: "github",
  },
};

/** Supabase spreads OAuth profile fields across a few differently-named keys. */
function toProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): Profile {
  const meta = user.user_metadata ?? {};
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = meta[k];
      if (typeof v === "string" && v.trim()) return v;
    }
    return null;
  };
  return {
    id: user.id,
    name: pick("full_name", "name", "user_name", "preferred_username") ?? "",
    email: user.email ?? pick("email") ?? "",
    avatarUrl: pick("avatar_url", "picture"),
    provider:
      (user.app_metadata?.provider as OAuthProvider | undefined) ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [promptOpen, setPromptOpen] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();

    if (!supabase) {
      try {
        const stored = window.localStorage.getItem(DEMO_KEY);
        if (stored) setUser(JSON.parse(stored) as Profile);
      } catch {
        /* storage unavailable — treat as signed out */
      }
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session ? toProfile(data.session.user) : null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? toProfile(session.user) : null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (provider: OAuthProvider, next?: string) => {
      const supabase = getSupabase();
      const destination = next ?? returnTo ?? window.location.pathname;

      if (!supabase) {
        const demo = DEMO_USER[provider];
        setUser(demo);
        try {
          window.localStorage.setItem(DEMO_KEY, JSON.stringify(demo));
        } catch {
          /* non-fatal */
        }
        setPromptOpen(false);
        if (destination && destination !== window.location.pathname) {
          window.location.assign(destination);
        }
        return;
      }

      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", destination);

      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callback.toString() },
      });
    },
    [returnTo],
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      try {
        window.localStorage.removeItem(DEMO_KEY);
      } catch {
        /* non-fatal */
      }
    }
    setUser(null);
  }, []);

  const updateName = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const supabase = getSupabase();

      if (supabase) {
        await supabase.auth.updateUser({ data: { full_name: trimmed } });
      }

      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, name: trimmed };
        if (!supabase) {
          try {
            window.localStorage.setItem(DEMO_KEY, JSON.stringify(next));
          } catch {
            /* non-fatal */
          }
        }
        return next;
      });
    },
    [],
  );

  const openPrompt = useCallback((next?: string) => {
    setReturnTo(next ?? null);
    setPromptOpen(true);
  }, []);

  const closePrompt = useCallback(() => setPromptOpen(false), []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      configured: isSupabaseConfigured,
      signIn,
      signOut,
      updateName,
      promptOpen,
      openPrompt,
      closePrompt,
      returnTo,
    }),
    [
      user,
      loading,
      signIn,
      signOut,
      updateName,
      promptOpen,
      openPrompt,
      closePrompt,
      returnTo,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
