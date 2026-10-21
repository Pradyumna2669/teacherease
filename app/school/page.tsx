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
  BookOpen,
  History,
  GraduationCap,
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

interface AllotmentItem {
  id: string;
  subject_id: string;
  user_id: string;
  teacher_email: string;
  subject_name: string;
  subject_code: string;
  created_at: string;
}

interface AuditLogItem {
  id: string;
  at: string;
  actor_email: string;
  actor_role: string;
  action: string;
  entity: string;
  summary: string;
  details?: any;
}

type SchoolTab = "pool" | "branding" | "allotments" | "templates" | "reviews" | "audit";

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

  // Allotments
  const [allotments, setAllotments] = useState<AllotmentItem[]>([]);
  const [subjectsList, setSubjectsList] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [loadingAllotments, setLoadingAllotments] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

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

  const loadAllotments = useCallback(async () => {
    setLoadingAllotments(true);
    try {
      const res = await fetch("/api/school/allotments");
      const data = await res.json();
      if (data.allotments) setAllotments(data.allotments);
      if (data.subjects) {
        setSubjectsList(data.subjects);
        if (data.subjects.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(data.subjects[0].id);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingAllotments(false);
    }
  }, [selectedSubjectId]);

  const loadAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch("/api/school/audit");
      const data = await res.json();
      if (data.logs) setAuditLogs(data.logs);
    } catch {
      /* ignore */
    } finally {
      setLoadingAudit(false);
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
    if (activeTab === "allotments") loadAllotments();
    if (activeTab === "audit") loadAuditLogs();
  }, [activeTab, loadTemplates, loadReviews, loadAllotments, loadAuditLogs]);

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
    if (!memberEmail.includes("@")) return;
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
      if (activeTab === "allotments") await loadAllotments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(userId: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/school/members?userId=${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove teacher.");
      setPendingRemove(null);
      await load();
      if (activeTab === "allotments") await loadAllotments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGrantAllotment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSubjectId || !selectedTeacherId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/school/allotments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: selectedSubjectId,
          user_id: selectedTeacherId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not allot subject.");
      setSuccess("Subject allotted successfully to faculty.");
      setTimeout(() => setSuccess(null), 4000);
      await loadAllotments();
    } catch (err: any) {
      setError(err.message || "Could not allot subject.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevokeAllotment(allotmentId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/school/allotments?id=${allotmentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not revoke allotment.");
      await loadAllotments();
    } catch (err: any) {
      setError(err.message || "Could not revoke allotment.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault();
    setSavingBranding(true);
    setError(null);
    setSuccess(null);
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
      if (!res.ok) throw new Error(data.error || "Could not save branding.");
      setSuccess("School branding updated successfully.");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save branding.");
    } finally {
      setSavingBranding(false);
    }
  }

  async function useTemplate(tpl: SchoolTemplate) {
    setUsingTemplateId(tpl.id);
    try {
      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${tpl.title} (From Template)`,
          subject: tpl.subject || "General",
          class_name: tpl.class_name || "10",
          settings: tpl.settings,
          questions: tpl.sections,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        router.push(`/builder?id=${data.id}`);
      } else {
        alert("Failed to spawn paper from template.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setUsingTemplateId(null);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Are you sure you want to delete this shared template?")) return;
    try {
      const res = await fetch(`/api/school/templates?id=${id}`, { method: "DELETE" });
      if (res.ok) loadTemplates();
    } catch {
      /* ignore */
    }
  }

  async function reviewVerdictAction(paperId: string, verdict: "approved" | "changes_requested") {
    let feedback = "";
    if (verdict === "changes_requested") {
      feedback = prompt("Provide feedback or reason for requesting changes:") || "";
      if (!feedback) return;
    }
    setReviewingId(paperId);
    try {
      const res = await fetch("/api/school/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId, status: verdict, feedback }),
      });
      if (res.ok) loadReviews();
    } catch {
      /* ignore */
    } finally {
      setReviewingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-paper text-ink">
        <Loader2 size={24} className="animate-spin text-graphite" />
      </div>
    );
  }

  const pendingReviewsCount = reviews.filter((r) => r.status === "in_review").length;

  return (
    <div className="min-h-dvh bg-paper text-ink pb-20">
      <header className="border-b border-rule bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
            Teacher<span className="ink-blank">Ease</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-graphite hover:text-ink transition-colors"
            >
              <ArrowLeft size={16} /> My Papers
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-xs font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} /> {success}
            </span>
            <button onClick={() => setSuccess(null)} className="text-xs font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* If no school context: onboarding form */}
        {!ctx?.school ? (
          <div className="max-w-xl mx-auto py-12 text-center">
            <Building2 size={48} className="mx-auto text-pen mb-4" />
            <h1 className="font-display text-3xl font-bold text-ink mb-2">
              Create an Institutional Pool
            </h1>
            <p className="text-sm text-graphite mb-8 leading-relaxed">
              Share one credit pool across all your teachers, publish official school templates,
              allot subjects to faculty, and inspect examination activity logs.
            </p>

            <div className="bg-white rounded-2xl border border-rule p-6 text-left shadow-sm">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
                Institution Name
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. A.B.C. College of Engineering & Management (Autonomous)"
                className="w-full border border-rule rounded-xl px-4 py-3 text-sm focus:border-pen outline-none mb-4"
              />
              <button
                onClick={createSchool}
                disabled={busy || newName.trim().length < 2}
                className="w-full bg-pen text-white py-3 rounded-xl font-semibold text-sm hover:bg-ink transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Establish Institutional Account
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* School Header Banner */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rule pb-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <Building2 size={24} className="text-pen shrink-0" />
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                    {ctx.school.name}
                  </h1>
                </div>
                <p className="text-xs text-graphite mt-1">
                  Team collaboration, course allotments, official blueprints &amp; examination audit trail
                </p>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex border-b border-rule mb-6 gap-6 text-sm font-medium overflow-x-auto">
              <button
                onClick={() => setActiveTab("pool")}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === "pool"
                    ? "border-pen text-pen font-semibold"
                    : "border-transparent text-graphite hover:text-ink"
                }`}
              >
                <Coins size={16} /> Pool &amp; Teachers
              </button>

              <button
                onClick={() => setActiveTab("allotments")}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === "allotments"
                    ? "border-pen text-pen font-semibold"
                    : "border-transparent text-graphite hover:text-ink"
                }`}
              >
                <BookOpen size={16} /> Subject Allotments
                {allotments.length > 0 && (
                  <span className="ml-1 text-[11px] bg-rule px-1.5 py-0.5 rounded-full text-graphite">
                    {allotments.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("templates")}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === "templates"
                    ? "border-pen text-pen font-semibold"
                    : "border-transparent text-graphite hover:text-ink"
                }`}
              >
                <BookmarkPlus size={16} /> Shared Blueprints
                {templates.length > 0 && (
                  <span className="ml-1 text-[11px] bg-rule px-1.5 py-0.5 rounded-full text-graphite">
                    {templates.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("branding")}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === "branding"
                    ? "border-pen text-pen font-semibold"
                    : "border-transparent text-graphite hover:text-ink"
                }`}
              >
                <Palette size={16} /> Institutional Identity
              </button>

              <button
                onClick={() => setActiveTab("reviews")}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
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

              <button
                onClick={() => setActiveTab("audit")}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === "audit"
                    ? "border-pen text-pen font-semibold"
                    : "border-transparent text-graphite hover:text-ink"
                }`}
              >
                <History size={16} /> Activity &amp; Audit Logs
              </button>
            </div>

            {/* TAB 1: POOL & TEACHERS */}
            {activeTab === "pool" && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Balance & Topup Card */}
                <div className="bg-white rounded-2xl border border-rule p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-ink text-base mb-1">Institutional Credit Pool</h3>
                    <p className="text-xs text-graphite mb-4">
                      All added faculty members generate papers directly against this pool.
                    </p>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="font-mono text-4xl font-bold text-ink">
                        {ctx.school.creditsBalance.toLocaleString()}
                      </span>
                      <span className="text-xs text-graphite">credits available</span>
                    </div>
                  </div>
                </div>

                {/* Teacher Roster */}
                <div className="bg-white rounded-2xl border border-rule p-6">
                  <h3 className="font-bold text-ink">Teachers &amp; Staff Pool</h3>
                  {ctx.isAdmin && (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder="faculty@college.edu"
                        className="flex-1 border border-rule rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pen/20 focus:border-pen outline-none"
                      />
                      <button
                        onClick={addMember}
                        disabled={busy || !memberEmail.includes("@")}
                        className="bg-ink text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-pen transition-colors disabled:opacity-60 flex items-center gap-2"
                      >
                        <UserPlus size={16} /> Add Faculty
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
                            className="p-2 text-graphite hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

            {/* TAB: SUBJECT ALLOTMENTS */}
            {activeTab === "allotments" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-rule p-6">
                  <h3 className="font-bold text-ink text-base mb-1">Course &amp; Subject Allotment</h3>
                  <p className="text-xs text-graphite mb-4 leading-relaxed">
                    Admin can allot the same course to multiple teachers or assign individual faculty to specific courses. Teachers only see and author question banks for their allotted courses.
                  </p>

                  {ctx.isAdmin && (
                    <form onSubmit={handleGrantAllotment} className="flex flex-col sm:flex-row gap-3 items-end pt-2 border-t border-rule">
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-semibold text-ink mb-1">Select Course / Subject</label>
                        <select
                          value={selectedSubjectId}
                          onChange={(e) => setSelectedSubjectId(e.target.value)}
                          className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:border-pen outline-none"
                        >
                          {subjectsList.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.code ? `${s.code} · ` : ""}{s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1 w-full">
                        <label className="block text-xs font-semibold text-ink mb-1">Select Faculty Member</label>
                        <select
                          value={selectedTeacherId}
                          onChange={(e) => setSelectedTeacherId(e.target.value)}
                          className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:border-pen outline-none"
                        >
                          <option value="">Choose teacher...</option>
                          {(ctx.members || []).map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.email} ({m.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={busy || !selectedSubjectId || !selectedTeacherId}
                        className="bg-pen text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-ink transition-colors disabled:opacity-50 shrink-0"
                      >
                        Allot Subject
                      </button>
                    </form>
                  )}
                </div>

                {/* Allotment Ledger */}
                <div className="bg-white rounded-2xl border border-rule overflow-hidden">
                  <div className="px-6 py-4 border-b border-rule bg-paper/40 flex items-center justify-between">
                    <h4 className="font-bold text-sm text-ink">Active Course Allotments</h4>
                    <span className="font-mono text-xs text-graphite">{allotments.length} total assignments</span>
                  </div>

                  {loadingAllotments ? (
                    <div className="flex justify-center py-10 text-graphite">
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  ) : allotments.length === 0 ? (
                    <div className="text-center py-12 text-graphite text-xs">
                      No course allotments configured yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-rule">
                      {allotments.map((alt) => (
                        <div key={alt.id} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-paper/30 transition-colors">
                          <div>
                            <p className="text-sm font-semibold text-ink">
                              {alt.subject_code ? <span className="font-mono text-xs font-bold text-pen mr-2">[{alt.subject_code}]</span> : null}
                              {alt.subject_name}
                            </p>
                            <p className="text-xs text-graphite mt-0.5">
                              Allotted to: <b className="text-ink">{alt.teacher_email}</b>
                            </p>
                          </div>

                          {ctx.isAdmin && (
                            <button
                              onClick={() => handleRevokeAllotment(alt.id)}
                              className="text-xs text-red-600 hover:text-red-800 hover:underline px-2 py-1"
                              title="Revoke allotment"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: TEMPLATES */}
            {activeTab === "templates" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-ink text-base">Institutional Blueprint Library</h3>
                    <p className="text-xs text-graphite">
                      Official autonomous exam blueprints, formats, and section distributions shared across all faculty.
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
                    <h4 className="font-semibold text-ink text-sm">No shared blueprints yet</h4>
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
                              {(t.settings?.totalMarks as number) || 60} Marks
                            </span>
                          </div>
                          {t.description && (
                            <p className="text-xs text-graphite mb-3">{t.description}</p>
                          )}
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
                            Synthesize From Blueprint
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: BRANDING */}
            {activeTab === "branding" && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-rule p-6">
                  <h3 className="font-bold text-ink text-base mb-1">Official Institutional Identity</h3>
                  <p className="text-xs text-graphite mb-4">
                    Exam papers created by your faculty automatically inherit this header branding.
                  </p>

                  <form onSubmit={handleSaveBranding} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        Institution Name
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
                        Affiliation / Autonomous Status
                      </label>
                      <input
                        value={brandAffiliation}
                        onChange={(e) => setBrandAffiliation(e.target.value)}
                        disabled={!ctx.isAdmin}
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
                        className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:border-pen outline-none disabled:bg-rule/30"
                      />
                    </div>

                    {ctx.isAdmin && (
                      <button
                        type="submit"
                        disabled={savingBranding}
                        className="bg-ink text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-pen transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {savingBranding ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Save Identity
                      </button>
                    )}
                  </form>
                </div>
              </div>
            )}

            {/* TAB: REVIEWS */}
            {activeTab === "reviews" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-rule p-6">
                  <h3 className="font-bold text-ink text-base mb-1">Exam Approval &amp; Review Workflow</h3>
                  <p className="text-xs text-graphite mb-4">
                    Review and approve synthesized question papers before printing.
                  </p>

                  {loadingReviews ? (
                    <div className="flex justify-center py-10">
                      <Loader2 size={24} className="animate-spin text-graphite" />
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-10 text-xs text-graphite">
                      No examination papers currently submitted for review.
                    </div>
                  ) : (
                    <div className="divide-y divide-rule">
                      {reviews.map((r) => (
                        <div key={r.id} className="py-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-ink">{r.title}</p>
                            <p className="text-xs text-graphite">Author: {r.author_email} · Status: {r.status}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link href={`/builder?id=${r.id}`} className="text-xs border border-rule px-3 py-1.5 rounded-lg hover:border-pen">
                              Inspect
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: AUDIT LOGS */}
            {activeTab === "audit" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-rule p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-ink text-base">Examination Activity &amp; Audit Trail</h3>
                      <p className="text-xs text-graphite">
                        Immutable institutional activity trail recording which teacher performed what action across courses, allotments, and generated papers.
                      </p>
                    </div>
                    <span className="font-mono text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                      Append-Only Log
                    </span>
                  </div>

                  {loadingAudit ? (
                    <div className="flex justify-center py-12 text-graphite">
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-12 text-xs text-graphite">
                      No activity logs recorded yet.
                    </div>
                  ) : (
                    <div className="mt-4 border border-rule rounded-xl overflow-hidden divide-y divide-rule">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-4 hover:bg-paper/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rule text-ink">
                                {log.action}
                              </span>
                              <span className="font-semibold text-ink">{log.summary}</span>
                            </div>
                            <p className="text-graphite">
                              Triggered by: <b className="text-ink">{log.actor_email || "System"}</b> ({log.actor_role || "admin"})
                            </p>
                          </div>
                          <div className="text-graphite font-mono text-[11px] shrink-0">
                            {new Date(log.at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
