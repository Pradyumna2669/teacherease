import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  TWA_COOKIE,
  TWA_REFERRER,
  TWA_SRC,
  BROWSER_COOKIE,
  isTwaCookie,
} from "@/lib/twa";

// Routes that require a signed-in teacher.
const PROTECTED = ["/dashboard", "/builder", "/bank", "/account", "/admin"];

// Private app routes that must never appear in search (stronger than robots.txt
// disallow — this actively removes them from the index if already crawled).
const NOINDEX = ["/dashboard", "/builder", "/school", "/bank", "/account", "/admin", "/auth"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env isn't configured (e.g. missing on the host), don't throw and
  // 500 every page — just skip auth and let requests through.
  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: refreshes the auth token; do not run logic between this and the
  // response return that could short-circuit the cookie write. Fail open on an
  // auth-backend hiccup rather than crashing the request.
  let user = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    user = null;
  }

  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Signed-in users skip the auth screen.
  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // The Android app must show no payment surface at all (Play Billing policy),
  // so the buy pages are blocked for it here rather than only hidden in the UI.
  // The launch referrer and ?src=twa marker exist on the first request only —
  // pin the verdict to a cookie the pages read as well.
  const twaLaunch =
    request.nextUrl.searchParams.get("src") === TWA_SRC ||
    (request.headers.get("referer") ?? "").startsWith(TWA_REFERRER);

  // A launch signal always wins; otherwise the cookie decides, and isTwaCookie
  // already stands down once the client has proved this is a browser tab.
  const inApp = twaLaunch || isTwaCookie(request.cookies);

  if (inApp && (path === "/topup" || path === "/pricing")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (twaLaunch) {
    response.cookies.set(TWA_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
      sameSite: "lax",
    });
    // Same jar, same device: a browser verdict recorded earlier is now stale.
    response.cookies.delete(BROWSER_COOKIE);
  }

  // Keep private app pages out of search engines.
  if (NOINDEX.some((p) => path === p || path.startsWith(p + "/"))) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known|api/assetlinks|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
