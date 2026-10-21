"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Check, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { JoinCommunityButton } from "@/components/JoinCommunity";

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login?next=/account");
      else setEmail(data.user.email ?? null);
    });
  }, [router]);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (pw.length < 6) return setError("Password must be at least 6 characters.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setDone(true);
      setPw("");
      setPw2("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="lp min-h-dvh bg-paper text-ink flex flex-col">
      <nav className="border-b border-rule bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-graphite hover:text-ink transition-colors -mx-2 px-2 py-2 min-h-[44px] lg:min-h-0 rounded-lg">
            <ArrowLeft size={16} /> My Papers
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm text-graphite hover:text-ink transition-colors -mx-2 px-2 py-2 min-h-[44px] lg:min-h-0 rounded-lg"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
        <p className="font-mono text-xs tracking-[0.18em] uppercase text-pen">Account</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
          Account settings
        </h1>

        <div className="mt-8 bg-white border border-rule rounded-lg p-6">
          <h2 className="font-display text-lg">Signed in as</h2>
          <p className="mt-1 text-graphite">{email ?? "…"}</p>
        </div>

        <div className="mt-6 bg-white border border-rule rounded-lg p-6">
          <h2 className="font-display text-lg">Teachers community</h2>
          <p className="mt-1 text-sm text-graphite">
            Ask for question types, languages or board formats you need, and hear
            first when they ship. Free WhatsApp group — leave any time.
          </p>
          <JoinCommunityButton variant="solid" className="mt-4 !inline-flex" />
        </div>

        <div className="mt-6 bg-white border border-rule rounded-lg p-6">
          <h2 className="font-display text-lg">Change password</h2>
          <p className="mt-1 text-sm text-graphite">
            Set a new password for your account. You&apos;ll stay signed in.
          </p>

          <form onSubmit={changePassword} className="mt-5 space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium text-graphite mb-1">New password</label>
              <input
                type="password"
                required
                minLength={6}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
                className="w-full px-3 py-2.5 border border-rule rounded-lg focus:ring-2 focus:ring-pen focus:border-pen outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-graphite mb-1">Confirm new password</label>
              <input
                type="password"
                required
                minLength={6}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                autoComplete="new-password"
                className="w-full px-3 py-2.5 border border-rule rounded-lg focus:ring-2 focus:ring-pen focus:border-pen outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            {done && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex items-center gap-2">
                <Check size={15} /> Password updated.
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 bg-pen text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-ink transition-colors disabled:opacity-60"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Update password
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
