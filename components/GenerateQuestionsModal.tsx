"use client";

import { useRef, useState, useEffect } from "react";
import { Sparkles, Loader2, X, ImagePlus, Trash2, Coins, FileUp } from "lucide-react";
import { CREDIT_COSTS } from "@/lib/credit-packs";
import {
  PAPER_LANGUAGES,
  PAPER_LANGUAGE_LABELS,
  QUESTION_TYPE_LABELS,
  type PaperLanguage,
  type Question,
  type QuestionType,
} from "@/lib/types";
import { compressBatch, PAYLOAD_BUDGET_BYTES } from "@/lib/image-compress";
import {
  MAX_SOURCE_PDF_PAGES,
  previewPdfPages,
  renderSelectedPdfPages,
  type PdfPagePreview,
} from "@/lib/pdf-pages";
import { postJson, ApiError } from "@/lib/api-client";
import { useModalHistory } from "@/components/Modal";
import { inAndroidApp, OUT_OF_CREDITS } from "@/lib/twa";

// Ask AI for a unit's worth of questions. Photos of the textbook pages are
// optional but make the output far more on-syllabus, so they're charged extra.
// Must stay a subset of SCANNABLE_TYPES in lib/scan.ts — that enum is what the
// provider schema allows and what the normaliser will accept back.
const PICKABLE_TYPES: QuestionType[] = [
  "fill-blanks",
  "mcq",
  "true-false",
  "match",
  "short-answer",
  "long-answer",
  "word-problem",
  "math-vertical",
  "comprehension",
  "composition",
  "table",
];

const MAX_IMAGES = 6;

export interface GenerateContext {
  unitId: string;
  unitName: string;
  bookName: string | null;
  subject: string;
  className: string | null;
}

interface Props {
  ctx: GenerateContext;
  onClose: () => void;
  /** Called with the generated questions; the page files them into the bank. */
  onGenerated: (questions: Question[], cost: number) => void | Promise<void>;
}

export default function GenerateQuestionsModal({ ctx, onClose, onGenerated }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [marks, setMarks] = useState(20);
  const [language, setLanguage] = useState<PaperLanguage>("english");
  const [types, setTypes] = useState<Set<QuestionType>>(new Set());
  const [notes, setNotes] = useState("");
  // Bytes ride along with each photo: the budget is shared across every add,
  // and a second batch that assumed the whole budget is how six photos 413.
  const [images, setImages] = useState<{ url: string; bytes: number }[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviews, setPdfPreviews] = useState<PdfPagePreview[]>([]);
  const [selectedPdfPages, setSelectedPdfPages] = useState<number[]>([]);
  const [preparing, setPreparing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Android Back closes the sheet instead of leaving the page behind it.
  useModalHistory(true, onClose);

  // Resolved after mount because detection reads document.referrer.
  const [inApp, setInApp] = useState<boolean | null>(null);
  useEffect(() => setInApp(inAndroidApp()), []);

  const sourcePageCount = pdfFile ? selectedPdfPages.length : images.length;
  const cost =
    CREDIT_COSTS.aiQuestions + CREDIT_COSTS.aiQuestionsPage * sourcePageCount;

  function toggleType(t: QuestionType) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_IMAGES - images.length;
    if (room <= 0) return;
    const selected = Array.from(files);
    const pdf = selected.find((file) => file.type === "application/pdf");
    const picked = selected
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room);
    if (pdf && picked.length > 0) {
      setError("Add textbook photos or one PDF at a time, not both.");
      return;
    }
    if (pdf && pdf.size > 20 * 1024 * 1024) {
      setError("That PDF is larger than 20MB. Choose a smaller chapter or export fewer pages.");
      return;
    }
    if (!pdf && picked.length === 0) return;

    // Six raw textbook photos read straight to base64 are ~30MB against a 4.5MB
    // body limit: the platform rejects the request in plain text before the
    // route runs, and a teacher already charged per photo reads that as money
    // lost. Shrink here, spending only what earlier photos left of the budget.
    const spent = images.reduce((n, im) => n + im.bytes, 0);
    setPreparing(pdf ? "Reading up to 3 PDF pages locally…" : `Preparing ${picked.length} photo${picked.length > 1 ? "s" : ""}…`);
    try {
      if (pdf) {
        const inspected = await previewPdfPages(pdf);
        setPdfFile(pdf);
        setImages([]);
        setPdfPreviews(inspected.previews);
        setSelectedPdfPages(inspected.previews.slice(0, Math.min(MAX_SOURCE_PDF_PAGES, room)).map((page) => page.pageNumber));
        if (inspected.totalPages > MAX_SOURCE_PDF_PAGES) {
          setError(`Choose up to ${MAX_SOURCE_PDF_PAGES} relevant pages below. Cover and contents pages will not be sent unless selected.`);
        }
        return;
      }
      const { results } = await compressBatch(
        picked,
        (done, total) => setPreparing(`Preparing photo ${done} of ${total}…`),
        PAYLOAD_BUDGET_BYTES - spent
      );
      setImages((prev) => [
        ...prev,
        ...results.map((r) => ({ url: r.dataUrl, bytes: r.bytes })),
      ]);
    } catch {
      setError("One of the photos could not be read. Try a different photo.");
    } finally {
      setPreparing(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      let selectedImages = images.map((im) => im.url);
      if (pdfFile) {
        if (selectedPdfPages.length === 0) {
          setError("Select at least one relevant textbook page.");
          setBusy(false);
          return;
        }
        setPreparing("Preparing selected textbook pages…");
        const rendered = await renderSelectedPdfPages(pdfFile, selectedPdfPages);
        selectedImages = rendered.results.map((page) => page.dataUrl);
      }
      const data = await postJson<{ questions: Question[]; cost?: number }>(
        "/api/questions/generate",
        {
          unitId: ctx.unitId,
          unitName: ctx.unitName,
          bookName: ctx.bookName,
          subject: ctx.subject,
          className: ctx.className,
          marks,
          language,
          types: Array.from(types),
          notes,
          images: selectedImages,
        }
      );
      await onGenerated(data.questions, data.cost ?? cost);
    } catch (err: unknown) {
      // The route's 402 names a price and says "top up". Default-deny: that
      // sentence ships only to a verdict that has resolved to "browser".
      if (err instanceof ApiError && err.status === 402) {
        setError(inApp === false ? err.message : OUT_OF_CREDITS);
      } else {
        setError(err instanceof Error ? err.message : "Generation failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full px-3 py-2 text-sm border border-rule rounded-lg focus:ring-2 focus:ring-pen/20 focus:border-pen outline-none";

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-paper w-full sm:max-w-2xl sm:rounded-2xl max-h-[92dvh] overflow-y-auto">
        <div className="sticky top-0 bg-paper border-b border-rule px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-pen" />
            <div>
              <h2 className="font-display text-lg font-semibold text-ink leading-tight">
                Generate questions
              </h2>
              <p className="text-xs text-graphite">
                {ctx.subject}
                {ctx.className ? ` · Class ${ctx.className}` : ""} · {ctx.unitName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-2 text-graphite hover:text-ink rounded-lg disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-graphite">
                Marks to cover
              </span>
              <input
                type="number"
                min={1}
                max={200}
                value={marks}
                onChange={(e) => setMarks(Math.max(1, Number(e.target.value) || 1))}
                className={`${field} mt-1`}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-graphite">Language</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as PaperLanguage)}
                className={`${field} mt-1`}
              >
                {PAPER_LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {PAPER_LANGUAGE_LABELS[l]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <span className="text-xs font-medium text-graphite">
              Question types{" "}
              <span className="font-normal">(leave empty for a mix)</span>
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {PICKABLE_TYPES.map((t) => {
                const on = types.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={`text-sm lg:text-xs px-3.5 lg:px-2.5 py-2.5 lg:py-1.5 rounded-full border transition-colors ${
                      on
                        ? "bg-pen text-white border-pen"
                        : "bg-white text-graphite border-rule hover:border-pen/40"
                    }`}
                  >
                    {QUESTION_TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-graphite">
                Textbook pages{" "}
                <span className="font-normal">
                  (optional — photos or a PDF chapter; only selected pages reach AI)
                </span>
              </span>
              <span className="text-xs text-graphite">
                {sourcePageCount}/{MAX_IMAGES}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((im, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={im.url}
                    alt={`Textbook page ${i + 1}`}
                    className="w-20 h-24 object-cover rounded-lg border border-rule"
                  />
                  <button
                    onClick={() => setImages((p) => p.filter((_, x) => x !== i))}
                    className="absolute -top-2 -right-2 z-10 min-h-[36px] min-w-[36px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center bg-white border border-rule shadow rounded-full p-1 text-graphite hover:text-red-600"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && !pdfFile && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy || !!preparing}
                  className="w-20 h-24 border border-dashed border-rule rounded-lg flex flex-col items-center justify-center text-graphite hover:border-pen hover:text-pen transition-colors disabled:opacity-50"
                >
                  <FileUp size={18} />
                  <span className="text-[10px] mt-1">Add pages</span>
                </button>
              )}
            </div>
            {preparing && (
              <p className="mt-2 flex items-center gap-2 text-xs text-graphite">
                <Loader2 size={12} className="animate-spin shrink-0" />
                {preparing}
              </p>
            )}
            {pdfPreviews.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-graphite">
                  Select up to {MAX_SOURCE_PDF_PAGES} relevant pages. Selected: {selectedPdfPages.length}/{MAX_SOURCE_PDF_PAGES}
                </p>
                <div className="mt-2 grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                  {pdfPreviews.map((page) => {
                    const selected = selectedPdfPages.includes(page.pageNumber);
                    return (
                      <button
                        key={page.pageNumber}
                        type="button"
                        onClick={() => setSelectedPdfPages((current) => {
                          if (selected) return current.filter((number) => number !== page.pageNumber);
                          if (current.length >= MAX_SOURCE_PDF_PAGES) return current;
                          return [...current, page.pageNumber];
                        })}
                        className={`relative rounded border-2 overflow-hidden ${selected ? "border-pen ring-2 ring-pen/20" : "border-rule opacity-70 hover:opacity-100"}`}
                        aria-label={`Page ${page.pageNumber}${selected ? ", selected" : ""}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={page.dataUrl} alt={`PDF page ${page.pageNumber}`} className="w-full aspect-[3/4] object-cover" />
                        <span className={`absolute bottom-0 inset-x-0 text-[10px] font-semibold text-center ${selected ? "bg-pen text-white" : "bg-ink/70 text-white"}`}>
                          {page.pageNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          <label className="block">
            <span className="text-xs font-medium text-graphite">
              Notes for the AI (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. focus on word problems with two-digit numbers; avoid decimals"
              className={`${field} mt-1 resize-y`}
            />
          </label>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-rule px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-sm text-graphite">
            <Coins size={15} className="text-pen" />
            <b className="text-ink">{cost}</b> credits
            {images.length > 0 && (
              <span className="text-xs">
                ({CREDIT_COSTS.aiQuestions} + {images.length} ×{" "}
                {CREDIT_COSTS.aiQuestionsPage})
              </span>
            )}
          </span>
          <button
            onClick={run}
            disabled={busy || !!preparing}
            className="inline-flex items-center gap-2 bg-pen text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-ink transition-colors disabled:opacity-60"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {busy ? "Writing questions…" : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
