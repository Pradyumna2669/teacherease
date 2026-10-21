"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FileText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function AuthCard() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // The OAuth callback redirects back here with ?error= when Google sign-in
  // fails or is cancelled.
  const [error, setError] = useState<string | null>(params.get("error"));
  const [notice, setNotice] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setNotice("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
          return;
        }
        void fetch("/api/funnel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "signup", metadata: { provider: "email" } }),
          keepalive: true,
        }).catch(() => undefined);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // Google sign-in. A Google account's email address is already verified, so
  // this path has no confirmation email to get lost in a spam folder — which is
  // where most of our email signups were dying.
  async function signInWithGoogle() {
    setError(null);
    setNotice(null);
    setGoogleBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: {
            // Ask for a refresh token and let a teacher pick which of their
            // accounts to use — many have a personal and a school address.
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      if (error) throw error;
      // On success the browser navigates to Google; nothing after this runs.
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not start Google sign-in.");
      setGoogleBusy(false);
    }
  }

  async function forgotPassword() {
    setError(null);
    setNotice(null);
    if (!email) {
      setError("Enter your email above first, then tap “Forgot password”.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (error) throw error;
      setNotice("Password reset link sent. Check your email.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send reset link.");
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
        <span className="font-display text-2xl font-semibold tracking-tight text-ink">Teacher<span className="ink-blank">Ease</span></span>
      </Link>

      <div className="bg-white rounded-2xl shadow-xl shadow-rule/60 border border-rule p-5 sm:p-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-graphite mt-1">
          {mode === "signin"
            ? "Sign in to access your saved papers."
            : "Sign up to save and edit papers from anywhere."}
        </p>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy || googleBusy}
          className="mt-6 w-full inline-flex items-center justify-center gap-3 min-h-[48px] px-4 py-3 border border-rule rounded-lg font-medium text-ink bg-white hover:bg-rule/40 active:bg-rule/60 transition-colors disabled:opacity-60"
        >
          {googleBusy ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
          )}
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-rule" />
          <span className="text-xs text-graphite">or use email</span>
          <div className="h-px flex-1 bg-rule" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">Email</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-rule rounded-lg focus:ring-2 focus:ring-pen focus:border-pen outline-none"
              placeholder="teacher@school.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">Password</label>
            <input
              type="password"
              name="password"
              // Telling the password manager which field it is looking at is the
              // difference between an offered saved login and a silent one.
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-rule rounded-lg focus:ring-2 focus:ring-pen focus:border-pen outline-none"
              placeholder="••••••••"
            />
            {mode === "signin" && (
              <div className="mt-1.5 text-right">
                <button
                  type="button"
                  onClick={forgotPassword}
                  disabled={busy}
                  className="py-3 min-h-[44px] text-xs text-graphite hover:text-pen transition-colors disabled:opacity-60"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {notice && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-pen text-white py-2.5 rounded-lg font-semibold hover:bg-ink transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-graphite">
          {mode === "signin" ? (
            <>
              No account?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setNotice(null);
                }}
                className="text-pen font-medium hover:underline"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setNotice(null);
                }}
                className="text-pen font-medium hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-pen/5 via-white to-purple-50 flex items-center justify-center px-4">
      <Suspense fallback={null}>
        <AuthCard />
      </Suspense>
    </div>
  );
}
