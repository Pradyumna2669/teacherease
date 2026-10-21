"use client";

import { useEffect } from "react";

/**
 * Registers the service worker.
 *
 * Registration is what makes the app installable and what lets an Android
 * wrapper (Trusted Web Activity) pass Play's PWA checks. It runs after load so
 * it never competes with the first paint on a slow connection — which is most
 * of them.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // A worker registered from `next dev` caches half-built assets and then
    // serves them after a rebuild, which looks like ghost bugs.
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failing costs the install prompt and the offline page,
        // nothing else. Never surface it to a teacher.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
