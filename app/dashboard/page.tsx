"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  Camera,
  PencilLine,
  Copy,
  Trash2,
  LogOut,
  Loader2,
  FolderOpen,
  Pencil,
  Coins,
  Bookmark,
  Library,
  Settings,
  MoreVertical,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Layers,
  RotateCcw,
  X,
  Building2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CreditBadge } from "@/components/CreditBadge";
import { ConfirmModal } from "@/components/Modal";
import { JoinCommunityButton, CommunityPrompt } from "@/components/JoinCommunity";
import { CREDIT_COSTS, getPapersRemaining } from "@/lib/credit-packs";
import { buyStarterPack } from "@/lib/checkout";
import { inAndroidApp, OUT_OF_CREDITS } from "@/lib/twa";
import {
  listPapers,
  deletePaper,
  getPaper,
  type PaperSummary,
} from "@/lib/papers";
import { saveQuestionsToBank } from "@/lib/question-bank";
import { DEFAULT_SETTINGS } from "@/lib/types";
import GeneratePaperModal, { type GeneratedPaper } from "@/components/GeneratePaperModal";
import ScanModal from "@/components/ScanModal";
import { scannedToQuestions, mergeScannedSettings, type ScannedPaper } from "@/lib/scan";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [paperFilter, setPaperFilter] = useState<"all" | "ready" | "drafts">("all");
  const [cleaningDrafts, setCleaningDrafts] = useState(false);
  const [initialGeneratorValues, setInitialGeneratorValues] = useState<{
    subject?: string;
    className?: string;
    marks?: number;
  }>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  // Confirmations render as in-app dialogs; window.confirm can't be styled and
  const [pending, setPending] = useState<
    | { kind: "duplicate"; id: string }
    | { kind: "delete"; id: string; title: string }
    | { kind: "set_b"; id: string; title: string; subject?: string | null; className?: string | null }
    | null
  >(null);
  const [setBVariant, setSetBVariant] = useState("Set B");
  const [setBNotes, setSetBNotes] = useState("");
  const [setBAnswerKey, setSetBAnswerKey] = useState(true);
  const [generatingSetB, setGeneratingSetB] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);
  // null until resolved on the client — the buy control waits for a definite
  // "no" so it can never flash inside the Android app.
  const [inApp, setInApp] = useState<boolean | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [buyingStarter, setBuyingStarter] = useState(false);
  // On a 360px phone the six header controls need more room than sits beside
  // the wordmark, so the secondary ones collapse into this menu below sm.
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("teacherease_upgrade_banner_closed") === "true") {
        setShowUpgradeBanner(false);
      }
    } catch {}
  }, []);

  const closeUpgradeBanner = () => {
    setShowUpgradeBanner(false);
    try {
      localStorage.setItem("teacherease_upgrade_banner_closed", "true");
    } catch {}
  };

  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/credits/balance", { cache: "no-store" });
      const data = await res.json();
      setBalance(typeof data.balance === "number" ? data.balance : null);
    } catch {
      setBalance(null);
    }
  }, []);

  async function handleBuyStarter() {
    if (inApp) {
      router.push("/topup");
      return;
    }
    setBuyingStarter(true);
    setError(null);
    try {
      await buyStarterPack({
        email,
        onSuccess: () => {
          setNotice("Payment received! 5 papers added to your account.");
          setBuyingStarter(false);
          loadBalance();
        },
        onDismiss: () => setBuyingStarter(false),
        onError: (err) => {
          setError(err.message);
          setBuyingStarter(false);
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setBuyingStarter(false);
    }
  }

  // A Razorpay webhook that never lands means she paid and got nothing. The
  // daily cron sweeps for those, but a teacher who has just paid should not
  // have to wait for tomorrow — this replays her own payments on demand.
  async function handleCheckPayment() {
    setCheckingPayment(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/razorpay/reconcile", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not check payments.");
      setNotice(
        data.replayed > 0
          ? `Found it — ${data.credits} credits added to your balance.`
          : "No missing payments in the last two days."
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not check payments.");
    } finally {
      setCheckingPayment(false);
    }
  }

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const rows = await listPapers();
      setPapers(rows);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to load papers.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
    setInApp(inAndroidApp());
    refresh();
    loadBalance();
    const onFocus = () => loadBalance();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh, loadBalance]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const shouldGenerate = searchParams.get("generate");
    if (shouldGenerate === "1" || shouldGenerate === "true") {
      setShowGenerate(true);
      const sub = searchParams.get("subject") || undefined;
      const cls = searchParams.get("class") || undefined;
      const m = searchParams.get("marks");
      setInitialGeneratorValues({
        subject: sub,
        className: cls,
        marks: m ? Number(m) : undefined,
      });
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("generate");
        url.searchParams.delete("subject");
        url.searchParams.delete("class");
        url.searchParams.delete("marks");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      } catch {
        // Safe fail-through in restricted environments
      }
    }
  }, [searchParams]);

  async function handleNew() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Paper",
          subject: DEFAULT_SETTINGS.subject,
          class_name: DEFAULT_SETTINGS.className,
          settings: DEFAULT_SETTINGS,
          questions: [],
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        // Out of credits. Inside the app there is nowhere to send them — Play
        // forbids pointing at our own checkout, so say it and stop.
        if (inAndroidApp()) {
          setError(OUT_OF_CREDITS);
          setCreating(false);
          return;
        }
        setError(data.error || "Not enough credits.");
        router.push("/topup");
        return;
      }
      if (!res.ok || !data.id) {
        throw new Error(data.error || "Could not create paper.");
      }
      router.push(`/builder?id=${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create paper.");
      setCreating(false);
    }
  }

  async function handleGeneratedPaper(paper: GeneratedPaper) {
    setError(null);
    try {
      const subject = paper.settings?.subject || "";
      const className = paper.settings?.className || "";
      const settings = {
        ...DEFAULT_SETTINGS,
        subject,
        className,
        totalMarks: paper.settings?.totalMarks || 60,
        assessmentTitle: paper.settings?.assessmentTitle || "Mid-Term Examination",
        language: paper.settings?.language || DEFAULT_SETTINGS.language,
        answerKey: paper.settings?.answerKey === true,
        timeAllowed: paper.settings?.timeAllowed || "2.5 hours",
      };
      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: settings.assessmentTitle,
          subject,
          class_name: className,
          settings,
          questions: paper.questions,
          method: paper.method || "ai_generated",
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setError(data.error || "Not enough credits to save this paper.");
        return;
      }
      if (!res.ok || !data.id) throw new Error(data.error || "Could not save generated paper.");
      setShowGenerate(false);
      router.push(`/builder?id=${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save generated paper.");
    }
  }

  async function handleScannedPaper(scannedPaper: ScannedPaper) {
    setCreating(true);
    setError(null);
    try {
      const questions = scannedToQuestions(scannedPaper.questions);
      const scannedSub = scannedPaper.settings?.subject || "";
      const scannedClass = scannedPaper.settings?.className || "";
      const scannedExam = scannedPaper.settings?.assessmentTitle || "";

      let paperTitle = "Scanned Paper";
      if (scannedSub && scannedExam) {
        paperTitle = `${scannedSub} • ${scannedExam}`;
      } else if (scannedSub) {
        paperTitle = `${scannedSub} Paper`;
      } else if (scannedExam) {
        paperTitle = scannedExam;
      }

      const settings = mergeScannedSettings(DEFAULT_SETTINGS, scannedPaper.settings || {}, true);
      if (scannedSub) settings.subject = scannedSub;
      if (scannedClass) settings.className = scannedClass;
      if (scannedExam) settings.assessmentTitle = scannedExam;

      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: paperTitle,
          subject: scannedSub || null,
          class_name: scannedClass || null,
          settings,
          questions,
          method: "scanned",
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        if (inAndroidApp()) {
          setError(OUT_OF_CREDITS);
          setCreating(false);
          return;
        }
        router.push("/topup");
        return;
      }
      if (!res.ok || !data.id) throw new Error(data.error || "Could not save scanned paper.");
      setShowScanModal(false);
      router.push(`/builder?id=${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not process scanned paper.");
      setCreating(false);
    }
  }

  const readyPapers = papers.filter((p) => (p.question_count ?? 1) > 0);
  const emptyDrafts = papers.filter((p) => p.question_count === 0);

  const displayedPapers =
    paperFilter === "ready"
      ? readyPapers
      : paperFilter === "drafts"
      ? emptyDrafts
      : papers;

  async function handleCleanupDrafts() {
    if (emptyDrafts.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${emptyDrafts.length} empty draft paper(s)?`)) return;
    setCleaningDrafts(true);
    setError(null);
    try {
      for (const d of emptyDrafts) {
        await deletePaper(d.id);
      }
      setPapers((prev) => prev.filter((p) => (p.question_count ?? 1) > 0));
      setNotice(`Cleaned up ${emptyDrafts.length} empty draft(s).`);
      setPaperFilter("all");
    } catch {
      setError("Failed to clean up some empty drafts.");
    } finally {
      setCleaningDrafts(false);
    }
  }

  async function handleDuplicate(id: string) {
    // Duplicating creates a new paper, so it costs the same as a new one. Route
    // through the gated /api/papers endpoint (not a client insert) so it's
    // actually charged, and tell the teacher up front.
    setPending(null);
    setBusyId(id);
    setError(null);
    try {
      const original = await getPaper(id);
      if (!original) throw new Error("Paper not found.");
      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${original.title} (copy)`,
          subject: original.subject,
          class_name: original.class_name,
          settings: original.settings,
          questions: original.questions,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        if (inAndroidApp()) {
          setError(OUT_OF_CREDITS);
          return;
        }
        setError(data.error || "Not enough credits.");
        router.push("/topup");
        return;
      }
      if (!res.ok || !data.id) {
        throw new Error(data.error || "Could not duplicate.");
      }
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not duplicate.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleGenerateSetB(sourcePaperId: string) {
    setGeneratingSetB(true);
    setError(null);
    try {
      const res = await fetch("/api/papers/set-b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePaperId,
          variant: setBVariant || "Set B",
          notes: setBNotes.trim() || undefined,
          includeAnswerKey: setBAnswerKey,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        if (inAndroidApp()) {
          setError(OUT_OF_CREDITS);
          return;
        }
        setError(data.error || "Not enough credits to generate parallel exam.");
        router.push("/topup");
        return;
      }
      if (!res.ok || !data.id) {
        throw new Error(data.error || "Could not generate parallel exam.");
      }
      setPending(null);
      router.push(`/builder?id=${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not generate parallel exam.");
    } finally {
      setGeneratingSetB(false);
    }
  }

  function handleCreateSimilar(paper: PaperSummary) {
    setInitialGeneratorValues({
      subject: paper.subject || undefined,
      className: paper.class_name || undefined,
    });
    setShowGenerate(true);
  }

  // Save every question in a paper to the teacher's reusable bank. Saving is
  // free (no AI, no new paper) — only creating papers costs credits.
  async function handleSaveToBank(id: string) {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      const paper = await getPaper(id);
      if (!paper) throw new Error("Paper not found.");
      const rows = (paper.questions ?? []).map((q) => ({
        title: q.title || q.type,
        type: q.type,
        subject: paper.subject,
        class_name: paper.class_name,
        marks: q.marks,
        source: "paper" as const,
        payload: q,
      }));
      if (!rows.length) {
        setNotice("This paper has no questions to save yet.");
        return;
      }
      const n = await saveQuestionsToBank(rows);
      setNotice(`Saved ${n} question${n > 1 ? "s" : ""} to your bank.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save to bank.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setPending(null);
    setBusyId(id);
    try {
      await deletePaper(id);
      setPapers((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const menuRow =
    "flex items-center gap-1.5 w-full min-h-[44px] px-3 py-2 text-sm rounded-lg transition-colors";

  return (
    <div className="min-h-[100dvh] bg-paper">
      {/* Announcement Banner for Existing & New Users */}
      {showUpgradeBanner && (
        <div className="bg-gradient-to-r from-pen via-indigo-600 to-purple-600 text-white px-4 py-2 text-xs sm:text-sm font-medium shadow-xs">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0">
                Update
              </span>
              <p className="truncate sm:whitespace-normal">
                🎉 <b>Account Upgraded:</b> Unlimited page scanning per paper! No more per-page charges.
              </p>
            </div>
            <button
              onClick={closeUpgradeBanner}
              className="p-1 hover:bg-white/20 rounded-md transition-colors shrink-0"
              aria-label="Dismiss banner"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-rule sticky top-0 z-30">
        {/* min-h, not h: a control that wraps has to push the header taller
            rather than spill through the border. */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-16 py-2 gap-2 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 bg-pen rounded-lg flex items-center justify-center">
              <FileText size={18} className="text-white" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight text-ink">Teacher<span className="ink-blank">Ease</span></span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end min-w-0">
            <CreditBadge />
            <Link
              href="/bank"
              className="flex items-center gap-1.5 text-sm font-medium text-graphite hover:text-ink px-3 py-2 hover:bg-rule rounded-lg transition-colors"
            >
              <Library size={16} />
              <span className="hidden sm:inline">Question Bank</span>
            </Link>
            <Link
              href="/school"
              className="flex items-center gap-1.5 text-sm font-medium text-graphite hover:text-ink px-3 py-2 hover:bg-rule rounded-lg transition-colors"
            >
              <Building2 size={16} />
              <span className="hidden sm:inline">School</span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 sm:gap-3">
              <JoinCommunityButton />
              {inApp === false && (
                <Link
                  href="/topup"
                  className="flex items-center gap-1.5 text-sm font-medium text-pen hover:text-ink px-3 py-2 hover:bg-pen/5 rounded-lg transition-colors"
                >
                  <Coins size={16} />
                  <span>Paper packs</span>
                </Link>
              )}
              <Link
                href="/account"
                title="Account settings"
                className="flex items-center gap-1.5 text-sm text-graphite hover:text-ink px-3 py-2 hover:bg-rule rounded-lg transition-colors"
              >
                <Settings size={16} />
                <span>{email || "Account"}</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm text-graphite hover:text-ink px-3 py-2 hover:bg-rule rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </div>
            <div className="relative sm:hidden">
              <button
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="More"
                aria-expanded={menuOpen}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] text-graphite hover:text-ink hover:bg-rule rounded-lg transition-colors"
              >
                <MoreVertical size={18} />
              </button>
              {menuOpen && (
                <>
                  <button
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 p-1 bg-white border border-rule rounded-xl shadow-lg z-50">
                    {/* The shared button hides its own label below sm, where in
                        here the label is the entire point of the row. */}
                    <JoinCommunityButton className="w-full justify-start min-h-[44px] [&>span:last-child]:inline" />
                    {inApp === false && (
                      <Link
                        href="/topup"
                        onClick={() => setMenuOpen(false)}
                        className={`${menuRow} font-medium text-pen hover:bg-pen/5`}
                      >
                        <Coins size={16} className="shrink-0" />
                        <span>Paper packs</span>
                      </Link>
                    )}
                    <Link
                      href="/account"
                      onClick={() => setMenuOpen(false)}
                      className={`${menuRow} text-graphite hover:text-ink hover:bg-rule`}
                    >
                      <Settings size={16} className="shrink-0" />
                      <span className="min-w-0 truncate">{email || "Account"}</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className={`${menuRow} text-graphite hover:text-ink hover:bg-rule`}
                    >
                      <LogOut size={16} className="shrink-0" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">My Papers</h1>
            <p className="text-sm text-graphite mt-0.5">
              Your saved papers — open to keep editing, duplicate, or delete.
            </p>
            {(() => {
              const papersLeft = getPapersRemaining(balance);
              if (papersLeft === null) return null;
              if (papersLeft > 0) {
                return (
                  <p className="text-sm text-graphite mt-1.5">
                    🎉 You have <strong className="text-ink">{papersLeft} free paper generation{papersLeft !== 1 ? "s" : ""}</strong>. Editing is always free.
                  </p>
                );
              }
              return (
                <div className="mt-3 bg-gradient-to-r from-pen/5 to-pen/10 border border-pen/20 rounded-xl p-4">
                  <p className="text-sm font-semibold text-ink">
                    You{"'"}ve created 3 papers for free 🎉
                  </p>
                  <p className="text-sm text-graphite mt-1">
                    Continue creating papers — <strong className="text-ink">₹59 → 10 more papers</strong>
                  </p>
                  {inApp !== true && (
                    <button
                      onClick={handleBuyStarter}
                      disabled={buyingStarter}
                      className="mt-3 inline-flex items-center gap-2 bg-pen text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-ink transition-colors disabled:opacity-60"
                    >
                      {buyingStarter ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} />}
                      Buy ₹59
                    </button>
                  )}
                </div>
              );
            })()}
            {/* Support, not a purchase path — safe to show inside the app. */}
            <button
              onClick={handleCheckPayment}
              disabled={checkingPayment}
              className="text-xs text-graphite underline underline-offset-2 mt-1 disabled:opacity-60"
            >
              {checkingPayment
                ? "Checking your payments…"
                : "Paid but papers missing?"}
            </button>
          </div>
          <button
            onClick={handleNew}
            disabled={creating}
            title="Start a new paper"
            className="flex items-center gap-2 bg-pen text-white px-4 py-2.5 rounded-lg font-medium hover:bg-ink transition-colors disabled:opacity-60"
          >
            {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            New Paper
          </button>
        </div>

        <section className="mb-8" aria-labelledby="make-paper-heading">
          <div className="mb-3">
            <h2 id="make-paper-heading" className="font-display text-xl font-semibold text-ink">
              What are you making today?
            </h2>
            <p className="text-sm text-graphite mt-0.5">
              Start with the material you already have. Every path opens the same editable paper.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <button
              onClick={() => setShowGenerate(true)}
              className="group text-left bg-ink text-white rounded-xl p-4 hover:bg-pen transition-colors"
            >
              <div className="flex items-center justify-between">
                <Sparkles size={20} className="text-white/80" />
                <span className="text-[11px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                  1 Paper
                </span>
              </div>
              <p className="mt-3 font-semibold">Generate a paper</p>
              <p className="mt-1 text-sm text-white/70">Give us your class, subject, topics and marks.</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white">
                Start with AI <span aria-hidden="true">→</span>
              </span>
            </button>
            <button
              onClick={() => setShowScanModal(true)}
              className="group text-left bg-white border border-rule rounded-xl p-4 hover:border-pen hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <Camera size={20} className="text-pen" />
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  1 Paper · Unlimited pages
                </span>
              </div>
              <p className="mt-3 font-semibold text-ink">Scan a paper</p>
              <p className="mt-1 text-sm text-graphite">Turn a handwritten or printed paper into an editable one.</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-pen">
                Open scanner <span aria-hidden="true">→</span>
              </span>
            </button>
            <button
              onClick={handleNew}
              disabled={creating}
              className="group text-left bg-white border border-rule rounded-xl p-4 hover:border-ink hover:shadow-sm transition-all disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <PencilLine size={20} className="text-ink" />
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Free
                </span>
              </div>
              <p className="mt-3 font-semibold text-ink">Build manually</p>
              <p className="mt-1 text-sm text-graphite">Start with the full editor and add questions yourself.</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ink">
                {creating ? "Opening editor…" : "Open editor"} <span aria-hidden="true">→</span>
              </span>
            </button>
          </div>
        </section>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {notice && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-3">
            <span>{notice}</span>
            <Link href="/bank" className="font-semibold hover:underline shrink-0">
              View bank →
            </Link>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-graphite">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : papers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-rule p-6 sm:p-8 shadow-sm">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pen/10 text-pen font-mono text-xs tracking-wider uppercase">
                <Sparkles size={13} />
                Get started
              </div>
              <h3 className="mt-3 font-display text-2xl sm:text-3xl font-semibold text-ink">
                Make your first question paper in 2 minutes
              </h3>
              <p className="mt-2 text-sm text-graphite leading-relaxed">
                TeacherEase formats layout, sections, and print geometry automatically.
                Pick the path that matches what you already have:
              </p>

              <div className="mt-6 grid sm:grid-cols-3 gap-3">
                <div className="border border-rule rounded-xl p-4 bg-paper/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-pen">1. Have syllabus?</span>
                      <span className="text-[10px] font-semibold bg-white/60 text-ink border border-rule px-1.5 py-0.5 rounded-full">1 Paper</span>
                    </div>
                    <p className="mt-1 font-semibold text-sm text-ink">Generate with AI</p>
                    <p className="mt-1 text-xs text-graphite">Provide class, subject and topics. AI writes balanced questions.</p>
                  </div>
                  <button
                    onClick={() => setShowGenerate(true)}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 bg-pen text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-ink transition-colors"
                  >
                    <Sparkles size={14} /> Start with AI
                  </button>
                </div>

                <div className="border border-rule rounded-xl p-4 bg-paper/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-pen">2. Have notes?</span>
                      <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">1 Paper</span>
                    </div>
                    <p className="mt-1 font-semibold text-sm text-ink">Scan handwritten</p>
                    <p className="mt-1 text-xs text-graphite">Photograph your handwriting and convert to an editable paper.</p>
                  </div>
                  <button
                    onClick={() => setShowScanModal(true)}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 bg-white border border-rule text-ink px-3 py-2 rounded-lg text-xs font-semibold hover:border-pen hover:text-pen transition-colors"
                  >
                    <Camera size={14} /> Scan page
                  </button>
                </div>

                <div className="border border-rule rounded-xl p-4 bg-paper/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-pen">3. Start blank?</span>
                      <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">Free</span>
                    </div>
                    <p className="mt-1 font-semibold text-sm text-ink">Build manually</p>
                    <p className="mt-1 text-xs text-graphite">Full visual editor with 15+ question types and drag-and-drop.</p>
                  </div>
                  <button
                    onClick={handleNew}
                    disabled={creating}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 bg-white border border-rule text-ink px-3 py-2 rounded-lg text-xs font-semibold hover:border-ink transition-colors disabled:opacity-60"
                  >
                    <Plus size={14} /> Blank paper
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-rule/60 flex flex-wrap items-center justify-between gap-3 text-xs text-graphite">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-green-600" />
                  3 free papers included · Prints to clean A4 PDF
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {papers.length > 0 && (
              <div className="mb-6 bg-white border border-rule/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-pen/10 text-pen flex items-center justify-center shrink-0">
                    <RotateCcw size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-graphite uppercase tracking-wider block">
                      Repeat Workflow · Latest Paper
                    </span>
                    <h4 className="text-sm font-semibold text-ink truncate">
                      {papers[0].title || "Untitled Paper"}
                      {papers[0].subject ? ` · ${papers[0].subject}` : ""}
                      {papers[0].class_name ? ` (Class ${papers[0].class_name})` : ""}
                    </h4>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setSetBVariant("Set B");
                      setSetBNotes("");
                      setPending({
                        kind: "set_b",
                        id: papers[0].id,
                        title: papers[0].title,
                        subject: papers[0].subject,
                        className: papers[0].class_name,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold hover:bg-pen transition-colors"
                  >
                    <Sparkles size={13} />
                    Create Set B
                  </button>
                  <button
                    onClick={() => handleCreateSimilar(papers[0])}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-paper border border-rule text-ink rounded-lg text-xs font-semibold hover:border-pen transition-colors"
                  >
                    <Layers size={13} />
                    Similar Paper
                  </button>
                </div>
              </div>
            )}

            {/* Filter Tabs & Clean-up banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-1.5 bg-white border border-rule p-1.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs">
                <button
                  onClick={() => setPaperFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    paperFilter === "all" ? "bg-ink text-white" : "text-graphite hover:text-ink hover:bg-rule/40"
                  }`}
                >
                  All Papers ({papers.length})
                </button>
                <button
                  onClick={() => setPaperFilter("ready")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    paperFilter === "ready" ? "bg-emerald-700 text-white" : "text-graphite hover:text-ink hover:bg-rule/40"
                  }`}
                >
                  Ready Papers ({readyPapers.length})
                </button>
                {emptyDrafts.length > 0 && (
                  <button
                    onClick={() => setPaperFilter("drafts")}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      paperFilter === "drafts" ? "bg-amber-600 text-white" : "text-amber-700 hover:bg-amber-50"
                    }`}
                  >
                    Empty Drafts ({emptyDrafts.length})
                  </button>
                )}
              </div>

              {emptyDrafts.length > 0 && (
                <button
                  onClick={handleCleanupDrafts}
                  disabled={cleaningDrafts}
                  className="text-xs sm:text-sm text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3.5 py-2 rounded-xl font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Remove all unfinished papers with 0 questions"
                >
                  {cleaningDrafts ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Clean up {emptyDrafts.length} empty draft{emptyDrafts.length > 1 ? "s" : ""}
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedPapers.map((p) => {
                const isBlank = p.question_count === 0;
                return (
                <div
                  key={p.id}
                  className={`group bg-white rounded-xl border p-5 hover:shadow-md transition-all flex flex-col ${
                    isBlank ? "border-amber-200 bg-amber-50/20" : "border-rule hover:border-pen/20"
                  }`}
                >
                  <Link href={`/builder?id=${p.id}`} className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-ink line-clamp-2 text-base">{p.title || "Untitled Paper"}</h3>
                      {p.question_count !== undefined && (
                        p.question_count > 0 ? (
                          <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {p.question_count} Qs
                          </span>
                        ) : (
                          <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            0 Questions
                          </span>
                        )
                      )}
                    </div>
                    {isBlank && (
                      <p className="mt-1.5 text-xs text-amber-800 font-medium">
                        ⚠️ Empty draft — no questions added yet
                      </p>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {p.subject && (
                        <span className="text-xs bg-pen/5 text-ink px-2 py-0.5 rounded-full font-medium">
                          {p.subject}
                        </span>
                      )}
                      {p.class_name && (
                        <span className="text-xs bg-rule text-graphite px-2 py-0.5 rounded-full">
                          Class {p.class_name}
                        </span>
                      )}
                      {p.status && p.status !== "draft" && (
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            p.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : p.status === "in_review"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {p.status === "approved" && <CheckCircle2 size={10} />}
                          {p.status === "in_review" && <Clock size={10} />}
                          {p.status === "changes_requested" && <AlertCircle size={10} />}
                          {p.status === "approved"
                            ? "Approved"
                            : p.status === "in_review"
                            ? "In Review"
                            : "Changes Requested"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-graphite mt-3">
                      Edited {new Date(p.updated_at).toLocaleDateString()}{" "}
                      {new Date(p.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </Link>
                  <div className="mt-4 pt-3 border-t border-rule flex items-center gap-1">
                    <Link
                      href={`/builder?id=${p.id}`}
                      className="flex items-center gap-1.5 text-sm text-pen font-medium px-2 py-1.5 rounded-lg hover:bg-pen/5 transition-colors"
                    >
                      <Pencil size={14} /> Edit
                    </Link>
                    <button
                      onClick={() => {
                        setSetBVariant("Set B");
                        setSetBNotes("");
                        setPending({
                          kind: "set_b",
                          id: p.id,
                          title: p.title,
                          subject: p.subject,
                          className: p.class_name,
                        });
                      }}
                      disabled={busyId === p.id}
                      title="Create parallel exam (Set B)"
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 text-pen bg-pen/5 hover:bg-pen/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Sparkles size={13} /> Set B
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleCreateSimilar(p)}
                      title="Create similar paper (prefill settings)"
                      className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-2 text-graphite hover:text-ink hover:bg-rule rounded-lg transition-colors"
                    >
                      <Layers size={16} />
                    </button>
                    <button
                      onClick={() => handleSaveToBank(p.id)}
                      disabled={busyId === p.id}
                      title="Save questions to your bank (free)"
                      className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-2 text-graphite hover:text-pen hover:bg-pen/5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Bookmark size={16} />
                    </button>
                    <button
                      onClick={() => setPending({ kind: "duplicate", id: p.id })}
                      disabled={busyId === p.id}
                      title="Duplicate paper (Free)"
                      className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-2 text-graphite hover:text-graphite hover:bg-rule rounded-lg transition-colors disabled:opacity-50"
                    >
                      {busyId === p.id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={() => setPending({ kind: "delete", id: p.id, title: p.title })}
                      disabled={busyId === p.id}
                      title="Delete"
                      className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-2 text-graphite hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </main>

      <CommunityPrompt />

      {showGenerate && (
        <GeneratePaperModal
          initialSubject={initialGeneratorValues.subject}
          initialClassName={initialGeneratorValues.className}
          initialMarks={initialGeneratorValues.marks}
          availablePapers={papers}
          onClose={() => setShowGenerate(false)}
          onGenerated={handleGeneratedPaper}
        />
      )}

      {showScanModal && (
        <ScanModal
          onClose={() => setShowScanModal(false)}
          onScanned={handleScannedPaper}
        />
      )}

      {pending?.kind === "set_b" && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4">
          <div className="bg-paper w-full max-w-md rounded-2xl p-5 border border-rule shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-rule">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-pen" />
                <h3 className="font-display text-base font-semibold text-ink">
                  Create Parallel Exam ({setBVariant})
                </h3>
              </div>
              <button
                onClick={() => setPending(null)}
                disabled={generatingSetB}
                className="text-graphite hover:text-ink p-1 disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm">
              <p className="text-xs text-graphite leading-relaxed">
                Generates a parallel test based on{" "}
                <strong className="text-ink">{pending.title}</strong>. It maintains the exact same
                sections, question types, and mark distribution, but generates completely new questions
                to prevent cheating across rows.
              </p>

              <div>
                <label className="block text-xs font-medium text-graphite mb-1">Set Label</label>
                <input
                  type="text"
                  value={setBVariant}
                  onChange={(e) => setSetBVariant(e.target.value)}
                  placeholder="Set B"
                  className="w-full px-3 py-2 text-sm border border-rule rounded-lg focus:ring-2 focus:ring-ink focus:border-ink outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-graphite mb-1">
                  Optional Steering Notes
                </label>
                <input
                  type="text"
                  value={setBNotes}
                  onChange={(e) => setSetBNotes(e.target.value)}
                  placeholder="e.g. Slightly higher difficulty, emphasize chapters 2 & 4"
                  className="w-full px-3 py-2 text-sm border border-rule rounded-lg focus:ring-2 focus:ring-ink focus:border-ink outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-graphite cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={setBAnswerKey}
                  onChange={(e) => setSetBAnswerKey(e.target.checked)}
                  className="h-4 w-4 accent-ink"
                />
                Include complete answer key & marking scheme
              </label>

              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs space-y-1 mt-2">
                <div className="flex items-center justify-between font-semibold text-ink">
                  <span>Charge for parallel paper:</span>
                  <span className="text-emerald-700 font-bold">1 Paper</span>
                </div>
                <p className="text-graphite text-[11px] leading-relaxed">
                  Generates an entirely new parallel set to prevent cheating. Once created, downloading and editing is 100% free.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-rule flex items-center justify-end gap-2">
              <button
                onClick={() => setPending(null)}
                disabled={generatingSetB}
                className="px-3 py-2 text-xs font-semibold text-graphite hover:text-ink rounded-lg disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGenerateSetB(pending.id)}
                disabled={generatingSetB}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-pen text-white rounded-lg hover:bg-ink transition-colors disabled:opacity-60"
              >
                {generatingSetB ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating parallel exam…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate {setBVariant} (1 paper)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {pending?.kind === "duplicate" && (
        <ConfirmModal
          title="Make a copy?"
          body="This creates an editable copy of the paper. Duplicating is free."
          confirmLabel="Duplicate"
          onCancel={() => setPending(null)}
          onConfirm={() => handleDuplicate(pending.id)}
        />
      )}

      {pending?.kind === "delete" && (
        <ConfirmModal
          title={`Delete "${pending.title}"?`}
          body="This paper is removed permanently. It cannot be undone."
          confirmLabel="Delete paper"
          onCancel={() => setPending(null)}
          onConfirm={() => handleDelete(pending.id)}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-paper flex items-center justify-center">
          <Loader2 className="animate-spin text-pen" size={28} />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
