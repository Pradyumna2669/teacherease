// Are we running inside the Android app (a TWA over papergen.online)?
//
// Google Play requires Play Billing for digital goods, and India cannot use
// third-party in-app billing or "pay on our website" links until ~Sep 2027. So
// the app ships consumption-only: credits are bought in Chrome and merely spent
// in the app. Every payment surface is gated on the checks below.
//
// Detection deliberately does NOT use `getDigitalGoodsService`: that API only
// exists when Play Billing is enabled, which this build intentionally does not
// do — it would silently report "browser" and render Razorpay inside the app.

export const TWA_COOKIE = "pg_twa";

// Set once we have positively seen a real browser tab. The TWA shares Chrome's
// cookie jar, so a stale pg_twa would otherwise follow the teacher into the
// browser and bounce her off /topup — the only place she is able to buy.
// Middleware trusts this over pg_twa for exactly that reason.
export const BROWSER_COOKIE = "pg_browser";

// Referrer Chrome sets on a navigation launched by our TWA shell.
export const TWA_REFERRER = "android-app://online.papergen.app";

// Launch marker carried by twa-manifest startUrl/shortcuts. document.referrer
// is empty after the first client-side navigation, so a cold start needs this.
export const TWA_SRC = "twa";

// What an out-of-credits teacher sees inside the app. Anti-steering is judged
// by a human at review time: no website, no link, no button, no price.
export const OUT_OF_CREDITS = "You're out of credits.";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

function hasFlag(): boolean {
  return document.cookie
    .split("; ")
    .some((c) => c === `${TWA_COOKIE}=1`);
}

// Client-side verdict. Safe in render or in an event handler; false while
// server-rendering, so gate payment UI on an explicit `=== false`.
export function inAndroidApp(): boolean {
  if (typeof document === "undefined") return false;

  const launched =
    document.referrer.startsWith(TWA_REFERRER) ||
    new URLSearchParams(window.location.search).get("src") === TWA_SRC;

  if (launched) {
    document.cookie = `${TWA_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    return true;
  }

  // A browser tab is never display-mode standalone. Drop the stale flag and
  // record that we saw a real browser, so the server stops guessing too.
  if (!window.matchMedia("(display-mode: standalone)").matches) {
    document.cookie = `${TWA_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${BROWSER_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    return false;
  }

  return hasFlag();
}

// Server-side reader — call as isTwaCookie(cookies()) from next/headers, or
// with request.cookies in middleware. It takes the store instead of importing
// next/headers so this module stays importable from client components too.
export function isTwaCookie(store: {
  get(name: string): { value: string } | undefined;
}): boolean {
  // A positive browser sighting wins: the flag is shared with Chrome, and
  // treating a browser tab as the app hides the only checkout there is.
  if (store.get(BROWSER_COOKIE)?.value === "1") return false;
  return store.get(TWA_COOKIE)?.value === "1";
}
