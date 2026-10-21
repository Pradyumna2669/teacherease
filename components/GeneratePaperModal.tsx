"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, Sparkles, X } from "lucide-react";
import {
  PAPER_LANGUAGES,
  PAPER_LANGUAGE_LABELS,
  type PaperLanguage,
  type Question,
} from "@/lib/types";
import { postJson, ApiError } from "@/lib/api-client";
import { useModalHistory } from "@/components/Modal";
import { CREDIT_COSTS } from "@/lib/credit-packs";
import { inAndroidApp, OUT_OF_CREDITS } from "@/lib/twa";
import {
  MAX_SOURCE_PDF_PAGES,
  previewPdfPages,
  renderSelectedPdfPages,
  parsePageInput,
  type PdfPagePreview,
} from "@/lib/pdf-pages";
import CreditConfirmModal from "@/components/CreditConfirmModal";

export interface GeneratedPaper {
  questions: Question[];
  cost?: number;
  method?: "ai_generated" | "ai_textbook";
  settings?: {
    subject?: string;
    className?: string;
    totalMarks?: number;
    assessmentTitle?: string;
    language?: PaperLanguage;
    timeAllowed?: string;
    answerKey?: boolean;
    instructions?: string[];
  };
}

export default function GeneratePaperModal({
  onClose,
  onGenerated,
  initialSubject = "",
  initialClassName = "",
  initialMarks = 60,
  initialUnits = "",
  initialNotes = "",
  initialLanguage = "english",
  modalTitle = "Generate whole paper",
  modalSubtitle = "Creates a complete editable paper in one run",
  availablePapers,
}: {
  onClose: () => void;
  onGenerated: (paper: GeneratedPaper) => Promise<void> | void;
  initialSubject?: string;
  initialClassName?: string;
  initialMarks?: number;
  initialUnits?: string;
  initialNotes?: string;
  initialLanguage?: PaperLanguage;
  modalTitle?: string;
  modalSubtitle?: string;
  availablePapers?: { id: string; title: string; subject: string | null; class_name: string | null }[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState(initialSubject);
  const [className, setClassName] = useState(initialClassName);
  const [units, setUnits] = useState(initialUnits);
  const [marks, setMarks] = useState(initialMarks > 0 ? initialMarks : 60);
  const [timeAllowed, setTimeAllowed] = useState(
    initialMarks <= 25 ? "45 mins" : initialMarks <= 50 ? "1.5 hours" : "2.5 hours"
  );
  const [difficulty, setDifficulty] = useState("Medium");
  const [language, setLanguage] = useState<PaperLanguage>(initialLanguage);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [pdfPreviews, setPdfPreviews] = useState<PdfPagePreview[]>([]);
  const [selectedPdfPages, setSelectedPdfPages] = useState<number[]>([]);
  const [sourcePages, setSourcePages] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [answerKey, setAnswerKey] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useModalHistory(true, onClose);

  const [totalPdfPages, setTotalPdfPages] = useState(0);
  const [pdfStartPage, setPdfStartPage] = useState(1);
  const [directPageInput, setDirectPageInput] = useState("");

  const attachedImagesCount = sourceFile ? selectedPdfPages.length : sourcePages.length;
  const generationCost = CREDIT_COSTS.aiQuestions;

  function handlePreSubmit() {
    if (!subject.trim() || !className.trim() || !units.trim()) {
      setError("Add the subject, class, and at least one unit or topic.");
      return;
    }
    if (sourceFile && selectedPdfPages.length === 0) {
      setError("Select at least one relevant textbook page.");
      return;
    }
    setError(null);
    setShowConfirm(true);
  }

  async function addSourcePdf(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > 20 * 1024 * 1024) {
      setError("That PDF is larger than 20MB. Upload a shorter chapter instead.");
      return;
    }
    setPreparing(true);
    try {
      const inspected = await previewPdfPages(file, 1, 30);
      setSourceFile(file);
      setSourcePages([]);
      setTotalPdfPages(inspected.totalPages);
      setPdfStartPage(1);
      setPdfPreviews(inspected.previews);
      const initialSelected = inspected.previews.slice(0, MAX_SOURCE_PDF_PAGES).map((page) => page.pageNumber);
      setSelectedPdfPages(initialSelected);
      setDirectPageInput(initialSelected.join(", "));
      if (inspected.totalPages > MAX_SOURCE_PDF_PAGES) {
        setError(`Choose up to ${MAX_SOURCE_PDF_PAGES} relevant pages below or type specific page numbers. Cover and contents pages will not be sent unless you select them.`);
      }
    } catch {
      setError("That PDF could not be read. Try exporting the chapter again.");
    } finally {
      setPreparing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleBrowsePdfRange(newStart: number) {
    if (!sourceFile) return;
    const clamped = Math.max(1, Math.min(newStart, totalPdfPages));
    setPreparing(true);
    try {
      const inspected = await previewPdfPages(sourceFile, clamped, 30);
      setPdfStartPage(clamped);
      setPdfPreviews(inspected.previews);
    } catch {
      setError("Could not load preview for those pages.");
    } finally {
      setPreparing(false);
    }
  }

  function handleDirectPageChange(val: string) {
    setDirectPageInput(val);
    const parsed = parsePageInput(val, MAX_SOURCE_PDF_PAGES, totalPdfPages || 9999);
    setSelectedPdfPages(parsed);
  }

  async function run() {
    if (!subject.trim() || !className.trim() || !units.trim()) {
      setError("Add the subject, class, and at least one unit or topic.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let selectedImages = sourcePages;
      if (sourceFile) {
        if (selectedPdfPages.length === 0) {
          setError("Select at least one relevant textbook page.");
          setBusy(false);
          return;
        }
        setPreparing(true);
        const rendered = await renderSelectedPdfPages(sourceFile, selectedPdfPages);
        selectedImages = rendered.results.map((page) => page.dataUrl);
        setSourcePages(selectedImages);
        setPreparing(false);
      }
      const data = await postJson<GeneratedPaper>("/api/questions/generate", {
        mode: "paper",
        subject: subject.trim(),
        className: className.trim(),
        unitName: units.trim(),
        marks,
        timeAllowed: timeAllowed.trim(),
        language,
        answerKey,
        images: selectedImages,
        notes: [
          `Difficulty: ${difficulty}.`,
          notes.trim(),
        ].filter(Boolean).join("\n\n"),
      });
      const generatedMethod = selectedImages && selectedImages.length > 0 ? "ai_textbook" : "ai_generated";
      await onGenerated({ ...data, method: generatedMethod });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 402) {
        setError(inAndroidApp() ? OUT_OF_CREDITS : err.message);
      } else {
        setError(err instanceof Error ? err.message : "Generation failed.");
      }
    } finally {
      setPreparing(false);
      setBusy(false);
    }
  }

  const field =
    "w-full px-3 py-2.5 text-sm border border-rule rounded-lg focus:ring-2 focus:ring-pen/20 focus:border-pen outline-none";
  const selectedSourceCount = sourceFile ? selectedPdfPages.length : sourcePages.length;

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-paper w-full sm:max-w-2xl sm:rounded-2xl max-h-[94dvh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-paper border-b border-rule px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-pen" />
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">{modalTitle}</h2>
              <p className="text-xs text-graphite">{modalSubtitle}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={busy} className="p-2 text-graphite hover:text-ink disabled:opacity-40" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

          {availablePapers && availablePapers.length > 0 && (
            <div className="bg-rule/30 border border-rule/60 rounded-lg p-3">
              <span className="text-xs font-semibold text-ink block mb-1">
                Reuse syllabus from an existing paper:
              </span>
              <select
                defaultValue=""
                onChange={(e) => {
                  const p = availablePapers.find((item) => item.id === e.target.value);
                  if (p) {
                    if (p.subject) setSubject(p.subject);
                    if (p.class_name) setClassName(p.class_name);
                  }
                }}
                className={`${field} bg-white`}
              >
                <option value="" disabled>
                  Select a past paper to prefill class & subject…
                </option>
                {availablePapers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.subject ? `(${p.subject}${p.class_name ? ` · Cl ${p.class_name}` : ""})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-graphite">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Science" className={`${field} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-graphite">Class</span>
              <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="8" className={`${field} mt-1`} />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-graphite">Chapters or topics to cover</span>
            <textarea value={units} onChange={(e) => setUnits(e.target.value)} rows={3} placeholder="Chapter 3: Materials Around Us\nChapter 4: Heat and Temperature\nChapter 5: Motion and Measurement" className={`${field} mt-1 resize-y`} />
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-graphite">Marks</span>
              <input type="number" min={1} max={200} value={marks} onChange={(e) => setMarks(Math.max(1, Number(e.target.value) || 1))} className={`${field} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-graphite">Time</span>
              <input value={timeAllowed} onChange={(e) => setTimeAllowed(e.target.value)} placeholder="2.5 hours" className={`${field} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-graphite">Difficulty</span>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={`${field} mt-1`}>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-graphite">Language</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value as PaperLanguage)} className={`${field} mt-1`}>
                {PAPER_LANGUAGES.map((item) => <option key={item} value={item}>{PAPER_LANGUAGE_LABELS[item]}</option>)}
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-rule bg-white px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-graphite">Use a textbook chapter</p>
                <p className="text-xs text-graphite mt-0.5">
                  Optional. Preview pages locally, then choose up to {MAX_SOURCE_PDF_PAGES} relevant pages to send to AI.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy || preparing}
                className="shrink-0 inline-flex items-center gap-1.5 border border-rule rounded-lg px-3 py-2 text-sm font-medium text-ink hover:border-pen hover:text-pen disabled:opacity-50"
              >
                <FileUp size={15} />
                {preparing ? "Reading…" : "Add PDF"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                hidden
                onChange={(event) => addSourcePdf(event.target.files?.[0])}
              />
            </div>
            {sourcePages.length > 0 && (
              <p className="mt-2 text-xs text-pen">
                {sourcePages.length} page{sourcePages.length === 1 ? "" : "s"} ready. The PDF itself will not be uploaded.
              </p>
            )}
            {pdfPreviews.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-graphite">
                    Select up to {MAX_SOURCE_PDF_PAGES} relevant pages. Selected:{" "}
                    <strong className="text-ink font-semibold">{selectedPdfPages.join(", ") || "None"}</strong> ({selectedPdfPages.length}/{MAX_SOURCE_PDF_PAGES})
                  </p>
                  {totalPdfPages > 30 && (
                    <div className="flex items-center gap-1.5 text-xs text-graphite">
                      <span>
                        Pages {pdfStartPage}–{Math.min(totalPdfPages, pdfStartPage + 29)} of {totalPdfPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleBrowsePdfRange(pdfStartPage - 30)}
                        disabled={pdfStartPage <= 1 || preparing}
                        className="px-2 py-1 border border-rule rounded hover:bg-rule/40 disabled:opacity-40"
                      >
                        ← Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBrowsePdfRange(pdfStartPage + 30)}
                        disabled={pdfStartPage + 30 > totalPdfPages || preparing}
                        className="px-2 py-1 border border-rule rounded hover:bg-rule/40 disabled:opacity-40"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <label htmlFor="directPageInput" className="text-xs text-graphite shrink-0 font-medium">
                    Type page numbers:
                  </label>
                  <input
                    id="directPageInput"
                    type="text"
                    value={directPageInput}
                    onChange={(e) => handleDirectPageChange(e.target.value)}
                    placeholder="e.g. 74, 75, 76 or 74-76"
                    className="flex-1 px-2.5 py-1 text-xs border border-rule rounded-lg focus:ring-1 focus:ring-pen focus:border-pen outline-none"
                  />
                  {totalPdfPages > 0 && (
                    <span className="text-[11px] text-graphite/70 shrink-0">
                      (Total {totalPdfPages} pages)
                    </span>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                  {pdfPreviews.map((page) => {
                    const selected = selectedPdfPages.includes(page.pageNumber);
                    return (
                      <button
                        key={page.pageNumber}
                        type="button"
                        onClick={() => {
                          let updated: number[];
                          if (selected) {
                            updated = selectedPdfPages.filter((n) => n !== page.pageNumber);
                          } else if (selectedPdfPages.length < MAX_SOURCE_PDF_PAGES) {
                            updated = [...selectedPdfPages, page.pageNumber].sort((a, b) => a - b);
                          } else {
                            return;
                          }
                          setSelectedPdfPages(updated);
                          setDirectPageInput(updated.join(", "));
                        }}
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
          </div>

          <label className="block">
            <span className="text-xs font-medium text-graphite">Teacher instructions or provided material</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={7} placeholder="Example: Mid-term examination. Include MCQs, fill in the blanks, short answers, descriptive questions, and case-based/application questions. Keep the paper balanced across all three units. Avoid content outside these units.\n\nYou can paste a detailed syllabus or teaching brief here." className={`${field} mt-1 resize-y`} />
          </label>

          <label className="flex items-center gap-2 text-sm text-graphite">
            <input type="checkbox" checked={answerKey} onChange={(e) => setAnswerKey(e.target.checked)} className="h-4 w-4 accent-pen" />
            Include answer key and descriptive marking guidance
          </label>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-rule px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-graphite">
            <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
              1 Paper
            </span>
            <span>· All pages & answer key included</span>
          </div>
          <button
            onClick={handlePreSubmit}
            disabled={busy || preparing}
            className="inline-flex items-center gap-2 bg-pen text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-ink transition-colors disabled:opacity-60 shadow-xs active:scale-95"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {busy ? "Writing paper…" : "Generate paper (1 paper)"}
          </button>
        </div>
      </div>

      <CreditConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={async () => {
          setShowConfirm(false);
          await run();
        }}
        title="Confirm AI Paper Generation"
        subtitle="Review before generating your examination paper."
        cost={generationCost}
        costLabel="1 Paper (full syllabus & answer key included)"
        badge="AI Generator"
        details={[
          { label: "Subject", value: subject.trim() },
          { label: "Class", value: `Class ${className.trim()}` },
          { label: "Syllabus / Topics", value: units.trim() },
          { label: "Marks & Duration", value: `${marks} Marks · ${timeAllowed}` },
        ]}
        busy={busy}
      />
    </div>
  );
}
