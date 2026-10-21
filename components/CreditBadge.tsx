"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Coins, Loader2 } from "lucide-react";
import { inAndroidApp } from "@/lib/twa";

import { getPapersRemaining } from "@/lib/credit-packs";

// Live credit balance pill. Polls /api/credits/balance and links to top-up.
// Displays remaining AI paper generations (e.g. "3 papers remaining").
export function CreditBadge({ lowAt = 20 }: { lowAt?: number }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [wallet, setWallet] = useState<"personal" | "school">("personal");
  const [loading, setLoading] = useState(true);
  // null until resolved on the client — the pill only becomes a link to the buy
  // page once we know we are not inside the Android app.
  const [inApp, setInApp] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/credits/balance", { cache: "no-store" });
      const data = await res.json();
      setBalance(typeof data.balance === "number" ? data.balance : null);
      setWallet(data.wallet === "school" ? "school" : "personal");
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setInApp(inAndroidApp());
    load();
    // Refresh when the tab regains focus (e.g. after a top-up in another tab).
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const papers = getPapersRemaining(balance);
  const low = papers !== null && papers === 0;

  const className = `flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
    low
      ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
      : "text-ink bg-ink/5 border-ink/10 hover:bg-ink/10"
  }`;

  const inner = (
    <>
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Coins size={12} />
      )}
      {papers === null ? "Papers" : `${papers} ${papers === 1 ? "paper" : "papers"} remaining`}
      {wallet === "school" && <span className="hidden sm:inline">· pool</span>}
    </>
  );

  // Inside the Android app the pill is a read-out only: Play forbids routing a
  // teacher to our own checkout from there.
  if (inApp !== false) {
    return (
      <span title={wallet === "school" ? "School pool credits" : "Your credits"} className={className}>
        {inner}
      </span>
    );
  }

  return (
    <Link
      href="/topup"
      title={wallet === "school" ? "School pool credits" : "Your credits — tap to top up"}
      className={className}
    >
      {inner}
    </Link>
  );
}
