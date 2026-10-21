import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath, friendlyAuthError } from "@/lib/auth-redirect";
import { recordFunnelEvent } from "@/lib/funnel-events";

// OAuth landing point. Google redirects here with a one-time code, which we
// exchange for a session cookie before sending the teacher on to wherever they
// were headed.
//
// Google sign-in exists because 41% of email signups never confirmed their
// address — Supabase's built-in mailer lands in Gmail spam. A Google account's
// email is already verified, so there is no confirmation step to lose people at.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only ever redirect to a path on this site — see safeNextPath.
  const next = safeNextPath(searchParams.get("next"));

  // Behind Vercel's proxy the request origin is the internal host, so prefer the
  // forwarded host when building the final redirect.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const base =
    process.env.NODE_ENV === "development" || !forwardedHost
      ? origin
      : `${forwardedProto}://${forwardedHost}`;

  // Google can bounce back with an error instead of a code (user hit Cancel).
  const oauthError = searchParams.get("error_description") || searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(oauthError)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent("Sign-in did not complete. Please try again.")}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(friendlyAuthError(error.message))}`
    );
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const createdAt = new Date(user.created_at).getTime();
      if (Date.now() - createdAt < 60_000) {
        await recordFunnelEvent("signup", user.id, { provider: "google" });
      }
    }
  } catch {
    // Auth succeeded; don't block login if tracking fails
  }

  return NextResponse.redirect(`${base}${next}`);
}
