import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase browser client, created lazily.
 *
 * Both env vars are optional on purpose: with no project configured the whole
 * site would otherwise fail to render, which makes the auth UI impossible to
 * work on. `isSupabaseConfigured` lets the auth layer fall back to a clearly
 * labelled demo mode instead of throwing.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The callback route relies on the SDK reading the session straight
        // out of the redirect URL.
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export type OAuthProvider = "google" | "github";
