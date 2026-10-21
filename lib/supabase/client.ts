"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Uses the public anon key — all access is
// constrained by Row-Level Security, so it is safe to ship to the client.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
