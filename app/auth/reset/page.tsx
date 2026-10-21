"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FileText, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false); // recovery session established
  const [checking, setChecking] = useState(true);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The recovery link (from the reset email) lands here. Supabase either puts a
  // ?code=… on the URL (PKCE) or emits a PASSWORD_RECOVERY auth event once it
  // reads the token from the URL hash. Handle both.
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    (async () => {
      const code = params.get("code");
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch {
          /* fall through to session check */
        }
      }
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        if (data.session) setReady(true);
        setChecking(false);
      }
    })();
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 6) return setError("Password must be at least 6 characters.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setDone(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="flex items-center gap-2 justify-center mb-8">
        <div className="w-10 h-10 bg-pen rounded-xl flex items-center justify-center">
          <FileText size={20} className="text-white" />
        </div>
        <span className="font-display text-2xl font-semibold tracking-tight text-ink">
          Teacher<span className="ink-blank">Ease</span>
        </span>
      </Link>

      <div className="bg-white rounded-2xl shadow-xl shadow-rule/60 border border-rule p-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Set a new password
        </h1>

        {checking ? (
          <p className="mt-4 text-sm text-graphite flex items-center gap-2">
            <Loader2 size={15} className="animate-spin" /> Checking your reset link…
          </p>
        ) : !ready ? (
          <div className="mt-4">
            <p className="text-sm text-graphite">
              This reset link is invalid or has expired. Request a new one from the
              sign-in page.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block bg-pen text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-ink transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
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
              <label className="block text-sm font-medium text-graphite mb-1">Confirm password</label>
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
                <Check size={15} /> Password updated — taking you in…
              </div>
            )}

            <button
              type="submit"
              disabled={busy || done}
              className="w-full bg-pen text-white py-2.5 rounded-lg font-semibold hover:bg-ink transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Update password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-pen/5 via-white to-purple-50 flex items-center justify-center px-4">
      <Suspense fallback={null}>
        <ResetInner />
      </Suspense>
    </div>
  );
}
