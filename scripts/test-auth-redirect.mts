// The `next` parameter round-trips through Google and back into a redirect, so
// it is attacker-controllable. These assert it can never become an off-site
// redirect, and that ordinary in-app paths still survive.
//
//   npx tsx scripts/test-auth-redirect.mts

import { safeNextPath, friendlyAuthError, DEFAULT_NEXT } from "../lib/auth-redirect";

const results: Array<[string, boolean, string]> = [];
function check(name: string, ok: boolean, detail = "") {
  results.push([name, ok, detail]);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const BACKSLASH = String.fromCharCode(92);

console.log("\n=== ordinary paths survive ===");
for (const good of [
  "/dashboard",
  "/bank",
  "/builder?id=abc-123",
  "/guides/class-3-maths-question-paper",
  "/languages/hindi",
  "/account#billing",
]) {
  const got = safeNextPath(good);
  check(`${good} kept`, got === good, got);
}

console.log("\n=== off-site redirects blocked ===");
const bad: Array<[string, string]> = [
  ["absolute https", "https://evil.com/steal"],
  ["absolute http", "http://evil.com"],
  ["protocol-relative", "//evil.com"],
  ["backslash host", "/" + BACKSLASH + "evil.com"],
  ["backslash slash", "/" + BACKSLASH + "/evil.com"],
  ["javascript scheme", "javascript:alert(1)"],
  ["data scheme", "data:text/html,<script>"],
  ["leading whitespace + absolute", "   https://evil.com"],
  ["embedded space", "/path with space"],
  ["embedded newline", "/path\nHost: evil.com"],
  ["embedded tab", "/path\tevil"],
  ["bare word", "dashboard"],
  ["empty", ""],
];
for (const [name, value] of bad) {
  const got = safeNextPath(value);
  check(`${name} blocked`, got === DEFAULT_NEXT, got);
}
check("null blocked", safeNextPath(null) === DEFAULT_NEXT);
check("undefined blocked", safeNextPath(undefined) === DEFAULT_NEXT);

console.log("\n=== error messages are human ===");
check(
  "PKCE humanised",
  /different browser/i.test(
    friendlyAuthError("PKCE code verifier not found in storage.")
  )
);
check(
  "provider disabled humanised",
  /not switched on/i.test(
    friendlyAuthError("Unsupported provider: provider is not enabled")
  )
);
check(
  "expired humanised",
  /expired/i.test(friendlyAuthError("Token has expired or is invalid"))
);
check(
  "unknown falls back",
  friendlyAuthError("weird internal thing") ===
    "Sign-in did not complete. Please try again."
);
check(
  "raw provider error never leaks",
  !friendlyAuthError("PKCE code verifier not found in storage.").includes("PKCE")
);

console.log("\n" + "=".repeat(56));
const failed = results.filter(([, ok]) => !ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  failed.forEach(([n, , d]) => console.log(`  FAILED: ${n}${d ? ` — got ${d}` : ""}`));
  process.exitCode = 1;
}
console.log("");
