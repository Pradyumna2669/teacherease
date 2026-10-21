"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  FileText,
  ArrowLeft,
  Check,
  Sparkles,
  Building2,
  ShieldCheck,
  Zap,
  Clock,
  X,
  Smartphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  TOPUP_PACKS,
  CREDIT_PLANS,
  CreditPack,
} from "@/lib/credit-packs";
import { inAndroidApp } from "@/lib/twa";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function TopupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inApp, setInApp] = useState(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);

  useEffect(() => {
    setInApp(inAndroidApp());
    try {
      if (localStorage.getItem("teacherease_upgrade_banner_closed") === "true") {
        setShowUpgradeBanner(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      setEmail(data.user?.email ?? "");
    });
  }, []);

  const closeBanner = () => {
    setShowUpgradeBanner(false);
    try {
      localStorage.setItem("teacherease_upgrade_banner_closed", "true");
    } catch {}
  };

  // One-time pack purchase via Razorpay Orders.
  async function buyPack(pack: CreditPack) {
    setError(null);
    if (inAndroidApp()) return;
    if (!signedIn) return router.push("/login?next=/topup");
    setBusy(pack.id);
    try {
      const ok = await loadCheckout();
      if (!ok) throw new Error("Could not load the payment window. Check your internet connection.");

      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout.");

      const rzp = new window.Razorpay!({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: "INR",
        name: "TeacherEase",
        description: `${pack.name} — ${pack.papers} Papers`,
        prefill: { email },
        theme: { color: "#4f46e5" },
        handler: () => {
          router.push("/dashboard?topup=1");
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      void fetch("/api/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "payment_started",
          metadata: { packId: pack.id, amountInr: pack.amountInr },
        }),
        keepalive: true,
      }).catch(() => undefined);
      rzp.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(null);
    }
  }

  // Monthly credit subscription
  async function subscribe(planId: string) {
    setError(null);
    if (inApp) return;
    if (!signedIn) return router.push("/login?next=/topup");
    setBusy(planId);
    try {
      const ok = await loadCheckout();
      if (!ok) throw new Error("Could not load the payment window.");

      const res = await fetch("/api/razorpay/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout.");

      const rzp = new window.Razorpay!({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "TeacherEase",
        description: `${planId} — Monthly Paper Plan`,
        prefill: { email },
        theme: { color: "#4f46e5" },
        handler: () => router.push("/dashboard?subscribed=1"),
        modal: { ondismiss: () => setBusy(null) },
      });
      rzp.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(null);
    }
  }

  if (inApp) return null;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-paper-warm/50 via-white to-purple-50/40 text-ink pb-16">
      {/* Announcement Banner for Existing & New Users */}
      {showUpgradeBanner && (
        <div className="bg-gradient-to-r from-pen via-indigo-600 to-purple-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium shadow-sm transition-all">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase shrink-0">
                New Update
              </span>
              <p className="truncate sm:whitespace-normal">
                🎉 <b>Simplified Paper Counts:</b> Unlimited page scans per paper! No more per-page charges.
              </p>
            </div>
            <button
              onClick={closeBanner}
              className="p-1 hover:bg-white/20 rounded-md transition-colors shrink-0"
              aria-label="Dismiss banner"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-pen rounded-xl flex items-center justify-center shadow-xs">
            <FileText size={18} className="text-white" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-ink">
            Paper<span className="text-pen">ly</span>
          </span>
        </Link>
        <Link
          href={signedIn ? "/dashboard" : "/login"}
          className="flex items-center gap-1.5 text-sm font-medium text-graphite hover:text-ink px-3 py-2 min-h-[44px] hover:bg-white/80 rounded-xl transition-colors"
        >
          <ArrowLeft size={16} />
          {signedIn ? "Back to Dashboard" : "Sign In"}
        </Link>
      </header>

      {/* Hero Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 bg-pen/10 text-pen px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles size={13} />
            Simple &amp; Affordable Exam Packs
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-ink leading-tight">
            Pay per paper. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pen to-indigo-600">
              Scan as many pages as you want.
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-graphite max-w-xl mx-auto">
            No confusing credit math. Every paper comes with unlimited handwriting scans, zero watermarks, zero ads, and instant downloads.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-medium text-graphite">
            <span className="flex items-center gap-1.5 bg-white border border-rule/80 px-3 py-1.5 rounded-full shadow-2xs">
              <Check size={14} className="text-emerald-600" /> Instant UPI (GPay, PhonePe, Paytm)
            </span>
            <span className="flex items-center gap-1.5 bg-white border border-rule/80 px-3 py-1.5 rounded-full shadow-2xs">
              <Check size={14} className="text-emerald-600" /> Credits never expire
            </span>
            <span className="flex items-center gap-1.5 bg-white border border-rule/80 px-3 py-1.5 rounded-full shadow-2xs">
              <Check size={14} className="text-emerald-600" /> Word (.docx) &amp; PDF
            </span>
          </div>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center shadow-xs">
            {error}
          </div>
        )}

        {/* Paper Packs Grid (Mobile-First Responsive Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-stretch">
          {TOPUP_PACKS.map((pack) => {
            const perPaper = (pack.amountInr / pack.papers).toFixed(1);
            return (
              <div
                key={pack.id}
                className={`relative bg-white rounded-3xl border flex flex-col justify-between p-6 transition-all ${
                  pack.highlight
                    ? "border-pen shadow-xl shadow-pen/10 ring-2 ring-pen/20 scale-[1.02] sm:scale-105 z-10"
                    : pack.oneTimeOnly
                    ? "border-emerald-300 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/30"
                    : "border-rule/80 shadow-sm hover:shadow-md hover:border-rule"
                }`}
              >
                {/* Header Badge */}
                {pack.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1 whitespace-nowrap ${
                        pack.oneTimeOnly
                          ? "bg-emerald-600 text-white"
                          : pack.highlight
                          ? "bg-pen text-white"
                          : "bg-ink text-white"
                      }`}
                    >
                      <Sparkles size={11} /> {pack.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <h3 className="font-bold text-lg text-ink">{pack.name}</h3>
                  </div>
                  <p className="text-xs text-graphite mt-1 min-h-[32px] leading-relaxed">
                    {pack.description}
                  </p>

                  {/* Papers count banner */}
                  <div className="my-5 p-3.5 rounded-2xl bg-paper-warm/50 border border-rule/70 text-center">
                    <div className="text-3xl font-extrabold text-ink tracking-tight">
                      {pack.papers}{" "}
                      <span className="text-base font-semibold text-graphite">Full Papers</span>
                    </div>
                    <div className="text-[11px] font-semibold text-pen mt-0.5">
                      Only ₹{perPaper} per paper
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
                      ₹{pack.amountInr}
                    </span>
                    {pack.originalPriceInr && (
                      <span className="text-sm font-semibold text-graphite/60 line-through">
                        ₹{pack.originalPriceInr}
                      </span>
                    )}
                    <span className="text-xs font-medium text-graphite">one-time</span>
                  </div>

                  {/* Features list */}
                  <ul className="space-y-2.5 text-xs text-ink/90 border-t border-rule/70 pt-4">
                    {pack.features.map((feat, fi) => (
                      <li key={fi} className="flex items-start gap-2">
                        <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Purchase Button */}
                <div className="mt-6 pt-2">
                  <button
                    disabled={busy !== null}
                    onClick={() => buyPack(pack)}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm min-h-[48px] transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60 shadow-xs ${
                      pack.oneTimeOnly
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                        : pack.highlight
                        ? "bg-pen hover:bg-pen/90 text-white shadow-pen/20"
                        : "bg-ink hover:bg-ink/90 text-white"
                    }`}
                  >
                    {busy === pack.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Zap size={16} />
                        Get {pack.papers} Papers for ₹{pack.amountInr}
                      </>
                    )}
                  </button>
                  <div className="text-[10px] text-center text-graphite mt-2">
                    UPI, Cards &amp; Netbanking supported
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* School Pool Callout */}
        <div className="mt-12 sm:mt-16 max-w-3xl mx-auto bg-white border border-rule/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-pen/10 text-pen rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
              <Building2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-ink">Running an entire school or coaching institute?</h3>
              <p className="text-xs sm:text-sm text-graphite mt-1 leading-relaxed">
                Empower all your teachers with a shared paper pool, custom school branding, and centralized exam coordinator approval.
              </p>
            </div>
          </div>
          <Link
            href="/school"
            className="shrink-0 w-full sm:w-auto text-center bg-paper-warm border border-rule hover:border-pen/50 text-ink px-5 py-3 rounded-xl font-semibold text-sm hover:bg-white transition-all min-h-[44px] flex items-center justify-center"
          >
            Explore School Pool &rarr;
          </Link>
        </div>

        {/* Security & FAQ strip */}
        <div className="mt-12 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-graphite">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>256-bit encrypted checkout via Razorpay • 100% Secure</span>
          </div>
          <p className="text-[11px] text-graphite/70 max-w-lg mx-auto">
            Questions? Reach our teacher support team directly via WhatsApp or email. Invoices available for school expense claims.
          </p>
        </div>
      </main>
    </div>
  );
}
