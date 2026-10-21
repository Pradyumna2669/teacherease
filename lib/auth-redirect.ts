// Where an auth flow is allowed to send someone afterwards.
//
// The `next` parameter comes back through Google and into a redirect, so it is
// attacker-controllable. Anything other than a plain same-site path would be an
// open redirect — a phishing primitive that borrows our domain's credibility.

export const DEFAULT_NEXT = "/dashboard";

// Characters that must never appear in a redirect path: backslashes and
// whitespace (including control characters) are what smuggle a host past a
// naive URL parser. Hyphens, dots and slashes are ordinary path content and
// must survive — /guides/class-3-maths is a real route.
const UNSAFE_PATH_CHARS = /[\\\s]/;

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_NEXT;
  const value = raw.trim();
  // Must be a site-relative path...
  if (!value.startsWith("/")) return DEFAULT_NEXT;
  // ...but "//evil.com" is a protocol-relative URL, not a path.
  if (value.startsWith("//")) return DEFAULT_NEXT;
  if (UNSAFE_PATH_CHARS.test(value)) return DEFAULT_NEXT;
  return value;
}

/** Friendly text for the errors Supabase hands back from a code exchange. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("code verifier") || m.includes("pkce")) {
    return "That sign-in link was opened in a different browser. Please try signing in again.";
  }
  if (m.includes("expired")) {
    return "That sign-in link has expired. Please try again.";
  }
  if (m.includes("provider is not enabled")) {
    return "Google sign-in is not switched on yet. Please use email for now.";
  }
  return "Sign-in did not complete. Please try again.";
}
