"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  X,
  ScanLine,
  Loader2,
  ImagePlus,
  Sparkles,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { scanImages, ScanAborted, type ScannedPaper } from "@/lib/scan";
import {
  compressBatch,
  formatBytes,
  PAYLOAD_BUDGET_BYTES,
  type CompressResult,
} from "@/lib/image-compress";
import { ApiError } from "@/lib/api-client";
import { useModalHistory } from "@/components/Modal";
import { inAndroidApp, OUT_OF_CREDITS } from "@/lib/twa";
import { CREDIT_COSTS } from "@/lib/credit-packs";
import CreditConfirmModal from "@/components/CreditConfirmModal";

const MAX_PAGES = 8;

// The route may run for its full maxDuration (120s). Past that nothing is
// coming back, and a spinner with no end is what makes a teacher kill the app.
const SCAN_TIMEOUT_MS = 150_000;

// Beyond this the wait has left the normal range and needs explaining.
const SLOW_AFTER_S = 45;

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export default function ScanModal({
  onClose,
  onScanned,
  paperId,
}: {
  onClose: () => void;
  // Called with the extracted paper; parent decides how to apply it.
  onScanned: (paper: ScannedPaper) => void;
  // The paper being built — passed to the scan so its ledger row refs it.
  paperId?: string;
}) {
  const [pages, setPages] = useState<
    { url: string; name: string; bytes: number; originalBytes: number }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [preparing, setPreparing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Kept apart from `error`: this state has its own gated rendering, and the
  // photos must survive it.
  const [outOfCredits, setOutOfCredits] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timedOutRef = useRef(false);

  // Android Back closes the sheet instead of leaving the paper.
  useModalHistory(true, onClose);

  // Scan is the headline feature, so its out-of-credits state is the payment
  // surface a Play reviewer is most likely to reach. Resolved after mount
  // because detection reads document.referrer.
  const [inApp, setInApp] = useState<boolean | null>(null);
  useEffect(() => setInApp(inAndroidApp()), []);

  // A wait with no clock on it reads as a hang, and on 4G this one is long.
  useEffect(() => {
    if (!busy) return;
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [busy]);

  // Leaving the sheet — Back, the X, the parent — must end the wait too.
  useEffect(() => () => abortRef.current?.abort(), []);

  const totalBytes = pages.reduce((n, p) => n + p.bytes, 0);
  const originalBytes = pages.reduce((n, p) => n + p.originalBytes, 0);
  const isAddingToExisting = Boolean(paperId);
  const scanCost = isAddingToExisting ? 0 : CREDIT_COSTS.scan;

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);
      const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const room = MAX_PAGES - pages.length;
      if (room <= 0) {
        setError(`You can scan up to ${MAX_PAGES} pages at once.`);
        return;
      }
      const batch = incoming.slice(0, room);
      if (batch.length === 0) return;

      // Shrink before upload. A raw phone photo is 3-8MB; three of them exceed
      // the request limit and the upload is rejected before it reaches us.
      // Only what the pages already here have left over is available to them.
      const spent = pages.reduce((n, p) => n + p.bytes, 0);
      setPreparing(`Preparing ${batch.length} photo${batch.length > 1 ? "s" : ""}…`);
      try {
        const { results } = await compressBatch(
          batch,
          (done, total) => setPreparing(`Preparing photo ${done} of ${total}…`),
          PAYLOAD_BUDGET_BYTES - spent
        );
        setPages((prev) => [
          ...prev,
          ...results.map((r: CompressResult, i: number) => ({
            url: r.dataUrl,
            name: batch[i].name,
            bytes: r.bytes,
            originalBytes: r.originalBytes,
          })),
        ]);
      } catch {
        setError("One of the images could not be read. Try a different photo.");
      } finally {
        setPreparing(null);
      }
    },
    [pages]
  );

  function removePage(i: number) {
    setPages((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Stop waiting but stay on the sheet: the usual reason to cancel is the wrong
  // photos, and she needs them still listed to fix that.
  function cancelScan() {
    abortRef.current?.abort();
  }

  function closeSheet() {
    abortRef.current?.abort();
    onClose();
  }

  async function runScan() {
    if (pages.length === 0) {
      setError("Add at least one photo of your paper.");
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    timedOutRef.current = false;
    setBusy(true);
    setElapsed(0);
    setError(null);
    setOutOfCredits(null);
    const timer = window.setTimeout(() => {
      timedOutRef.current = true;
      controller.abort();
    }, SCAN_TIMEOUT_MS);
    try {
      const paper = await scanImages(
        pages.map((p) => p.url),
        paperId,
        controller.signal
      );
      const count = paper.questions?.length ?? 0;
      if (count === 0) {
        setError("No questions found. Try a brighter, sharper photo.");
        setBusy(false);
        return;
      }
      onScanned(paper);
    } catch (err: unknown) {
      if (err instanceof ScanAborted) {
        // She asked to stop, so say nothing; a timeout has to explain itself.
        setError(
          timedOutRef.current
            ? "The scan did not come back in time. Your photos are still here — try again, or scan fewer pages at once."
            : null
        );
      } else if (err instanceof ApiError && err.status === 402) {
        // Stay put. The compressed pages live in this component, so navigating
        // to a top-up page threw away every photo she had just taken.
        setOutOfCredits(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Scan failed. Try again.");
      }
      setBusy(false);
    } finally {
      window.clearTimeout(timer);
      abortRef.current = null;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90dvh] overflow-hidden sm:mx-4 flex flex-col">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-rule">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-ink/10 rounded-lg flex items-center justify-center text-ink">
              <ScanLine size={18} />
            </div>
            <h2 className="text-lg font-semibold text-ink">
              Scan handwritten paper
            </h2>
          </div>
          <button
            onClick={closeSheet}
            className="p-2 hover:bg-rule rounded-xl transition-colors"
          >
            <X size={22} className="text-graphite" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto">
          <p className="text-sm text-graphite mb-4">
            Take clear photos of your handwritten question paper. We&apos;ll turn it
            into an editable paper — then you can tweak anything.
          </p>

          <div className="flex items-start gap-2 text-xs text-graphite bg-ink/5 border border-ink/10 rounded-lg px-3 py-2 mb-4">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-ink" />
            <span>
              Hindi or Marathi paper? We read Devanagari handwriting too — but
              please <b>check the text after scanning</b>, as a matra or letter
              can sometimes be misread.
            </span>
          </div>

          {/* Page thumbnails */}
          {pages.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {pages.map((p, i) => (
                <div
                  key={i}
                  className="relative group aspect-[3/4] rounded-lg overflow-hidden border border-rule bg-paper"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={`Page ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                    {i + 1}
                  </span>
                  {!busy && (
                    <button
                      onClick={() => removePage(i)}
                      className="absolute top-1 right-1 z-10 min-h-[40px] min-w-[40px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 bg-black/60 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add pages */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            // No `capture` attribute: it forces the camera and hides the
            // gallery on Android, but teachers often photographed the paper
            // earlier. The picker offers both when capture is absent.
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {preparing && (
            <p className="mb-3 text-sm text-graphite flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              {preparing}
            </p>
          )}

          {pages.length > 0 && !preparing && (
            <p className="mb-3 text-xs text-graphite">
              {pages.length} page{pages.length > 1 ? "s" : ""} ready ·{" "}
              {formatBytes(totalBytes)} to upload
              {originalBytes > totalBytes * 1.2 && (
                <> (shrunk from {formatBytes(originalBytes)})</>
              )}
            </p>
          )}

          {pages.length < MAX_PAGES && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy || !!preparing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-rule text-graphite rounded-xl hover:border-ink hover:text-ink transition-colors font-medium disabled:opacity-50"
            >
              <ImagePlus size={18} />
              {pages.length === 0 ? "Add photos / take picture" : "Add more pages"}
            </button>
          )}

          {/* The wait itself: how far along, how long so far, how long it should
              take. Reading happens on the server, so the only honest per-page
              number here is how many pages went up. */}
          {busy && (
            <div className="mt-4 rounded-xl border border-ink/10 bg-ink/5 px-3 py-3">
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                <Loader2 size={16} className="animate-spin shrink-0" />
                Reading {pages.length} page{pages.length > 1 ? "s" : ""}…
              </p>
              <p className="mt-1 text-xs text-graphite">
                {formatElapsed(elapsed)} so far · usually 20-40 seconds
              </p>
              {elapsed >= SLOW_AFTER_S && (
                <p className="mt-1 text-xs text-graphite">
                  Taking longer than usual — a slow connection or a very large
                  photo does that. You can cancel and try fewer pages.
                </p>
              )}
            </div>
          )}

          {outOfCredits && (
            <div className="mt-4 flex flex-col gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {/* Default-deny: the price and the way to buy are for a verdict
                    that has resolved to "browser", never for an unknown one. */}
                <span>{inApp === false ? outOfCredits : OUT_OF_CREDITS}</span>
              </div>
              {inApp === false && (
                <a
                  href="/topup"
                  className="self-start text-ink font-semibold hover:underline"
                >
                  Buy credits →
                </a>
              )}
              <span className="text-xs text-graphite">
                Your photos are still here.
              </span>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-rule flex items-center gap-3">
          <button
            onClick={busy ? cancelScan : onClose}
            className="px-4 py-2.5 text-sm font-medium text-graphite hover:bg-rule rounded-lg transition-colors"
          >
            {busy ? "Cancel scan" : "Cancel"}
          </button>
          <div className="flex-1 text-xs text-graphite">
            {pages.length > 0 && (
              <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 text-xs">
                {isAddingToExisting ? "Free (adding to paper)" : "1 Paper • Unlimited pages included"}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              if (pages.length === 0) return;
              setShowConfirm(true);
            }}
            disabled={busy || !!preparing || pages.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-ink hover:bg-ink rounded-lg transition-colors disabled:opacity-50 active:scale-95 shadow-xs"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Reading paper…
              </>
            ) : (
              <>
                <Sparkles size={16} />
                {pages.length > 0
                  ? isAddingToExisting
                    ? "Add to paper (Free)"
                    : "Scan paper (1 paper)"
                  : "Generate paper"}
              </>
            )}
          </button>
        </div>
      </div>

      <CreditConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={async () => {
          setShowConfirm(false);
          await runScan();
        }}
        title="Confirm Paper Scan"
        subtitle="Review before extracting your exam paper."
        cost={scanCost}
        costLabel={isAddingToExisting ? "Free (adding pages to current paper)" : "1 Paper (unlimited pages included)"}
        badge="Paper Scanner"
        details={[
          { label: "Pages Attached", value: `${pages.length} photo${pages.length > 1 ? "s" : ""}` },
          { label: "Scan Rate", value: "Unlimited pages per paper" },
          { label: "Upload Size", value: formatBytes(totalBytes) },
        ]}
        busy={busy}
      />
    </div>
  );
}
