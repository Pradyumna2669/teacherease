"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Coins,
  Loader2,
  FileText,
  ArrowLeft,
  Plus,
  Trash2,
  UserPlus,
  ShieldCheck,
  Palette,
  BookmarkPlus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Check,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConfirmModal } from "@/components/Modal";
import {
  SCHOOL_DISCOUNT_BPS,
  schoolCreditCostInr,
} from "@/lib/credit-packs";
import { inAndroidApp } from "@/lib/twa";
import type { SchoolTemplate, SchoolReviewItem } from "@/lib/types";

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

interface Member {
  user_id: string;
  email: string;
  role: string;
  spent: number;
}
interface SchoolCtx {
  school: {
    id: string;
    name: string;
    creditsBalance: number;
    discountBps: number;
    logoUrl?: string | null;
    address?: string | null;
    affiliation?: string | null;
    defaultHeader?: Record<string, unknown>;
  } | null;
  role?: string;
  isAdmin?: boolean;
  members?: Member[];
}

type SchoolTab = "pool" | "branding" | "templates" | "reviews";

export default function SchoolPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [ctx, setCtx] = useState<SchoolCtx | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [inApp, setInApp] = useState<boolean | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<SchoolTab>("pool");

  // create-school form
  const [newName, setNewName] = useState("");
  // add-member form
  const [memberEmail, setMemberEmail] = useState("");
  // buy-credits form
  const [buyCredits, setBuyCredits] = useState(2000);

  // School branding form
  const [brandName, setBrandName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandAddress, setBrandAddress] = useState("");
  const [brandAffiliation, setBrandAffiliation] = useState("");
  const [savingBranding, setSavingBranding] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<SchoolTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);

  // Reviews
  const [reviews, setReviews] = useState<SchoolReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/school", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login?next=/school");
        return;
      }
      const data: SchoolCtx = await res.json();
      setCtx(data);
      if (data?.school) {
        setBrandName(data.school.name || "");
        setBrandLogoUrl(data.school.logoUrl || "");
        setBrandAddress(data.school.address || "");
        setBrandAffiliation(data.school.affiliation || "");
      }
    } catch {
      setError("Could not load school.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/school/templates");
      const data = await res.json();
      if (data.templates) setTemplates(data.templates);
    } catch {
      /* ignore */
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const res = await fetch("/api/school/reviews");
      const data = await res.json();
      if (data.reviews) setReviews(data.reviews);
    } catch {
      /* ignore */
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    setInApp(inAndroidApp());
    load();
  }, [load]);

  useEffect(() => {
    if (activeTab === "templates") loadTemplates();
    if (activeTab === "reviews") loadReviews();
  }, [activeTab, loadTemplates, loadReviews]);

  async function createSchool() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create school.");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function addMember() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/school/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: memberEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add teacher.");
      setMemberEmail("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(userId: string) {
    setPendingRemove(null);
    setBusy(true);
    try {
      const res = await fetch("/api/school/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove.");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSavingBranding(true);
    try {
      const res = await fetch("/api/school/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: brandName,
          logoUrl: brandLogoUrl,
          address: brandAddress,
          affiliation: brandAffiliation,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update branding.");
      setSuccess("School branding updated successfully.");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update branding.");
    } finally {
      setSavingBranding(false);
    }
  }

  async function useTemplate(t: SchoolTemplate) {
    setUsingTemplateId(t.id);
    setError(null);
    try {
      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${t.title} — New Exam`,
          subject: t.subject || undefined,
          class_name: t.class_name || undefined,
          settings: t.settings,
          questions: t.sections,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) throw new Error(data.error || "Could not instantiate template.");
      router.push(`/builder?id=${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to use template.");
    } finally {
      setUsingTemplateId(null);
    }
  }

  async function deleteTemplate(id: string) {
    try {
      const res = await fetch(`/api/school/templates?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not delete template.");
      }
      setTemplates((p) => p.filter((x) => x.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete template.");
    }
  }

  async function reviewVerdictAction(paperId: string, verdict: "approved" | "changes_requested") {
    setReviewingId(paperId);
    try {
      const feedback = verdict === "changes_requested"
        ? window.prompt("Enter required changes or feedback note for the teacher:")
        : undefined;
      if (verdict === "changes_requested" && feedback === null) {
        setReviewingId(null);
        return;
      }
      const res = await fetch("/api/school/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId, verdict, feedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review update failed.");
      setReviews((p) =>
        p.map((r) =>
          r.id === paperId ? { ...r, status: verdict, review_feedback: feedback || null } : r
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update review.");
    } finally {
      setReviewingId(null);
    }
  }

  async function buyPool() {
    setError(null);
    if (inAndroidApp()) return;
    if (!ctx?.school) return;
    if (buyCredits < 1000) {
      setError("Minimum bulk purchase is 1000 credits.");
      return;
    }
    setBusy(true);
    try {
      const ok = await loadCheckout();
      if (!ok) throw new Error("Could not load the payment window.");
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: ctx.school.id, credits: buyCredits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout.");
      const rzp = new window.Razorpay!({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: "INR",
        name: "TeacherEase — School",
        description: data.description,
        prefill: { email },
        theme: { color: "#4f46e5" },
        handler: () => setTimeout(load, 1500),
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  const cost = schoolCreditCostInr(buyCredits);
  const pendingReviewsCount = reviews.filter((r) => r.status === "in_review").length;

  return (
    <div className="min-h-[100dvh] bg-paper">
      <header className="bg-white border-b border-rule">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-pen rounded-lg flex items-center justify-center">
              <FileText size={18} className="text-white" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight text-ink">
              Teacher<span className="ink-blank">Ease</span>
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-graphite hover:text-ink px-3 py-2 min-h-[44px] lg:min-h-0 hover:bg-rule rounded-lg transition-colors"
          >
            <ArrowLeft size={16} /> My Papers
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Building2 size={24} className="text-pen" />
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                {ctx?.school ? ctx.school.name : "School"}
              </h1>
              {ctx?.school && (
                <p className="text-xs text-graphite">Team collaboration, official branding & approvals</p>
              )}
            </div>
          </div>
          {ctx?.isAdmin && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-pen bg-pen/5 border border-pen/20 px-2.5 py-1 rounded-full">
              <ShieldCheck size={14} /> School Admin
            </span>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 mb-4">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20 text-graphite">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : !ctx?.school ? (
          // ---- No school: create one ----
          <div className="bg-white rounded-2xl border border-rule p-6 max-w-lg">
            <h2 className="font-bold text-ink">Create your school organization</h2>
            <p className="text-sm text-graphite mt-1">
              Share one credit pool across all your teachers, publish official school templates, and approve exams before printing.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Delhi Public School"
                className="flex-1 border border-rule rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pen/20 focus:border-pen outline-none"
              />
              <button
                onClick={createSchool}
                disabled={busy || newName.trim().length < 2}
                className="bg-pen text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-ink transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create School
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex border-b border-rule gap-6 text-sm font-medium">
              <button
                onClick={() => setActiveTab("pool")}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === "pool"
                    ? "border-pen text-pen font-semibold"
                    : "border-transparent text-graphite hover:text-ink"
                }`}
              >
                <Coins size={16} /> Pool & Teachers
              </button>
              <button
                onClick={() => setActiveTab("branding")}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === "branding"
                    ? "border-pen text-pen font-semibold"
                    : "border-transparent text-graphite hover:text-ink"
                }`}
              >
                <Palette size={16} /> School Branding
              </button>
              <button
                onClick={() => setActiveTab("templates")}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === "templates"
                    ? "border-pen text-pen font-semibold"
                    : "border-transparent text-graphite hover:text-ink"
                }`}
              >
                <BookmarkPlus size={16} /> Shared Templates
                {templates.length > 0 && (
                  <span className="ml-1 text-[11px] bg-rule px-1.5 py-0.5 rounded-full text-graphite">
                    {templates.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === "reviews"
                    ? "border-pen text-pen font-semibold"
                    : "border-transparent text-graphite hover:text-ink"
                }`}
              >
                <CheckCircle2 size={16} /> Exam Reviews
                {pendingReviewsCount > 0 && (
                  <span className="ml-1 text-[11px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {pendingReviewsCount}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: POOL & TEACHERS */}
            {activeTab === "pool" && (
              <div className="space-y-6">
                {/* Pool balance banner */}
                <div className="bg-white rounded-2xl border border-rule p-6 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-ink text-lg">{ctx.school.name}</h2>
                    </div>
                    <p className="text-sm text-graphite mt-0.5">Shared teacher credit pool</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-3xl font-bold text-ink">
                      <Coins size={24} className="text-pen" />
                      {ctx.school.creditsBalance}
                    </div>
                    <p className="text-xs text-graphite">credits remaining</p>
                  </div>
                </div>

                {ctx.isAdmin && inApp === false && (
                  <div className="bg-white rounded-2xl border border-rule p-6">
                    <h3 className="font-bold text-ink">Top up the pool</h3>
                    <p className="text-sm text-graphite mt-1">
                      {SCHOOL_DISCOUNT_BPS / 100}% school discount applied on bulk orders.
                    </p>
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <div>
                        <label className="block text-xs text-graphite mb-1">
                          Credits (min 1000)
                        </label>
                        <input
                          type="number"
                          min={1000}
                          step={500}
                          value={buyCredits}
                          onChange={(e) => setBuyCredits(Number(e.target.value))}
                          className="w-40 border border-rule rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pen/20 focus:border-pen outline-none"
                        />
                      </div>
                      <div className="text-sm text-graphite">
                        = <b className="text-ink">₹{cost}</b>
                      </div>
                      <button
                        onClick={buyPool}
                        disabled={busy || buyCredits < 1000}
                        className="bg-pen text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-ink transition-colors disabled:opacity-60 flex items-center gap-2"
                      >
                        {busy ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} />}
                        Buy credits
                      </button>
                    </div>
                  </div>
                )}

                {/* Teacher Roster */}
                <div className="bg-white rounded-2xl border border-rule p-6">
                  <h3 className="font-bold text-ink">Teachers & Staff</h3>
                  {ctx.isAdmin && (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder="teacher@school.edu"
                        className="flex-1 border border-rule rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pen/20 focus:border-pen outline-none"
                      />
                      <button
                        onClick={addMember}
                        disabled={busy || !memberEmail.includes("@")}
                        className="bg-ink text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-pen transition-colors disabled:opacity-60 flex items-center gap-2"
                      >
                        <UserPlus size={16} /> Add Teacher
                      </button>
                    </div>
                  )}

                  <div className="mt-4 divide-y divide-rule">
                    {(ctx.members ?? []).map((m) => (
                      <div
                        key={m.user_id}
                        className="flex items-center justify-between gap-2 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink break-all">
                            {m.email}
                            {m.role === "admin" && (
                              <span className="ml-2 text-xs text-pen font-semibold">
                                (admin)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-graphite">
                            {m.spent} credits used across papers
                          </p>
                        </div>
                        {m.role !== "admin" && ctx.isAdmin && (
                          <button
                            onClick={() => setPendingRemove(m.user_id)}
                            disabled={busy}
                            className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-2 text-graphite hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SCHOOL BRANDING */}
            {activeTab === "branding" && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-rule p-6">
                  <h3 className="font-bold text-ink text-base mb-1">Official School Identity</h3>
                  <p className="text-xs text-graphite mb-4">
                    Exam papers created by your teachers automatically inherit this header branding.
                  </p>

                  <form onSubmit={handleSaveBranding} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        School Name
                      </label>
                      <input
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        disabled={!ctx.isAdmin}
                        required
                        className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:border-pen outline-none disabled:bg-rule/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        Affiliation / Motto / Branch
                      </label>
                      <input
                        value={brandAffiliation}
                        onChange={(e) => setBrandAffiliation(e.target.value)}
                        disabled={!ctx.isAdmin}
                        placeholder="e.g. Affiliated to CBSE · School Code: 12345"
                        className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:border-pen outline-none disabled:bg-rule/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        Campus Address
                      </label>
                      <input
                        value={brandAddress}
                        onChange={(e) => setBrandAddress(e.target.value)}
                        disabled={!ctx.isAdmin}
                        placeholder="e.g. Sector 4, Bokaro Steel City, Jharkhand"
                        className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:border-pen outline-none disabled:bg-rule/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        School Crest / Logo URL
                      </label>
                      <input
                        value={brandLogoUrl}
                        onChange={(e) => setBrandLogoUrl(e.target.value)}
                        disabled={!ctx.isAdmin}
                        placeholder="https://example.com/logo.png"
                        className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:border-pen outline-none disabled:bg-rule/30"
                      />
                    </div>

                    {ctx.isAdmin ? (
                      <button
                        type="submit"
                        disabled={savingBranding || brandName.trim().length < 2}
                        className="inline-flex items-center gap-2 bg-pen text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-ink transition-colors disabled:opacity-50"
                      >
                        {savingBranding ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        Save Branding Settings
                      </button>
                    ) : (
                      <p className="text-xs text-graphite italic">
                        Only school administrators can edit official branding.
                      </p>
                    )}
                  </form>
                </div>

                {/* Live Preview Box */}
                <div className="bg-white rounded-2xl border border-rule p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-ink text-base mb-1">Exam Header Preview</h3>
                    <p className="text-xs text-graphite mb-4">
                      How papers printed by teachers will appear:
                    </p>

                    <div className="border-2 border-black p-4 rounded bg-paper/20">
                      <div className="flex items-center justify-center gap-3 text-center">
                        {brandLogoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={brandLogoUrl}
                            alt="Logo"
                            className="w-10 h-10 object-contain shrink-0"
                          />
                        )}
                        <div>
                          <div className="font-bold text-base tracking-wide text-ink">
                            {brandName || "School Name"}
                          </div>
                          {(brandAffiliation || brandAddress) && (
                            <div className="text-[11px] text-graphite font-medium">
                              {brandAffiliation || brandAddress}
                            </div>
                          )}
                          <div className="font-semibold text-xs mt-1 text-ink">
                            Term 1 Summative Assessment (2025–26)
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between text-xs mt-3 pt-2 border-t border-dashed border-rule text-graphite">
                        <span>Class: <b>Class 5</b></span>
                        <span>Subject: <b>Mathematics</b></span>
                        <span>Marks: <b>50</b></span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-pen/5 border border-pen/10 rounded-xl text-xs text-pen font-medium">
                    Tip: Any new paper generated by teachers in {ctx.school.name} will automatically apply this header.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SHARED TEMPLATES */}
            {activeTab === "templates" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-ink text-base">School Blueprint Library</h3>
                    <p className="text-xs text-graphite">
                      Official exam formats, blueprints, and section distributions shared across all teachers.
                    </p>
                  </div>
                </div>

                {loadingTemplates ? (
                  <div className="flex justify-center py-12 text-graphite">
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-rule p-6">
                    <BookmarkPlus size={36} className="mx-auto text-rule mb-2" />
                    <h4 className="font-semibold text-ink text-sm">No shared templates yet</h4>
                    <p className="text-xs text-graphite mt-1 max-w-sm mx-auto">
                      Teachers can save any exam paper as a school template straight from the paper builder with the &quot;Template&quot; button.
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {templates.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white rounded-2xl border border-rule p-5 flex flex-col justify-between hover:border-pen/30 transition-colors"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-bold text-ink text-sm">{t.title}</h4>
                            <span className="text-[11px] bg-pen/5 text-pen font-semibold px-2 py-0.5 rounded-full shrink-0">
                              {(t.settings?.totalMarks as number) || 40} Marks
                            </span>
                          </div>
                          {t.description && (
                            <p className="text-xs text-graphite mb-3">{t.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs text-graphite mb-4">
                            {t.subject && (
                              <span className="bg-rule px-2 py-0.5 rounded">
                                {t.subject}
                              </span>
                            )}
                            {t.class_name && (
                              <span className="bg-rule px-2 py-0.5 rounded">
                                {t.class_name}
                              </span>
                            )}
                            <span className="bg-rule px-2 py-0.5 rounded">
                              {t.sections?.length || 0} questions
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-rule flex items-center justify-between">
                          <button
                            onClick={() => useTemplate(t)}
                            disabled={usingTemplateId === t.id}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-pen text-white px-3 py-1.5 rounded-lg hover:bg-ink transition-colors disabled:opacity-50"
                          >
                            {usingTemplateId === t.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Plus size={12} />
                            )}
                            Use Template
                          </button>
                          {ctx.isAdmin && (
                            <button
                              onClick={() => deleteTemplate(t.id)}
                              className="text-graphite hover:text-red-600 p-1.5 rounded-lg"
                              title="Delete template"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: EXAM REVIEWS */}
            {activeTab === "reviews" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-ink text-base">Exam Moderation & Approvals</h3>
                    <p className="text-xs text-graphite">
                      Review question papers submitted by teachers before final printing and distribution.
                    </p>
                  </div>
                </div>

                {loadingReviews ? (
                  <div className="flex justify-center py-12 text-graphite">
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-rule p-6">
                    <CheckCircle2 size={36} className="mx-auto text-rule mb-2" />
                    <h4 className="font-semibold text-ink text-sm">No exam papers in review</h4>
                    <p className="text-xs text-graphite mt-1 max-w-sm mx-auto">
                      When teachers click &quot;Submit for Review&quot; in the paper builder, their exam papers will appear here for school approval.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-rule overflow-hidden">
                    <div className="divide-y divide-rule">
                      {reviews.map((r) => (
                        <div
                          key={r.id}
                          className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-rule/10 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-ink text-sm">{r.title}</h4>
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  r.status === "approved"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : r.status === "in_review"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {r.status === "approved" && <CheckCircle2 size={10} />}
                                {r.status === "in_review" && <Clock size={10} />}
                                {r.status === "changes_requested" && <AlertCircle size={10} />}
                                {r.status === "approved"
                                  ? "Approved"
                                  : r.status === "in_review"
                                  ? "Pending Review"
                                  : "Changes Requested"}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-graphite">
                              <span>By: <b>{r.author_email}</b></span>
                              <span>•</span>
                              <span>{r.subject || "General"}</span>
                              <span>•</span>
                              <span>{r.class_name || "All classes"}</span>
                              <span>•</span>
                              <span>{r.question_count} questions ({r.total_marks}M)</span>
                            </div>
                            {r.review_feedback && (
                              <p className="mt-2 text-xs text-rose-800 bg-rose-50 border border-rose-100 p-2 rounded-lg">
                                <b>Feedback:</b> {r.review_feedback}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Link
                              href={`/builder?id=${r.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold bg-white border border-rule px-3 py-1.5 rounded-lg text-ink hover:border-pen transition-colors"
                            >
                              <Eye size={12} /> Inspect
                            </Link>

                            {ctx.isAdmin && r.status === "in_review" && (
                              <>
                                <button
                                  onClick={() => reviewVerdictAction(r.id, "approved")}
                                  disabled={reviewingId === r.id}
                                  className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {reviewingId === r.id ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={12} />
                                  )}
                                  Approve
                                </button>
                                <button
                                  onClick={() => reviewVerdictAction(r.id, "changes_requested")}
                                  disabled={reviewingId === r.id}
                                  className="inline-flex items-center gap-1 text-xs font-semibold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <AlertCircle size={12} /> Request Changes
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {pendingRemove && (
        <ConfirmModal
          title="Remove this teacher?"
          body="They lose access to the shared credit pool. Papers they already made stay in their own account."
          confirmLabel="Remove teacher"
          onCancel={() => setPendingRemove(null)}
          onConfirm={() => removeMember(pendingRemove)}
        />
      )}
    </div>
  );
}
