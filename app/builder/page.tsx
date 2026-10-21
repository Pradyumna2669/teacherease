"use client";

import { useState, useRef, useCallback, useEffect, useMemo, memo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import PrintPreview from "@/components/PrintPreview";
import ScaledPaper from "@/components/ScaledPaper";
import ImageSearchModal from "@/components/ImageSearchModal";
import ScanModal from "@/components/ScanModal";
import HeaderLayoutEditor from "@/components/HeaderLayoutEditor";
import { buildWordSearch } from "@/lib/wordsearch";
import PageGuides from "@/components/PageGuides";
import BankPickerModal from "@/components/BankPickerModal";
import {
  TranslitProvider,
  TranslitInput,
  TranslitTextarea,
} from "@/components/Translit";
import { getPaper, updatePaper, readDraft, writeDraft, clearDraft } from "@/lib/papers";
import { useModalHistory } from "@/components/Modal";
import { inAndroidApp, OUT_OF_CREDITS } from "@/lib/twa";
import StartWizard from "@/components/StartWizard";
import GeneratePaperModal, { type GeneratedPaper } from "@/components/GeneratePaperModal";
import GenerationFeedbackModal from "@/components/GenerationFeedbackModal";
import AnswerKeyPanel from "@/components/AnswerKeyPanel";
import DownloadAdModal, { type ExportFormat } from "@/components/DownloadAdModal";
import AdBanner from "@/components/AdBanner";
import {
  scannedToQuestions,
  mergeScannedSettings,
  type ScannedPaper,
} from "@/lib/scan";
import {
  extractImagePlaceholder,
  stripImagePlaceholder,
} from "@/lib/image-placeholder";
import {
  PaperSettings,
  PaperStatus,
  Question,
  QuestionType,
  QUESTION_TYPE_LABELS,
  DEFAULT_SETTINGS,
  SubItem,
  HeaderStyle,
  HEADER_STYLE_LABELS,
  HEADER_FIELD_LABELS,
  DEFAULT_HEADER_ROWS,
  MAX_HEADER_ROWS,
  MAX_HEADER_SLOTS,
  MATCH_LABEL_OPTIONS,
  CELL_ALIGN_OPTIONS,
  romanNumeral,
  keepsTogether,
  type HeaderField,
  type MatchLabel,
  type CellAlign,
  LineStyle,
  LINE_STYLE_LABELS,
  BlankLineStyle,
  Density,
  PageColumns,
  PageMargin,
  FontFamily,
  PaperLanguage,
  MARGIN_LABELS,
  FONT_FAMILY_LABELS,
  PAPER_LANGUAGE_LABELS,
  MARGIN_VALUES,
  titlesFor,
  itcOf,
  isStructuralQuestion,
} from "@/lib/types";
import InstructionsPanel from "@/components/InstructionsPanel";

// Plain text/number settings rendered as a generic grid. Keys are restricted to
// the scalar fields — headerRows is a structure and has its own editor.
type ScalarSettingKey =
  | "schoolName"
  | "schoolSubtitle"
  | "logoUrl"
  | "assessmentTitle"
  | "academicYear"
  | "subject"
  | "className"
  | "section"
  | "timeAllowed"
  | "totalMarks";

const settingsFields: { key: ScalarSettingKey; label: string; type: "text" | "number" }[] = [
  { key: "schoolName", label: "School Name", type: "text" },
  { key: "schoolSubtitle", label: "Affiliation / Branch", type: "text" },
  { key: "logoUrl", label: "Logo URL", type: "text" },
  { key: "assessmentTitle", label: "Exam name", type: "text" },
  { key: "academicYear", label: "Academic Year", type: "text" },
  { key: "subject", label: "Subject", type: "text" },
  { key: "className", label: "Class", type: "text" },
  { key: "section", label: "Section / Div", type: "text" },
  { key: "timeAllowed", label: "Time Allowed", type: "text" },
  { key: "totalMarks", label: "Total Marks", type: "number" },
];
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Download,
  Printer,
  Eye,
  EyeOff,
  GripVertical,
  FileText,
  PenLine,
  MessageSquare,
  CheckSquare,
  ArrowLeftRight,
  ToggleLeft,
  Calculator,
  BookOpen,
  Lightbulb,
  Edit3,
  Settings,
  X,
  Copy,
  ImagePlus,
  Image as ImageIcon,
  PenTool,
  Volume2,
  Palette,
  Tag,
  Search,
  LayoutGrid,
  Table as TableIcon,
  ArrowLeft,
  Check,
  Loader2,
  CloudOff,
  GripHorizontal,
  ScanLine,
  Library,
  Scale,
  FileSearch,
  Workflow,
  Filter,
  Shuffle,
  Grid3x3,
  RotateCw,
  Share2,
  FileDown,
  Heading,
  Sparkles,
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  Building2,
  BookmarkPlus,
} from "lucide-react";

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function createSubItem(content = ""): SubItem {
  return { id: newId(), content, lines: 1 };
}

const QUESTION_TYPE_ICON_MAP: Record<QuestionType, React.ReactNode> = {
  "fill-blanks": <PenLine size={20} />,
  "short-answer": <MessageSquare size={20} />,
  "long-answer": <FileText size={20} />,
  mcq: <CheckSquare size={20} />,
  match: <ArrowLeftRight size={20} />,
  "true-false": <ToggleLeft size={20} />,
  "math-vertical": <Calculator size={20} />,
  comprehension: <BookOpen size={20} />,
  "word-problem": <Lightbulb size={20} />,
  composition: <Edit3 size={20} />,
  "picture-composition": <ImageIcon size={20} />,
  handwriting: <PenTool size={20} />,
  dictation: <Volume2 size={20} />,
  draw: <Palette size={20} />,
  "label-image": <Tag size={20} />,
  table: <TableIcon size={20} />,
  "assertion-reason": <Scale size={20} />,
  "case-study": <FileSearch size={20} />,
  "diagram-label": <Workflow size={20} />,
  "odd-one-out": <Filter size={20} />,
  rearrange: <Shuffle size={20} />,
  "word-search": <Grid3x3 size={20} />,
  custom: <LayoutGrid size={20} />,
};

const QUESTION_CATEGORIES: {
  id: "objective" | "qa" | "maths" | "activities" | "all";
  label: string;
  shortLabel: string;
  types: QuestionType[];
}[] = [
  {
    id: "objective",
    label: "🟢 Objective / 1 Mark",
    shortLabel: "Objective",
    types: ["fill-blanks", "mcq", "true-false", "match", "odd-one-out"],
  },
  {
    id: "qa",
    label: "🔵 Q & A",
    shortLabel: "Q & A",
    types: ["short-answer", "long-answer", "assertion-reason", "case-study"],
  },
  {
    id: "maths",
    label: "🟣 Maths",
    shortLabel: "Maths",
    types: ["math-vertical", "word-problem", "table"],
  },
  {
    id: "activities",
    label: "🟡 Activities & Special",
    shortLabel: "Activities",
    types: [
      "comprehension",
      "picture-composition",
      "diagram-label",
      "label-image",
      "draw",
      "word-search",
      "rearrange",
      "composition",
      "handwriting",
      "dictation",
      "custom",
    ],
  },
  {
    id: "all",
    label: "All Types (23)",
    shortLabel: "All",
    types: Object.keys(QUESTION_TYPE_LABELS) as QuestionType[],
  },
];

const QUESTION_DESCRIPTIONS: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "Blank spaces (____) for students to fill in",
  mcq: "Multiple choice with 4 options (A, B, C, D)",
  "true-false": "Statements with [True / False] brackets",
  match: "Match Column A with Column B",
  "odd-one-out": "Find the different word from a set",
  "short-answer": "1–2 sentence answer with ruled lines",
  "long-answer": "Detailed answer (4+ ruled lines)",
  "assertion-reason": "Statement & reason questions",
  "case-study": "Passage or real-world scenario with sub-questions",
  "math-vertical": "Column sums (+, -, ×, ÷)",
  "word-problem": "Story maths problem with workspace",
  table: "Data grid table with question rows",
  comprehension: "Reading passage followed by questions",
  "picture-composition": "Picture prompt for writing sentences",
  "diagram-label": "Diagram with labeling pointers",
  "label-image": "Image with blanks to identify parts",
  draw: "Box with blank area for drawing",
  "word-search": "Letter puzzle grid to find words",
  rearrange: "Jumbled words or sentences in correct order",
  composition: "Essay, letter or paragraph topic",
  handwriting: "4-line handwriting practice sentences",
  dictation: "Listening test lines",
  custom: "Custom question with flexible layout",
};

function createQuestion(type: QuestionType, language: PaperLanguage = "english"): Question {
  const base: Question = {
    id: newId(),
    type,
    title: titlesFor(language)[type],
    marks: 5,
    items: [],
    columnsPerRow: type === "math-vertical" ? 4 : type === "mcq" ? 2 : 1,
  };

  // Every case below seeds STRUCTURE only — how many items, how many ruled
  // lines, which operation, box sizes. It deliberately seeds no content.
  //
  // These used to carry worked examples ("Rohan was a lazy boy…", 496 + 171,
  // "My Mother's name is ___"), which are real values, not placeholders: a
  // teacher who adds a question and does not notice prints somebody else's
  // sample on a live exam. The editors already carry their own placeholder
  // text, so the shape is still obvious with the values gone.
  switch (type) {
    case "fill-blanks":
      base.items = [createSubItem(""), createSubItem("")];
      break;
    case "short-answer":
      base.items = [
        { ...createSubItem(""), lines: 1 },
        { ...createSubItem(""), lines: 1 },
      ];
      break;
    case "long-answer":
      base.items = [{ ...createSubItem(""), lines: 4 }];
      break;
    case "mcq":
      base.items = [
        {
          ...createSubItem(""),
          options: ["", "", "", ""],
        },
      ];
      break;
    case "match":
      base.matchLeft = ["", "", ""];
      base.matchRight = ["", "", ""];
      break;
    case "true-false":
      base.items = [createSubItem(""), createSubItem("")];
      break;
    case "math-vertical":
      base.operation = "+";
      base.items = [
        { ...createSubItem(""), num1: "", num2: "" },
        { ...createSubItem(""), num1: "", num2: "" },
        { ...createSubItem(""), num1: "", num2: "" },
        { ...createSubItem(""), num1: "", num2: "" },
      ];
      break;
    case "comprehension":
      base.passage = "";
      base.items = [
        { ...createSubItem(""), lines: 1 },
        { ...createSubItem(""), lines: 1 },
      ];
      break;
    case "word-problem":
      base.wpOperationBox = true;
      base.wpBoxPosition = "right";
      base.wpBoxWidth = 150;
      base.wpBoxHeight = 70;
      base.items = [{ ...createSubItem(""), lines: 2 }];
      break;
    case "composition":
      base.compositionSentences = ["", "", "", "", ""];
      break;
    case "picture-composition":
      base.writingLines = 6;
      break;
    case "handwriting":
      base.items = [
        { ...createSubItem(""), lines: 2 },
        { ...createSubItem(""), lines: 2 },
        { ...createSubItem(""), lines: 2 },
      ];
      break;
    case "dictation":
      base.writingLines = 8;
      base.columnsPerRow = 2;
      break;
    case "draw":
      base.boxHeight = 120;
      base.columnsPerRow = 1;
      base.items = [createSubItem("")];
      break;
    case "label-image":
      base.columnsPerRow = 2;
      base.items = [
        createSubItem(""),
        createSubItem(""),
        createSubItem(""),
        createSubItem(""),
      ];
      break;
    case "assertion-reason":
      base.marks = 2;
      base.items = [
        {
          ...createSubItem("Plants need sunlight to make their own food."),
          secondary: "Photosynthesis takes place in the presence of chlorophyll.",
        },
      ];
      break;
    case "case-study":
      base.marks = 4;
      base.caseSourceLabel = "Read the source given below:";
      base.caseRomanNumerals = true;
      base.passage =
        "A village panchayat decided to build a rainwater harvesting tank. Before the tank, women walked three kilometres each day to fetch water. After it was built, the village had water through the summer for the first time in years.";
      base.items = [
        { ...createSubItem("What problem did the village face?"), lines: 1 },
        { ...createSubItem("How did the panchayat solve it?"), lines: 1 },
        { ...createSubItem("Why is rainwater harvesting useful?"), lines: 2 },
      ];
      break;
    case "diagram-label":
      base.marks = 4;
      base.columnsPerRow = 2;
      base.items = [
        createSubItem(""),
        createSubItem(""),
        createSubItem(""),
        createSubItem(""),
      ];
      break;
    case "odd-one-out":
      base.marks = 4;
      base.columnsPerRow = 1;
      base.items = [
        { ...createSubItem(""), options: ["Apple", "Mango", "Banana", "Chair"] },
        { ...createSubItem(""), options: ["Cow", "Goat", "Tiger", "Sheep"] },
        { ...createSubItem(""), options: ["Delhi", "Mumbai", "Chennai", "Nepal"] },
      ];
      break;
    case "rearrange":
      base.marks = 4;
      base.items = [
        { ...createSubItem("is / a / this / book"), lines: 1 },
        { ...createSubItem("garden / in / play / the / we"), lines: 1 },
        { ...createSubItem("sweet / mangoes / are / very"), lines: 1 },
      ];
      break;
    case "word-search":
      base.marks = 5;
      base.columnsPerRow = 3;
      base.items = [
        createSubItem("RIVER"),
        createSubItem("MOUNTAIN"),
        createSubItem("FOREST"),
        createSubItem("DESERT"),
        createSubItem("OCEAN"),
      ];
      break;
    case "table":
      base.marks = 5;
      base.tableCaption = "Butterflies in the garden";
      base.tableHeaderRow = true;
      base.tableHeaderCol = false;
      base.tableCellMinHeight = 22;
      base.tableRows = [
        ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"],
        ["16", "12", "8", "10", "4"],
      ];
      base.items = [
        createSubItem("On which day does she see 16 butterflies?"),
        createSubItem("On which day does Tanya see the fewest butterflies?"),
      ];
      break;
    case "custom":
      base.marks = 5;
      base.customBlocks = [
        { id: newId(), kind: "text", text: "1) Write your question here ___", bold: false },
        { id: newId(), kind: "lines", lines: 2, ruling: "single" },
        { id: newId(), kind: "text", text: "2) Solve in the box:", bold: false },
        { id: newId(), kind: "box", height: 100 },
      ];
      break;
  }

  return base;
}

type SaveState = "idle" | "loading" | "saving" | "saved" | "error";

// The bundled html2pdf declaration stops at .save(); outputPdf is real (see
// node_modules/html2pdf.js/src/worker.js) and is the only way to reach the bytes
// without going through the browser's download.
type Html2PdfWorker = {
  save: () => Promise<void>;
  outputPdf: (type: "blob") => Promise<Blob>;
};

function BuilderInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paperId = searchParams.get("id");
  // Launcher shortcut: "Scan a paper" lands here with no paper yet.
  const wantsScan = searchParams.get("scan") === "1";

  const [settings, setSettings] = useState<PaperSettings>(DEFAULT_SETTINGS);

  // Roman -> Devanagari auto-convert while typing (Hindi/Marathi papers). On by
  // default so teachers who can't type Devanagari just type in English letters.
  const [translitOn, setTranslitOn] = useState(true);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  // The step-by-step guide. Opens itself for a paper with nothing on it
  // yet, which is exactly the moment the full builder is overwhelming.
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const [showSetBModal, setShowSetBModal] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [setBVariant, setSetBVariant] = useState("Set B");
  const [setBNotes, setSetBNotes] = useState("");
  const [setBAnswerKey, setSetBAnswerKey] = useState(true);
  const [generatingSetB, setGeneratingSetB] = useState(false);
  const [feedbackPrompt, setFeedbackPrompt] = useState<{
    open: boolean;
    method: "ai_generated" | "scanned" | "ai_textbook";
  }>({ open: false, method: "ai_generated" });

  const triggerPostGenFeedback = useCallback(
    (method: "ai_generated" | "scanned" | "ai_textbook") => {
      if (typeof window === "undefined") return;
      try {
        if (sessionStorage.getItem("papergen_feedback_submitted") === "true") return;
        if (sessionStorage.getItem("papergen_feedback_dismissed") === "true") return;
        if (paperId && localStorage.getItem(`papergen_feedback_${paperId}`) === "true") return;
      } catch {
        // ignore storage errors
      }
      setTimeout(() => {
        setFeedbackPrompt({ open: true, method });
      }, 1800);
    },
    [paperId]
  );

  // School collaboration & review workflow
  const [schoolInfo, setSchoolInfo] = useState<{
    schoolId: string | null;
    schoolName: string | null;
    isAdmin: boolean;
    isMember: boolean;
  } | null>(null);
  const [paperStatus, setPaperStatus] = useState<PaperStatus>("draft");
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewVerdict, setReviewVerdict] = useState<"approved" | "changes_requested">("approved");
  const [reviewFeedbackNote, setReviewFeedbackNote] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // PDF export is slow enough on a phone to look broken without a busy state.
  // The ref rejects a second tap landing before the disabled state has painted;
  // two concurrent rasterisations at scale:2 are what run a phone out of memory.
  const [exporting, setExporting] = useState(false);
  const exportingRef = useRef(false);
  const [exportError, setExportError] = useState<string | null>(null);
  // Short confirmation after something lands in the paper — generated
  // questions, mostly. Shares the export banner rather than adding a
  // second place for the builder to talk to her.
  const [notice, setNotice] = useState<string | null>(null);

  const closeTypeModal = useCallback(() => setShowTypeModal(false), []);

  function handleGeneratedPaper(paper: GeneratedPaper) {
    setQuestions((current) => [...current, ...paper.questions]);
    if (paper.settings) {
      setSettings((current) => ({
        ...current,
        subject: paper.settings?.subject || current.subject,
        className: paper.settings?.className || current.className,
        totalMarks: paper.settings?.totalMarks || current.totalMarks,
        assessmentTitle: paper.settings?.assessmentTitle || current.assessmentTitle,
        language: paper.settings?.language || current.language,
        timeAllowed: paper.settings?.timeAllowed || current.timeAllowed,
        answerKey: paper.settings?.answerKey === true,
        instructions: paper.settings?.instructions?.length ? paper.settings.instructions : current.instructions,
      }));
    }
    if (paperId) {
      updatePaper(paperId, { method: paper.method || "ai_generated" }).catch(() => {});
    }
    setShowGenerateModal(false);
    setWizardOpen(false);
    setMobileTab("preview");
    setNotice(`${paper.questions.length} AI-generated questions added to your paper.`);
    triggerPostGenFeedback(paper.method || "ai_generated");
  }

  // Cloud persistence: load the paper for ?id=, then debounce-save edits.
  const [saveState, setSaveState] = useState<SaveState>(paperId ? "loading" : "idle");
  const loadedRef = useRef(false); // becomes true once initial data is in state
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Newest edit waiting to reach the server, plus a counter so a save that
  // finishes after further typing does not clear the newer local copy.
  const pendingRef = useRef<{ settings: PaperSettings; questions: Question[] } | null>(null);
  const revRef = useRef(0);
  const inFlightRef = useRef(false);
  const failuresRef = useRef(0);
  // Load and save both surface as "error"; only the save half can be retried
  // in place, so they need telling apart in the banner.
  const [loadFailed, setLoadFailed] = useState(false);
  // An unsent local copy found on this device, offered before it is overwritten.
  const [recovered, setRecovered] = useState<{
    settings: PaperSettings;
    questions: Question[];
  } | null>(null);

  // Without a paper id there is nothing to edit — unless the launcher shortcut
  // sent the teacher straight to the scanner, in which case make the paper for
  // them rather than bouncing them to a dashboard they didn't ask for.
  useEffect(() => {
    if (paperId) return;
    if (!wantsScan) {
      router.replace("/dashboard");
      return;
    }
    let active = true;
    (async () => {
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
            method: "scanned",
          }),
        });
        const data = await res.json();
        if (!active) return;
        // Same credit gate as the dashboard's New Paper button. Inside the app
        // there is nowhere to send them — /topup is redirected away by the
        // middleware — so land on the dashboard, where the credit badge reads
        // zero, rather than bouncing through a route that no longer exists.
        if (res.status === 402) {
          router.replace(inAndroidApp() ? "/dashboard" : "/topup");
          return;
        }
        if (!res.ok || !data.id) throw new Error("no id");
        router.replace(`/builder?id=${data.id}&scan=1`);
      } catch {
        if (active) router.replace("/dashboard");
      }
    })();
    return () => {
      active = false;
    };
  }, [paperId, wantsScan, router]);

  // Initial load.
  useEffect(() => {
    if (!paperId) return;
    loadedRef.current = false;
    let active = true;
    (async () => {
      try {
        const paper = await getPaper(paperId);
        if (!active) return;
        if (!paper) {
          router.replace("/dashboard");
          return;
        }
        const loadedSettings = { ...DEFAULT_SETTINGS, ...paper.settings };
        const loadedQuestions = (Array.isArray(paper.questions) ? paper.questions : []).map((q: any) => ({
          ...q,
          items: Array.isArray(q?.items) ? q.items : [],
        }));
        setSettings(loadedSettings);
        setQuestions(loadedQuestions);
        if (paper.status) setPaperStatus(paper.status as PaperStatus);
        if (paper.review_feedback) setReviewFeedback(paper.review_feedback);
        setSaveState("saved");

        // Load school context
        fetch("/api/school")
          .then((r) => r.json())
          .then((sc) => {
            if (active && sc?.school) {
              setSchoolInfo({
                schoolId: sc.school.id,
                schoolName: sc.school.name,
                isAdmin: !!sc.isAdmin,
                isMember: true,
              });
            }
          })
          .catch(() => {});
        // The launcher shortcut promises the scanner, not an empty builder.
        // Opened here rather than on mount so a scan can never land before the
        // paper it is being added to.
        if (wantsScan) setShowScanModal(true);
        // Nothing on the paper means she has not started it, so walk her
        // through. Decided here rather than in an effect so it fires once per
        // paper and never re-opens after she has dismissed it.
        else if (loadedQuestions.length === 0) setWizardOpen(true);

        // A draft survives only while the server has not accepted it, so one
        // being here at all means the last session's edits never landed.
        const draft = readDraft(paperId);
        if (draft) {
          const same =
            JSON.stringify({ s: draft.settings, q: draft.questions }) ===
            JSON.stringify({ s: loadedSettings, q: loadedQuestions });
          if (same) clearDraft(paperId);
          else setRecovered({ settings: draft.settings, questions: draft.questions });
        }
        // Defer marking "loaded" so the first auto-save effect run is skipped.
        requestAnimationFrame(() => {
          loadedRef.current = true;
        });
      } catch {
        if (!active) return;
        setLoadFailed(true);
        setSaveState("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [paperId, wantsScan, router]);

  // Push the newest edit to the server. Retries on a widening delay rather than
  // dropping the change — school Wi-Fi and 3G in a staffroom fail constantly,
  // and the old single-shot save left the teacher with nothing but a 13px icon.
  // Retries call through the ref so the callback can reschedule itself without
  // depending on its own identity.
  const flushRef = useRef<() => void>(() => {});
  const flushSave = useCallback(async () => {
    if (!paperId || inFlightRef.current) return;
    const payload = pendingRef.current;
    if (!payload) return;
    const rev = revRef.current;
    inFlightRef.current = true;
    setSaveState("saving");
    try {
      const computedTitle =
        payload.settings.subject && payload.settings.assessmentTitle
          ? `${payload.settings.subject} • ${payload.settings.assessmentTitle}`
          : payload.settings.assessmentTitle || payload.settings.subject || (payload.questions.length > 0 ? "Practice Paper" : "Untitled Paper");
      await updatePaper(paperId, {
        title: computedTitle,
        subject: payload.settings.subject || null,
        class_name: payload.settings.className || null,
        settings: payload.settings,
        questions: payload.questions,
      });
      failuresRef.current = 0;
      if (revRef.current === rev) {
        pendingRef.current = null;
        clearDraft(paperId);
        setSaveState("saved");
      } else {
        // Typed while the request was in the air — that newer copy still owes
        // the server a round trip.
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => flushRef.current(), 300);
      }
    } catch {
      failuresRef.current += 1;
      setSaveState("error");
      // 1s, 2s, 4s … capped at half a minute.
      const wait = Math.min(30000, 1000 * 2 ** (failuresRef.current - 1));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => flushRef.current(), wait);
    } finally {
      inFlightRef.current = false;
    }
  }, [paperId]);
  useEffect(() => {
    flushRef.current = flushSave;
  }, [flushSave]);

  // Debounced auto-save whenever settings or questions change post-load.
  useEffect(() => {
    if (!paperId || !loadedRef.current) return;
    revRef.current += 1;
    pendingRef.current = { settings, questions };
    // The local mirror is written now, not on the debounce — the debounce is
    // exactly the window in which the WebView gets killed.
    writeDraft(paperId, { settings, questions });
    failuresRef.current = 0;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [settings, questions, paperId, flushSave]);

  // Don't sit on a debounce while the app is being backgrounded or the
  // connection has just come back.
  useEffect(() => {
    if (!paperId) return;
    const flush = () => {
      if (!pendingRef.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      failuresRef.current = 0;
      flushSave();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("online", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("online", flush);
      // Leaving for the dashboard must not strand the debounce mid-flight.
      flush();
    };
  }, [paperId, flushSave]);

  const printRef = useRef<HTMLDivElement>(null);

  // Free users get a "PaperGen" watermark on print/PDF and see ad-supported downloads.
  // Cleared once they buy any pack/plan. Default true (safe) until balance check confirms paid.
  const [watermark, setWatermark] = useState(true);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  useEffect(() => {
    fetch("/api/credits/balance", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const paid = Boolean(d?.paid);
        setIsPaid(paid);
        setWatermark(!paid);
      })
      .catch(() => {
        setIsPaid(false);
        setWatermark(true);
      });
  }, []);

  const restoreRecovered = useCallback(() => {
    if (!recovered) return;
    setSettings(recovered.settings);
    setQuestions(recovered.questions);
    setRecovered(null);
  }, [recovered]);

  const discardRecovered = useCallback(() => {
    if (paperId) clearDraft(paperId);
    setRecovered(null);
  }, [paperId]);

  const retrySave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    failuresRef.current = 0;
    flushSave();
  }, [flushSave]);

  // Question CRUD
  const addQuestion = useCallback(
    (type: QuestionType) => {
      const q = createQuestion(type, settings.language);
      setQuestions((prev) => [...prev, q]);
      setExpandedQ(q.id);
      setShowTypeModal(false);
    },
    [settings.language]
  );

  const addSectionHeader = useCallback(() => {
    const existingSections = questions.filter(isStructuralQuestion).length;
    const letter = String.fromCharCode(65 + (existingSections % 26));
    const q: Question = {
      id: `sec_${Math.random().toString(36).slice(2, 9)}`,
      type: "short-answer",
      title: `Section ${letter}: Questions (marks each)`,
      marks: 0,
      items: [],
    };
    setQuestions((prev) => [...prev, q]);
    setExpandedQ(q.id);
  }, [questions]);

  // Writes one answer back into the paper. Ids come from answerableItems:
  // "q:<questionId>" for a whole-question answer, "i:<itemId>" for one item.
  const setAnswer = useCallback((id: string, answer: string) => {
    if (id.startsWith("q:")) {
      const qid = id.slice(2);
      setQuestions((prev) =>
        prev.map((q) => (q.id === qid ? { ...q, answerNote: answer } : q))
      );
      return;
    }
    const iid = id.slice(2);
    setQuestions((prev) =>
      prev.map((q) =>
        q.items.some((it) => it.id === iid)
          ? {
              ...q,
              items: q.items.map((it) =>
                it.id === iid ? { ...it, answer } : it
              ),
            }
          : q
      )
    );
  }, []);

  // Apply a scanned paper: merge header settings and append all questions.
  const applyScanned = useCallback(
    (paper: ScannedPaper) => {
      const newQs = scannedToQuestions(paper.questions);
      // An empty paper has never been scanned, so the photograph outranks the
      // header seeded from her previous paper. Once questions exist she has had
      // the chance to correct it, and her corrections win.
      const firstScan = questions.length === 0;
      if (paper.settings) {
        setSettings((s) => mergeScannedSettings(s, paper.settings!, firstScan));
      }
      setQuestions((prev) => [...prev, ...newQs]);
      if (paperId) {
        updatePaper(paperId, { method: "scanned" }).catch(() => {});
      }
      setShowScanModal(false);
      setWizardOpen(false);
      setMobileTab("preview");
      triggerPostGenFeedback("scanned");
    },
    [questions.length, paperId, triggerPostGenFeedback]
  );

  // Append questions pulled from the bank's rotation picker.
  const applyFromBank = useCallback((picked: Question[]) => {
    setQuestions((prev) => [...prev, ...picked]);
    setShowBankModal(false);
    setWizardOpen(false);
    setMobileTab("preview");
  }, []);

  // Stable, so a memoised card is not re-rendered by a fresh closure.
  const toggleExpanded = useCallback((id: string) => {
    setExpandedQ((prev) => (prev === id ? null : id));
  }, []);

  const updateQuestion = useCallback(
    (id: string, updates: Partial<Question>) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
      );
    },
    []
  );

  const deleteQuestion = useCallback((id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setExpandedQ(null);
  }, []);

  const duplicateQuestion = useCallback((id: string) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      if (idx === -1) return prev;
      const copy = JSON.parse(JSON.stringify(prev[idx]));
      copy.id = newId();
      copy.items = copy.items.map((it: SubItem) => ({ ...it, id: newId() }));
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  const moveQuestion = useCallback((id: string, dir: -1 | 1) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  // Sub-item CRUD
  const addSubItem = useCallback(
    (qId: string, content = "") => {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === qId
            ? { ...q, items: [...q.items, createSubItem(content)] }
            : q
        )
      );
    },
    []
  );

  const updateSubItem = useCallback(
    (qId: string, itemId: string, updates: Partial<SubItem>) => {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === qId
            ? {
                ...q,
                items: q.items.map((it) =>
                  it.id === itemId ? { ...it, ...updates } : it
                ),
              }
            : q
        )
      );
    },
    []
  );

  const removeSubItem = useCallback((qId: string, itemId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? { ...q, items: q.items.filter((it) => it.id !== itemId) }
          : q
      )
    );
  }, []);

  const regenerateQuestion = useCallback(
    async (id: string) => {
      const q = questions.find((item) => item.id === id);
      if (!q || isStructuralQuestion(q)) return;
      setRegeneratingId(id);
      setNotice(null);
      try {
        const res = await fetch("/api/questions/regenerate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q,
            subject: settings.subject,
            className: settings.className,
            language: settings.language,
          }),
        });
        const data = await res.json();
        if (res.status === 402) {
          if (inAndroidApp()) {
            setNotice(OUT_OF_CREDITS);
            return;
          }
          setNotice(data.error || "Not enough credits to regenerate question.");
          router.push("/topup");
          return;
        }
        if (!res.ok || !data.question) {
          throw new Error(data.error || "Failed to regenerate question.");
        }
        const replacement: Question = {
          ...data.question,
          id: q.id,
        };
        setQuestions((prev) => prev.map((item) => (item.id === id ? replacement : item)));
        setNotice(`Question regenerated with fresh content.`);
      } catch (err: unknown) {
        setNotice(err instanceof Error ? err.message : "Failed to regenerate question.");
      } finally {
        setRegeneratingId(null);
      }
    },
    [questions, settings.subject, settings.className, settings.language, router]
  );

  async function handleSubmitReview(action: "submit" | "withdraw") {
    if (!paperId) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/papers/${paperId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update review status.");
      setPaperStatus(data.status);
      setNotice(
        action === "submit"
          ? "Paper submitted for school review."
          : "Paper withdrawn back to draft."
      );
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : "Failed to update review status.");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleAdminReview() {
    if (!paperId) return;
    setSubmittingReview(true);
    try {
      const res = await fetch("/api/school/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId,
          verdict: reviewVerdict,
          feedback: reviewFeedbackNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review.");
      setPaperStatus(data.status);
      setReviewFeedback(reviewFeedbackNote || null);
      setShowReviewModal(false);
      setNotice(
        reviewVerdict === "approved"
          ? "Exam paper approved for printing."
          : "Changes requested from teacher."
      );
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleSaveAsTemplate() {
    if (!templateTitle.trim()) return;
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/school/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: templateTitle.trim(),
          description: templateDesc.trim() || undefined,
          subject: settings.subject || undefined,
          className: settings.className || undefined,
          settings,
          sections: questions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save template.");
      setShowTemplateModal(false);
      setTemplateTitle("");
      setTemplateDesc("");
      setNotice("Exam blueprint saved to School Templates.");
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : "Failed to save template.");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleGenerateSetB() {
    if (!paperId) return;
    setGeneratingSetB(true);
    try {
      const res = await fetch("/api/papers/set-b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePaperId: paperId,
          variant: setBVariant || "Set B",
          notes: setBNotes.trim() || undefined,
          includeAnswerKey: setBAnswerKey,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        if (inAndroidApp()) {
          setNotice(OUT_OF_CREDITS);
          return;
        }
        setNotice(data.error || "Not enough credits to generate parallel exam.");
        router.push("/topup");
        return;
      }
      if (!res.ok || !data.id) {
        throw new Error(data.error || "Could not generate parallel exam.");
      }
      setShowSetBModal(false);
      router.push(`/builder?id=${data.id}`);
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : "Could not generate parallel exam.");
    } finally {
      setGeneratingSetB(false);
    }
  }

  // Export
  //
  // Printing used to open a second window and rebuild the paper inside it.
  // Android Chrome blocks that opener routinely, and a TWA has no second window
  // at all, so the teacher tapped a printer and got silence. Print this document
  // instead — globals.css hides everything but #print-area, and the print source
  // below carries that id.
  const handlePrint = () => {
    window.print();
  };

  // Header fields start blank now, so joining them unconditionally produced
  // "__.pdf" for a paper she had not filled in yet — and every such paper
  // landed on the same filename in her Downloads.
  const pdfFilename = `${
    [settings.subject, settings.className, settings.assessmentTitle]
      .map((p) => p.trim())
      .filter(Boolean)
      .join("_")
      .replace(/[\\/:*?"<>|]/g, "-") || "question-paper"
  }.pdf`;

  // Both exports rasterise the same off-viewport source with the same options;
  // only the last step differs, so the busy state, the margin fix and the
  // out-of-memory message live here once.
  const runExport = async (finish: (worker: Html2PdfWorker) => Promise<void>) => {
    const el = printRef.current;
    if (!el || exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setExportError(null);

    // The preview expresses page margins as CSS padding inside the sheet, while
    // html2pdf adds its own margin around whatever it captures. Applying both
    // doubled the margin — a "normal" paper printed at roughly 20mm instead of
    // 10mm, narrowing the content column so lines wrapped where the preview
    // never showed. Strip the padding for the duration of the capture and let
    // the PDF margin do the job alone.
    //
    // Done in place on the dedicated print source below, which is always in the
    // document at true A4 width. html2pdf clones what it is given into its own
    // container, and a clone carries inline styles only — so the padding has to
    // be cleared on the real nodes before .from(el) runs.
    const papers = Array.from(el.querySelectorAll<HTMLElement>(".paper-preview"));
    const savedPadding = papers.map((p) => p.style.padding);
    papers.forEach((p) => {
      p.style.padding = "0";
    });

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const worker = html2pdf()
        .set({
          margin: MARGIN_VALUES[settings.margin].pdf,
          filename: pdfFilename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          // NOT "avoid-all". That mode marks every element in the document as
          // unbreakable, and html2pdf pushes an element to the next page by
          // inserting a spacer div as its SIBLING. When the straddling element
          // sat inside .question-title (display:flex; space-between), the
          // spacer became a third flex item and shoved the title into the
          // middle of the row — the "Q.10) Subtract:" glitch.
          //
          // Only whole questions should resist splitting, and .pp-question
          // already carries break-inside: avoid, so its parent is the plain
          // block that holds the questions. A spacer there is harmless.
          // Cast: the shipped typings omit `avoid`, though the option is real
          // (see node_modules/html2pdf.js/src/plugin/pagebreaks.js).
          pagebreak: {
            mode: ["css", "legacy"],
            avoid: ".pp-keep, .pp-row",
          } as unknown as { mode: string[] },
        })
        .from(el);
      await finish(worker as unknown as Html2PdfWorker);
    } catch {
      // Rasterising a long paper is the heaviest thing the app does and a cheap
      // phone can simply run out of memory. Say so instead of leaving the
      // teacher tapping a button that looks broken.
      setExportError(
        "Could not make the PDF. Close other apps and try again — or use Print."
      );
    } finally {
      papers.forEach((p, i) => {
        p.style.padding = savedPadding[i];
      });
      exportingRef.current = false;
      setExporting(false);
    }
  };

  const recordExportEvent = (event: "paper_downloaded_pdf" | "paper_downloaded_docx") => {
    void fetch("/api/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        metadata: { exportFormat: event.endsWith("docx") ? "docx" : "pdf", questionCount: questions.length },
      }),
      keepalive: true,
    }).catch(() => undefined);
  };

  const previewLoggedRef = useRef(false);
  useEffect(() => {
    if (!previewLoggedRef.current && questions.length > 0) {
      previewLoggedRef.current = true;
      void fetch("/api/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "paper_previewed",
          metadata: { questionCount: questions.length },
        }),
        keepalive: true,
      }).catch(() => undefined);
    }
  }, [questions.length]);

  const handleDownloadPDF = () =>
    runExport(async (worker) => {
      await worker.save();
      recordExportEvent("paper_downloaded_pdf");
    });

  const [exportingWord, setExportingWord] = useState(false);
  const handleDownloadWord = async () => {
    if (exportingWord) return;
    setExportingWord(true);
    setExportError(null);
    try {
      const { exportPaperToDocx } = await import("@/lib/word-export");
      const blob = await exportPaperToDocx(settings, questions);
      const title = (settings.assessmentTitle || settings.subject || "Question_Paper")
        .replace(/[/\\?%*:|"<>]/g, "-")
        .replace(/\s+/g, "_");
      const docxFilename = `${title}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = docxFilename;
      a.click();
      recordExportEvent("paper_downloaded_docx");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("Word export failed:", err);
      setExportError("Could not generate Word document. Please try again.");
    } finally {
      setExportingWord(false);
    }
  };

  // The finished paper used to land in Downloads behind a Chrome notification,
  // at the exact moment the teacher wants to send it to the print shop. Hand it
  // to the system share sheet instead, so WhatsApp is one tap away.
  const handleShare = () =>
    runExport(async (worker) => {
      const blob = await worker.outputPdf("blob");
      const file = new File([blob], pdfFilename, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: pdfFilename });
          return;
        } catch (err) {
          // A dismissed sheet is a normal outcome, not a failure. Anything else
          // — usually the tap's activation expiring during a long rasterise —
          // falls through to the download so she still gets the file.
          if ((err as Error)?.name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFilename;
      a.click();
      // Revoking in the same tick has been seen to cancel the download before
      // the browser has read the blob.
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });

  // Export triggers with 5-second AdSense interstitial for free users (0s wait for paid teachers)
  const [downloadModalFormat, setDownloadModalFormat] = useState<ExportFormat | null>(null);

  const triggerDownloadPDF = () => {
    if (isPaid) {
      handleDownloadPDF();
    } else {
      setDownloadModalFormat("pdf");
    }
  };

  const triggerDownloadWord = () => {
    if (isPaid) {
      handleDownloadWord();
    } else {
      setDownloadModalFormat("docx");
    }
  };

  const triggerShare = () => {
    if (isPaid) {
      handleShare();
    } else {
      setDownloadModalFormat("share");
    }
  };

  const triggerPrint = () => {
    if (isPaid) {
      handlePrint();
    } else {
      setDownloadModalFormat("print");
    }
  };

  // Mobile tab state: "editor" | "preview" | "settings"
  const [mobileTab, setMobileTab] = useState<"editor" | "preview" | "settings">("editor");
  // "fit" scales the A4 page down so the preview matches print exactly; "read"
  // renders it full size for legibility and scrolls horizontally.
  const [previewMode, setPreviewMode] = useState<"fit" | "read">("read");
  const [typeCategory, setTypeCategory] = useState<"objective" | "qa" | "maths" | "activities" | "all">("objective");

  // The A4 page is by far the most expensive thing on screen, and it was being
  // rebuilt on every keystroke — the whole reason typing felt laggy on a phone.
  // Rendering it from a copy that lands after a pause means one character costs
  // one question card, not a whole paper.
  const [trailing, setTrailing] = useState({ settings, questions });
  useEffect(() => {
    const t = setTimeout(() => setTrailing({ settings, questions }), 200);
    return () => clearTimeout(t);
  }, [settings, questions]);

  const previewContentKey = useMemo(() => {
    return JSON.stringify({
      s: {
        margin: trailing.settings.margin,
        density: trailing.settings.density,
        fontSize: trailing.settings.fontSize,
        pageColumns: trailing.settings.pageColumns,
        lineStyle: trailing.settings.lineStyle,
        showAnswerSpace: trailing.settings.showAnswerSpace,
        headerStyle: trailing.settings.headerStyle,
        headerRows: trailing.settings.headerRows,
        instructions: trailing.settings.instructions,
      },
      q: trailing.questions.map((q) => ({
        id: q.id,
        t: q.type,
        title: q.title,
        marks: q.marks,
        kt: keepsTogether(q),
        cpr: q.columnsPerRow,
        sp: q.spacing,
        wl: q.writingLines,
        hints: q.hints,
        ml: q.matchLeft,
        mr: q.matchRight,
        tr: q.tableRows?.length,
        imgs: q.images?.length,
        items: q.items?.map((it) => [it.id, it.content, it.lines, it.options, it.image ? 1 : 0]),
      })),
    });
  }, [trailing]);

  // Below lg the preview pane is `hidden`, which still renders it. Unmount it
  // on the other tabs instead — the PDF is captured from the off-screen print
  // source, so nothing depends on the visible preview existing.
  const [wideScreen, setWideScreen] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWideScreen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const showPreview = wideScreen || mobileTab === "preview";

  // Android Back closes the type sheet rather than leaving the builder.
  useModalHistory(showTypeModal, closeTypeModal);

  return (
    <TranslitProvider lang={settings.language} enabled={translitOn}>
    <div className="h-[100dvh] flex flex-col bg-paper">
      {/* Top Bar - Desktop */}
      <header className="bg-white border-b border-rule px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between no-print shrink-0 z-30">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-graphite hover:text-ink hover:bg-rule px-2 py-1.5 min-h-[44px] lg:min-h-0 rounded-lg transition-colors"
            title="Back to my papers"
          >
            <ArrowLeft size={18} />
            <span className="text-sm hidden sm:block">My Papers</span>
          </Link>
          <div className="h-6 w-px bg-rule hidden sm:block" />
          <SaveIndicator state={saveState} />
          {schoolInfo?.isMember && (
            <div className="hidden sm:flex items-center gap-1.5 ml-1">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  paperStatus === "approved"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : paperStatus === "in_review"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : paperStatus === "changes_requested"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-rule text-graphite"
                }`}
              >
                {paperStatus === "approved" && <CheckCircle2 size={12} />}
                {paperStatus === "in_review" && <ShieldCheck size={12} />}
                {paperStatus === "changes_requested" && <AlertCircle size={12} />}
                {paperStatus === "approved"
                  ? "Approved"
                  : paperStatus === "in_review"
                  ? "In Review"
                  : paperStatus === "changes_requested"
                  ? "Changes Requested"
                  : "Draft"}
              </span>

              {/* Author action */}
              {(paperStatus === "draft" || paperStatus === "changes_requested") && (
                <button
                  onClick={() => handleSubmitReview("submit")}
                  disabled={submittingReview || questions.length === 0}
                  className="text-xs font-medium text-pen hover:underline flex items-center gap-1 disabled:opacity-50"
                  title="Submit paper to school coordinator for review"
                >
                  <Send size={11} /> Submit
                </button>
              )}
              {paperStatus === "in_review" && (
                <button
                  onClick={() => handleSubmitReview("withdraw")}
                  disabled={submittingReview}
                  className="text-xs text-graphite hover:underline"
                  title="Withdraw paper back to editable draft"
                >
                  Withdraw
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {schoolInfo?.isMember && paperId && (
            <button
              onClick={() => {
                setTemplateTitle(settings.assessmentTitle || settings.subject || "Exam Template");
                setShowTemplateModal(true);
              }}
              disabled={questions.length === 0}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm text-graphite hover:text-ink hover:bg-rule rounded-lg transition-colors disabled:opacity-40"
              title="Save blueprint to School Templates"
            >
              <BookmarkPlus size={15} />
              <span className="hidden xl:inline">Template</span>
            </button>
          )}
          {/* Settings toggle - desktop only (mobile uses bottom tab) */}
          {paperId && (
            <button
              onClick={() => setShowSetBModal(true)}
              disabled={questions.length === 0}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm text-pen hover:bg-pen/5 border border-pen/20 rounded-lg transition-colors disabled:opacity-40"
              title="Create parallel exam (Set B)"
            >
              <Sparkles size={15} />
              Set B
            </button>
          )}
          <button
            onClick={() => setShowSettings((p) => !p)}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-sm text-graphite hover:text-ink hover:bg-rule rounded-lg transition-colors"
          >
            <Settings size={16} />
            Settings
          </button>
          <div className="h-6 w-px bg-rule hidden sm:block" />
          <button
            onClick={triggerPrint}
            className="flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-2 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 text-sm text-graphite hover:text-ink hover:bg-rule rounded-lg transition-colors"
            title="Print"
          >
            <Printer size={18} />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={triggerDownloadWord}
            disabled={exportingWord}
            className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3.5 text-sm font-medium text-ink bg-white border border-rule hover:border-pen/50 hover:bg-rule/30 rounded-lg transition-colors active:scale-95 disabled:opacity-60"
            title="Download editable Word (.docx) file"
          >
            {exportingWord ? (
              <Loader2 size={16} className="animate-spin text-pen" />
            ) : (
              <FileDown size={16} className="text-blue-600" />
            )}
            <span className="hidden sm:inline">Word</span>
          </button>
          <button
            onClick={triggerDownloadPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-4 text-sm font-medium text-white bg-ink hover:bg-ink rounded-lg transition-colors active:scale-95 disabled:opacity-60 disabled:active:scale-100"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            <span className="hidden xs:inline">PDF</span>
          </button>
        </div>
      </header>

      {/* School Admin review banner */}
      {schoolInfo?.isAdmin && paperStatus === "in_review" && (
        <div className="no-print shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-amber-900">
            <ShieldCheck size={16} className="text-amber-600 shrink-0" />
            <span><b>Coordinator Review:</b> This paper has been submitted for school approval.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setReviewVerdict("approved");
                setReviewFeedbackNote("");
                setShowReviewModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <CheckCircle2 size={13} /> Approve Paper
            </button>
            <button
              onClick={() => {
                setReviewVerdict("changes_requested");
                setReviewFeedbackNote(reviewFeedback || "");
                setShowReviewModal(true);
              }}
              className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <AlertCircle size={13} /> Request Changes
            </button>
          </div>
        </div>
      )}

      {/* Review feedback note for author */}
      {paperStatus === "changes_requested" && reviewFeedback && (
        <div className="no-print shrink-0 bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-center gap-2 text-sm text-rose-900">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span><b>Reviewer Feedback:</b> {reviewFeedback}</span>
        </div>
      )}

      {/* Unsent work found on this device, from a session the server never got. */}
      {recovered && (
        <div className="no-print shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2 px-3 sm:px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs sm:text-sm">
          <span className="flex-1 min-w-[12rem]">
            Unsaved changes from this phone were found —{" "}
            {recovered.questions.length} question
            {recovered.questions.length === 1 ? "" : "s"}. Restore them?
          </span>
          <button
            onClick={restoreRecovered}
            className="px-3 py-1.5 min-h-[36px] rounded-lg bg-ink text-white font-medium"
          >
            Restore
          </button>
          <button
            onClick={discardRecovered}
            className="px-3 py-1.5 min-h-[36px] rounded-lg text-amber-900 font-medium hover:bg-amber-100"
          >
            Discard
          </button>
        </div>
      )}

      {/* Save failures used to be a bare cloud icon on a phone — 13px of nothing. */}
      {saveState === "error" && (
        <div className="no-print shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2 px-3 sm:px-4 py-2.5 bg-red-50 border-b border-red-200 text-red-700 text-xs sm:text-sm">
          <CloudOff size={16} className="shrink-0" />
          <span className="flex-1 min-w-[12rem]">
            {loadFailed
              ? "Could not open this paper — check your connection."
              : "Not saved to your account yet. Your work is safe on this phone and we keep retrying."}
          </span>
          <button
            onClick={loadFailed ? () => window.location.reload() : retrySave}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border border-red-300 font-medium hover:bg-red-100"
          >
            <RotateCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* PDF export blocks on a rasterise that can take many seconds. */}
      {(exporting || exportError || notice) && (
        <div
          className={`no-print shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2 px-3 sm:px-4 py-2.5 border-b text-xs sm:text-sm ${
            exportError
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-ink/5 border-rule text-ink"
          }`}
          role="status"
        >
          {exporting && <Loader2 size={16} className="shrink-0 animate-spin" />}
          <span className="flex-1 min-w-[12rem]">
            {exportError ??
              (exporting ? "Making your PDF… this can take a few seconds." : notice)}
          </span>
          {(exportError || (notice && !exporting)) && (
            <button
              onClick={() => {
                setExportError(null);
                setNotice(null);
              }}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg border font-medium ${
                exportError
                  ? "border-red-300 hover:bg-red-100"
                  : "border-rule hover:bg-ink/10"
              }`}
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Settings Panel - Desktop inline / Mobile as full tab */}
      {showSettings && (
        <div className="bg-white border-b border-rule no-print shrink-0 hidden lg:block">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="mb-4">
              <label className="block text-xs font-medium text-graphite mb-1">
                Paper Language
              </label>
              <select
                value={settings.language}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    language: e.target.value as PaperLanguage,
                  }))
                }
                className="w-full max-w-xs px-3 py-2 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
              >
                {(Object.keys(PAPER_LANGUAGE_LABELS) as PaperLanguage[]).map((language) => (
                  <option key={language} value={language}>
                    {PAPER_LANGUAGE_LABELS[language]}
                  </option>
                ))}
              </select>
            </div>
            {itcOf(settings.language) != null && (
              <label className="flex items-center gap-2 mb-4 text-xs text-graphite cursor-pointer">
                <input
                  type="checkbox"
                  checked={translitOn}
                  onChange={(e) => setTranslitOn(e.target.checked)}
                  className="accent-ink"
                />
                Type in English letters — auto-convert to{" "}
                {PAPER_LANGUAGE_LABELS[settings.language]} (press space after each word)
              </label>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {settingsFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-graphite mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={settings[field.key]}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
                  />
                </div>
              ))}
            </div>
            {/* Header style picker */}
            <div className="mt-4 pt-3 border-t border-rule">
              <label className="block text-xs font-medium text-graphite mb-2">
                Header Design
              </label>
              <div className="flex gap-3">
                {(Object.keys(HEADER_STYLE_LABELS) as HeaderStyle[]).map((hs) => (
                  <button
                    key={hs}
                    onClick={() => setSettings((s) => ({ ...s, headerStyle: hs }))}
                    className={`style-thumb ${settings.headerStyle === hs ? "active" : ""}`}
                    style={{ width: 100, aspectRatio: "1.3" }}
                  >
                    <HeaderStyleThumb style={hs} />
                    <span className="text-[10px] font-medium text-graphite mt-1">
                      {HEADER_STYLE_LABELS[hs]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {/* Header layout — which detail sits where, row by row. Schools
                order these differently, so it is data rather than a fixed
                template. */}
            <div className="mt-4 pt-3 border-t border-rule">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <label className="block text-xs font-medium text-graphite">
                  Header Layout
                </label>
                <p className="text-[11px] text-graphite">
                  Each row prints left to right, spread across the page.
                </p>
              </div>
              <HeaderLayoutEditor
                rows={settings.headerRows?.length ? settings.headerRows : DEFAULT_HEADER_ROWS}
                onChange={(headerRows) => setSettings((s) => ({ ...s, headerRows }))}
              />
            </div>

            {/* Writing line style picker */}
            <div className="mt-4 pt-3 border-t border-rule">
              <label className="block text-xs font-medium text-graphite mb-2">
                Writing Lines
              </label>
              <div className="flex gap-3">
                {(Object.keys(LINE_STYLE_LABELS) as LineStyle[]).map((ls) => (
                  <button
                    key={ls}
                    onClick={() => setSettings((s) => ({ ...s, lineStyle: ls }))}
                    className={`style-thumb ${settings.lineStyle === ls ? "active" : ""}`}
                    style={{ width: 110, aspectRatio: "1.5" }}
                  >
                    <LineStyleThumb style={ls} />
                    <span className="text-[10px] font-medium text-graphite mt-1">
                      {LINE_STYLE_LABELS[ls]}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-graphite mt-1.5">
                Four-line ruling is for English handwriting practice. Hindi and Marathi usually use single-line ruling.
              </p>
              <label className="flex items-center gap-2 mt-3 text-xs text-graphite">
                <input
                  type="checkbox"
                  checked={settings.showAnswerSpace !== false}
                  onChange={(e) => setSettings((s) => ({ ...s, showAnswerSpace: e.target.checked }))}
                  className="h-4 w-4 accent-pen"
                />
                Print writing space on the question paper
              </label>
            </div>
            {/* Layout & density */}
            <div className="mt-4 pt-3 border-t border-rule">
              <label className="block text-xs font-semibold text-graphite mb-2.5">
                Layout &amp; Density
              </label>
              <LayoutControls
                settings={settings}
                onChange={(u) => setSettings((s) => ({ ...s, ...u }))}
              />
              <InstructionsPanel
                settings={settings}
                onChange={(u) => setSettings((s) => ({ ...s, ...u }))}
              />
              <AnswerKeyPanel
                settings={settings}
                questions={questions}
                onChange={(u) => setSettings((s) => ({ ...s, ...u }))}
                onSetAnswer={setAnswer}
                paperId={paperId || undefined}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor - show on desktop always, on mobile when tab is "editor" */}
        <div
          className={`${
            mobileTab === "editor" ? "flex" : "hidden"
          } lg:flex flex-col w-full lg:w-1/2 xl:w-[45%] border-r border-rule bg-white`}
        >
          {/* Question List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-24 lg:pb-4">
            {questions.length === 0 && (
              <div className="text-center py-16 sm:py-20">
                <div className="w-16 h-16 bg-ink/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText size={28} className="text-ink" />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">
                  No questions yet
                </h3>
                <p className="text-graphite mb-6 max-w-xs mx-auto text-sm sm:text-base">
                  Tap the + button to start adding questions to your paper.
                </p>
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={() => setShowScanModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-white rounded-xl font-medium hover:bg-ink transition-colors active:scale-95 text-base shadow-lg shadow-ink/20"
                  >
                    <ScanLine size={20} />
                    Scan handwritten paper
                  </button>
                  <button
                    onClick={() => setShowBankModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 border border-rule bg-white text-ink rounded-xl font-medium hover:border-pen/50 transition-colors active:scale-95 text-base"
                  >
                    <Library size={20} />
                    Pull from question bank
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowTypeModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-graphite hover:text-ink rounded-xl font-medium transition-colors active:scale-95 text-sm"
                    >
                      <Plus size={18} />
                      Add question
                    </button>
                    <span className="text-rule">•</span>
                    <button
                      onClick={addSectionHeader}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-pen hover:underline rounded-xl font-medium transition-colors active:scale-95 text-sm"
                    >
                      <Heading size={16} />
                      Add section
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {(() => {
                let qNumber = 0;
                return questions.map((q, qi) => {
                  const isStructural = isStructuralQuestion(q);
                  if (!isStructural) qNumber += 1;
                  return (
                    <QuestionRow
                      key={q.id}
                      question={q}
                      number={isStructural ? 0 : qNumber}
                      isExpanded={expandedQ === q.id}
                      isFirst={qi === 0}
                      isLast={qi === questions.length - 1}
                      isRegenerating={regeneratingId === q.id}
                      onToggle={toggleExpanded}
                      onUpdate={updateQuestion}
                      onDelete={deleteQuestion}
                      onDuplicate={duplicateQuestion}
                      onRegenerate={regenerateQuestion}
                      onMove={moveQuestion}
                      onAddSubItem={addSubItem}
                      onUpdateSubItem={updateSubItem}
                      onRemoveSubItem={removeSubItem}
                    />
                  );
                });
              })()}
            </div>

            {questions.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setShowTypeModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 border-2 border-dashed border-rule text-graphite rounded-xl hover:border-ink hover:text-ink transition-colors font-medium active:scale-[0.98]"
                >
                  <Plus size={18} />
                  Add Question
                </button>
                <button
                  onClick={addSectionHeader}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 border-2 border-dashed border-pen/30 text-pen bg-pen/5 rounded-xl hover:border-pen hover:bg-pen/10 transition-colors font-medium active:scale-[0.98]"
                  title="Insert a section title/divider (e.g. Section A: Objective Questions)"
                >
                  <Heading size={18} />
                  Add Section
                </button>
                <button
                  onClick={() => setShowBankModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 border-2 border-dashed border-pen/30 text-ink rounded-xl hover:border-pen transition-colors font-medium active:scale-[0.98]"
                >
                  <Library size={18} />
                  From bank
                </button>
                <button
                  onClick={() => setShowScanModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 border-2 border-dashed border-ink/20 bg-ink/5/50 text-ink rounded-xl hover:border-ink transition-colors font-medium active:scale-[0.98]"
                >
                  <ScanLine size={18} />
                  Scan more
                </button>
              </div>
            )}

            {/* Non-intrusive ad slot for free tier teachers — completely outside paper canvas and print DOM */}
            {!isPaid && (
              <div className="pt-4 border-t border-rule/60 mt-6 no-print">
                <AdBanner
                  slot={process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT}
                  format="auto"
                  isPaid={isPaid}
                  label="Sponsored Advertisement"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview - show on desktop always, on mobile when tab is "preview" */}
        <div
          className={`${
            mobileTab === "preview" ? "flex" : "hidden"
          } lg:flex flex-col flex-1 bg-rule overflow-hidden`}
        >
          <div className="px-3 sm:px-4 py-2 bg-paper border-b border-rule flex items-center justify-between gap-2 shrink-0">
            <span className="text-sm font-medium text-graphite shrink-0">
              Live Preview
            </span>
            <div className="flex items-center gap-2 min-w-0">
              {/* Counts stay live — they are cheap, unlike the page itself. */}
              <span className="text-xs text-graphite truncate">
                {questions.length} q · {questions.reduce((sum, q) => sum + q.marks, 0)} marks
              </span>
              {/* Fit shows the true printed geometry; Read renders at full size
                  so the text is legible on a phone. */}
              <div className="lg:hidden flex rounded-lg border border-rule bg-white p-0.5 overflow-hidden shrink-0">
                <button
                  onClick={() => setPreviewMode("read")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    previewMode === "read"
                      ? "bg-ink text-white"
                      : "text-graphite hover:text-ink"
                  }`}
                >
                  📱 Reading View
                </button>
                <button
                  onClick={() => setPreviewMode("fit")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    previewMode === "fit"
                      ? "bg-ink text-white"
                      : "text-graphite hover:text-ink"
                  }`}
                >
                  📄 Print A4
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6">
            {showPreview && (
              <ScaledPaper fit={previewMode === "fit"} remeasureKey={`${mobileTab}:${previewContentKey}`}>
                <div
                  className="paper-container"
                  style={{ width: "210mm", minHeight: "297mm" }}
                >
                  <PageGuides
                    margin={trailing.settings.margin}
                    contentKey={previewContentKey}
                  >
                    <PrintPreview
                      settings={trailing.settings}
                      questions={trailing.questions}
                      watermark={watermark}
                    />
                  </PageGuides>
                </div>
              </ScaledPaper>
            )}
          </div>
        </div>

        {/* Mobile Settings Tab */}
        <div
          className={`${
            mobileTab === "settings" ? "flex" : "hidden"
          } lg:hidden flex-col w-full bg-white overflow-y-auto`}
        >
          <div className="p-4 pb-24">
            <h2 className="text-lg font-semibold text-ink mb-4">Paper Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-graphite mb-1.5">
                  Paper Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      language: e.target.value as PaperLanguage,
                    }))
                  }
                  className="w-full px-4 py-3 border border-rule rounded-xl text-base focus:ring-2 focus:ring-ink focus:border-ink outline-none"
                >
                  {(Object.keys(PAPER_LANGUAGE_LABELS) as PaperLanguage[]).map((language) => (
                    <option key={language} value={language}>
                      {PAPER_LANGUAGE_LABELS[language]}
                    </option>
                  ))}
                </select>
              </div>
              {itcOf(settings.language) != null && (
                <label className="flex items-center gap-2 text-sm text-graphite cursor-pointer">
                  <input
                    type="checkbox"
                    checked={translitOn}
                    onChange={(e) => setTranslitOn(e.target.checked)}
                    className="accent-ink"
                  />
                  Type in English letters — auto-convert to{" "}
                  {PAPER_LANGUAGE_LABELS[settings.language]}
                </label>
              )}
              {/* Eight fields the teacher fills once and rarely reopens. Folded
                  away so the screen starts on the things she came here for. */}
              <details className="group border border-rule rounded-xl">
                <summary className="flex items-center justify-between gap-2 px-4 py-3 min-h-[44px] text-sm font-medium text-ink cursor-pointer select-none">
                  School &amp; exam details
                  <ChevronDown
                    size={16}
                    className="text-graphite shrink-0 transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="px-4 pb-4 space-y-4">
                  {settingsFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-graphite mb-1.5">
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        value={settings[field.key]}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 border border-rule rounded-xl text-base focus:ring-2 focus:ring-ink focus:border-ink outline-none"
                      />
                    </div>
                  ))}
                </div>
              </details>
            </div>

            {/* Header Design Picker - Mobile */}
            <div className="mt-6 pt-4 border-t border-rule">
              <h3 className="text-sm font-semibold text-ink mb-3">Header Design</h3>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(HEADER_STYLE_LABELS) as HeaderStyle[]).map((hs) => (
                  <button
                    key={hs}
                    onClick={() => setSettings((s) => ({ ...s, headerStyle: hs }))}
                    className={`style-thumb ${settings.headerStyle === hs ? "active" : ""}`}
                  >
                    <HeaderStyleThumb style={hs} />
                    <span className="text-[10px] font-medium text-graphite mt-1">
                      {HEADER_STYLE_LABELS[hs]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Header Layout - Mobile. The editor is already responsive; it was
                simply sitting inside the desktop-only settings panel, so on a
                phone there was no way to reorder the header at all. */}
            <div className="mt-6 pt-4 border-t border-rule">
              <h3 className="text-sm font-semibold text-ink mb-1">Header Layout</h3>
              <p className="text-[11px] text-graphite mb-3">
                Each row prints left to right, spread across the page.
              </p>
              <HeaderLayoutEditor
                rows={settings.headerRows?.length ? settings.headerRows : DEFAULT_HEADER_ROWS}
                onChange={(headerRows) => setSettings((s) => ({ ...s, headerRows }))}
              />
            </div>

            {/* Writing Lines Picker - Mobile */}
            <div className="mt-6 pt-4 border-t border-rule">
              <h3 className="text-sm font-semibold text-ink mb-3">Writing Lines</h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(LINE_STYLE_LABELS) as LineStyle[]).map((ls) => (
                  <button
                    key={ls}
                    onClick={() => setSettings((s) => ({ ...s, lineStyle: ls }))}
                    className={`style-thumb ${settings.lineStyle === ls ? "active" : ""}`}
                  >
                    <LineStyleThumb style={ls} />
                    <span className="text-[10px] font-medium text-graphite mt-1">
                      {LINE_STYLE_LABELS[ls]}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-graphite mt-2">
                Four-line ruling is for English handwriting practice. Hindi and Marathi usually use single-line ruling.
              </p>
            </div>

            {/* Layout & Density - Mobile */}
            <div className="mt-6 pt-4 border-t border-rule">
              <h3 className="text-sm font-semibold text-ink mb-3">Layout &amp; Density</h3>
              <LayoutControls
                settings={settings}
                onChange={(u) => setSettings((s) => ({ ...s, ...u }))}
              />
              <InstructionsPanel
                settings={settings}
                onChange={(u) => setSettings((s) => ({ ...s, ...u }))}
              />
              <AnswerKeyPanel
                settings={settings}
                questions={questions}
                onChange={(u) => setSettings((s) => ({ ...s, ...u }))}
                onSetAnswer={setAnswer}
                paperId={paperId || undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar - Strictly fixed to device viewport bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-rule no-print pb-[max(0.35rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around px-2 py-1.5">
          <button
            onClick={() => setMobileTab("editor")}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 min-h-[48px] rounded-xl transition-colors ${
              mobileTab === "editor"
                ? "text-ink bg-ink/10 font-semibold"
                : "text-graphite hover:text-ink"
            }`}
          >
            <PenLine size={20} />
            <span className="text-xs">Edit</span>
          </button>
          <button
            onClick={() => setMobileTab("preview")}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 min-h-[48px] rounded-xl transition-colors ${
              mobileTab === "preview"
                ? "text-ink bg-ink/10 font-semibold"
                : "text-graphite hover:text-ink"
            }`}
          >
            <Eye size={20} />
            <span className="text-xs">Preview</span>
          </button>
          <button
            onClick={() => setShowTypeModal(true)}
            className="flex flex-col items-center justify-center w-14 h-14 -mt-5 shrink-0 bg-ink text-white rounded-full shadow-lg shadow-ink/30 active:scale-95 transition-transform"
            title="Add a new question"
          >
            <Plus size={28} />
          </button>
          <button
            onClick={() => setMobileTab("settings")}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 min-h-[48px] rounded-xl transition-colors ${
              mobileTab === "settings"
                ? "text-ink bg-ink/10 font-semibold"
                : "text-graphite hover:text-ink"
            }`}
          >
            <Settings size={20} />
            <span className="text-xs">Settings</span>
          </button>
          <button
            onClick={triggerShare}
            disabled={exporting}
            className="flex flex-col items-center justify-center gap-1 px-2.5 py-1.5 min-h-[48px] rounded-xl transition-colors text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50"
            title="Share PDF on WhatsApp or download"
          >
            {exporting ? (
              <Loader2 size={20} className="animate-spin text-emerald-700" />
            ) : (
              <Share2 size={20} />
            )}
            <span className="text-xs font-semibold">Share PDF</span>
          </button>
        </div>
      </div>

      {/* The one and only source for Print and PDF. It used to be the visible
          preview, which below lg is display:none on every tab but Preview — so
          the default Edit tab exported a zero-height element and the teacher got
          a blank file. Parked off-viewport at true A4 width instead: always
          laid out, and clear of ScaledPaper's transform, which was distorting
          the capture even when it did work. It is also what Print sends to the
          printer, via the #print-area rules in globals.css.

          The page box is a per-paper setting, so it cannot live in globals.css.
          The sheet carries its margin as padding and @page adds its own, so the
          padding is dropped for print — the same doubling the PDF export undoes. */}
      <style>{`@media print {
        @page { size: A4; margin: ${MARGIN_VALUES[settings.margin].print}; }
        #print-area .paper-preview { padding: 0 !important; }
      }`}</style>
      <div
        id="print-area"
        aria-hidden
        className="fixed left-[-10000px] top-0 w-[210mm] pointer-events-none"
      >
        <div ref={printRef}>
          <PrintPreview
            settings={settings}
            questions={questions}
            watermark={watermark}
          />
        </div>
      </div>

      {/* Scan handwritten paper modal */}
      {showScanModal && (
        <ScanModal
          onClose={() => setShowScanModal(false)}
          onScanned={applyScanned}
          paperId={paperId ?? undefined}
        />
      )}

      {/* Pull questions from the bank (unit + marks, least-used first) */}
      {showBankModal && (
        <BankPickerModal
          onClose={() => setShowBankModal(false)}
          onPick={applyFromBank}
        />
      )}

      {/* Question Type Modal - mobile optimized as bottom sheet */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85dvh] sm:max-h-[80dvh] overflow-hidden sm:mx-4">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-rule">
              <h2 className="text-lg font-semibold text-ink">
                Choose Question Type
              </h2>
              <button
                onClick={closeTypeModal}
                className="p-2 hover:bg-rule rounded-xl transition-colors active:bg-rule"
              >
                <X size={22} className="text-graphite" />
              </button>
            </div>
            {/* Drag handle for mobile */}
            <div className="flex justify-center py-2 sm:hidden">
              <div className="w-10 h-1 bg-rule rounded-full" />
            </div>
            {/* The type grid is the sheet's last row — keep it out of the
                Android gesture strip. */}
            <div className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] overflow-y-auto max-h-[65dvh] sm:max-h-[60dvh]">
              {/* Shortcuts first — adding more scanned pages to a paper already
                  in progress was previously only reachable from the desktop
                  toolbar, so on a phone there was no way back to the scanner. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 pb-3 border-b border-rule">
                <button
                  onClick={() => {
                    setShowTypeModal(false);
                    setShowScanModal(true);
                  }}
                  className="flex items-center gap-3 p-4 border border-ink/25 bg-ink/[0.03] rounded-xl hover:border-ink hover:bg-ink/5 active:bg-ink/10 transition-all text-left group"
                >
                  <div className="w-11 h-11 bg-ink/10 rounded-xl flex items-center justify-center text-ink shrink-0">
                    <ScanLine size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-ink text-sm">Scan more pages</div>
                    <div className="text-[11px] text-graphite">
                      Photograph another page — questions are added to this paper
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowTypeModal(false);
                    setShowBankModal(true);
                  }}
                  className="flex items-center gap-3 p-4 border border-rule rounded-xl hover:border-ink hover:bg-ink/5 active:bg-ink/10 transition-all text-left group"
                >
                  <div className="w-11 h-11 bg-rule rounded-xl flex items-center justify-center text-graphite group-hover:text-ink shrink-0">
                    <Library size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-ink text-sm">From question bank</div>
                    <div className="text-[11px] text-graphite">
                      Pull saved questions by unit and marks
                    </div>
                  </div>
                </button>
              </div>

              {/* Category tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
                {QUESTION_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setTypeCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                      typeCategory === cat.id
                        ? "bg-ink text-white shadow-xs"
                        : "bg-rule/40 text-graphite hover:text-ink hover:bg-rule"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grid of question types for selected category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {(QUESTION_CATEGORIES.find((c) => c.id === typeCategory)?.types || []).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => {
                        addQuestion(type);
                        setMobileTab("editor");
                      }}
                      className="flex items-start gap-3 p-3.5 border border-rule/80 bg-white rounded-xl hover:border-ink hover:bg-ink/[0.02] active:bg-ink/[0.06] transition-all text-left group min-h-[60px]"
                    >
                      <div className="w-10 h-10 bg-pen/10 text-pen group-hover:bg-ink group-hover:text-white rounded-xl flex items-center justify-center transition-colors shrink-0 mt-0.5">
                        {QUESTION_TYPE_ICON_MAP[type]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-ink text-sm sm:text-base leading-tight">
                          {QUESTION_TYPE_LABELS[type]}
                        </div>
                        {QUESTION_DESCRIPTIONS[type] && (
                          <div className="text-xs text-graphite mt-0.5 leading-snug line-clamp-2">
                            {QUESTION_DESCRIPTIONS[type]}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sits above the builder, and stands aside while a sheet it opened is
          on screen so the teacher is never looking at two layers at once. */}
      {wizardOpen && !showScanModal && !showTypeModal && !showGenerateModal && questions.length === 0 && (
        <StartWizard
          settings={settings}
          onPatch={(patch) => setSettings((s) => ({ ...s, ...patch }))}
          questionCount={questions.length}
          onScan={() => {
            setShowScanModal(true);
            setWizardOpen(false);
          }}
          onAddQuestion={() => {
            setShowTypeModal(true);
            setWizardOpen(false);
          }}
          onGenerateAI={() => {
            setShowGenerateModal(true);
            setWizardOpen(false);
          }}
          onDownload={triggerDownloadPDF}
          onShare={triggerShare}
          exporting={exporting}
          onFinish={() => {
            setWizardOpen(false);
            setMobileTab("preview");
          }}
        />
      )}

      {/* 5-second AdSense Interstitial Modal for Free Teachers */}
      <DownloadAdModal
        isOpen={downloadModalFormat !== null}
        format={downloadModalFormat || "pdf"}
        paperTitle={settings.assessmentTitle || settings.subject || "Exam Paper"}
        isPaid={isPaid}
        onClose={() => setDownloadModalFormat(null)}
        onComplete={() => {
          const fmt = downloadModalFormat;
          setDownloadModalFormat(null);
          if (fmt === "pdf") handleDownloadPDF();
          else if (fmt === "docx") handleDownloadWord();
          else if (fmt === "share") handleShare();
          else if (fmt === "print") handlePrint();
        }}
      />
      {showGenerateModal && (
        <GeneratePaperModal
          onClose={() => setShowGenerateModal(false)}
          onGenerated={handleGeneratedPaper}
        />
      )}
      {feedbackPrompt.open && (
        <GenerationFeedbackModal
          onClose={() => {
            setFeedbackPrompt((p) => ({ ...p, open: false }));
            try {
              sessionStorage.setItem("papergen_feedback_dismissed", "true");
            } catch {}
          }}
          method={feedbackPrompt.method}
          paperId={paperId}
        />
      )}
      {showSetBModal && (
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
                onClick={() => setShowSetBModal(false)}
                disabled={generatingSetB}
                className="text-graphite hover:text-ink p-1 disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm">
              <p className="text-xs text-graphite leading-relaxed">
                Generates a parallel test based on{" "}
                <strong className="text-ink">{settings.assessmentTitle || "this paper"}</strong>. It
                maintains the exact same sections, question types, and mark distribution, but
                generates completely fresh questions to prevent cheating.
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
                  <span className="text-emerald-700 font-bold text-sm">1 Paper</span>
                </div>
                <p className="text-graphite text-[11px] leading-relaxed">
                  Generates an entirely new parallel set to prevent cheating. Once created, downloading and editing is 100% free.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-rule flex items-center justify-end gap-2">
              <button
                onClick={() => setShowSetBModal(false)}
                disabled={generatingSetB}
                className="px-3 py-2 text-xs font-semibold text-graphite hover:text-ink rounded-lg disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateSetB}
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

      {/* Review verdict modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl border border-rule p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rule">
              <div className="flex items-center gap-2">
                {reviewVerdict === "approved" ? (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                ) : (
                  <AlertCircle size={18} className="text-rose-600" />
                )}
                <h3 className="font-semibold text-ink text-sm">
                  {reviewVerdict === "approved" ? "Approve Exam Paper" : "Request Changes"}
                </h3>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-graphite hover:text-ink p-1 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-graphite">
              {reviewVerdict === "approved"
                ? "Approving marks this exam paper as verified and ready for school printing."
                : "The teacher will see your review feedback and can adjust their questions before resubmitting."}
            </p>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                {reviewVerdict === "approved" ? "Approval note (optional)" : "Required changes / feedback"}
              </label>
              <textarea
                value={reviewFeedbackNote}
                onChange={(e) => setReviewFeedbackNote(e.target.value)}
                placeholder={
                  reviewVerdict === "approved"
                    ? "e.g. Looks good, approved for Term 1 print run."
                    : "e.g. Please replace Q3 with a 3-mark word problem from Chapter 4."
                }
                rows={3}
                className="w-full text-xs p-2.5 border border-rule rounded-lg focus:border-pen outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-rule">
              <button
                onClick={() => setShowReviewModal(false)}
                disabled={submittingReview}
                className="px-3 py-2 text-xs font-semibold text-graphite hover:text-ink rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAdminReview}
                disabled={submittingReview || (reviewVerdict === "changes_requested" && !reviewFeedbackNote.trim())}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors disabled:opacity-50 ${
                  reviewVerdict === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {submittingReview ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : reviewVerdict === "approved" ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <AlertCircle size={13} />
                )}
                {reviewVerdict === "approved" ? "Confirm Approval" : "Send Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save as School Template modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl border border-rule p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rule">
              <div className="flex items-center gap-2">
                <BookmarkPlus size={18} className="text-pen" />
                <h3 className="font-semibold text-ink text-sm">Save as School Template</h3>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-graphite hover:text-ink p-1 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-graphite">
              Publish this paper&apos;s header format, sections, and question structure to your school library so other teachers can create matching papers in one click.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Template Title
                </label>
                <input
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  placeholder="e.g. CBSE Term 1 Examination (80 Marks)"
                  className="w-full text-xs p-2.5 border border-rule rounded-lg focus:border-pen outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Description (optional)
                </label>
                <input
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="e.g. Standard 3-hour blueprint: 20 MCQs, 5 short answers, 3 word problems."
                  className="w-full text-xs p-2.5 border border-rule rounded-lg focus:border-pen outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-rule">
              <button
                onClick={() => setShowTemplateModal(false)}
                disabled={savingTemplate}
                className="px-3 py-2 text-xs font-semibold text-graphite hover:text-ink rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsTemplate}
                disabled={savingTemplate || !templateTitle.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-pen text-white rounded-lg hover:bg-ink transition-colors disabled:opacity-50"
              >
                {savingTemplate ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <BookmarkPlus size={13} />
                )}
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </TranslitProvider>
  );
}

/* ===== Layout & Density Controls ===== */

// Generic segmented pill control.
function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-graphite mb-1.5">{label}</label>
      <div className="inline-flex flex-wrap rounded-lg border border-rule bg-paper p-0.5 gap-0.5">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-2.5 min-h-[44px] text-sm lg:py-1.5 lg:min-h-0 lg:text-xs font-medium rounded-md transition-colors ${
              value === opt.value
                ? "bg-ink text-white shadow-sm"
                : "text-graphite hover:bg-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// The stored density values are mechanism names; a teacher picks an outcome.
const DENSITY_CHOICES: { value: Density; label: string }[] = [
  { value: "comfortable", label: "Roomy" },
  { value: "compact", label: "Normal" },
  { value: "ultra", label: "Tight" },
];

function LayoutControls({
  settings,
  onChange,
}: {
  settings: PaperSettings;
  onChange: (updates: Partial<PaperSettings>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Segmented<Density>
        label="Fit more on a page"
        value={settings.density}
        onChange={(v) => onChange({ density: v })}
        options={DENSITY_CHOICES}
      />
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <Segmented<PageColumns>
          label="Columns"
          value={settings.pageColumns}
          onChange={(v) => onChange({ pageColumns: v })}
          options={[
            { value: 1, label: "One column" },
            { value: 2, label: "Two columns" },
          ]}
        />
        <Segmented<PageMargin>
          label="Margins"
          value={settings.margin}
          onChange={(v) => onChange({ margin: v })}
          options={(Object.keys(MARGIN_LABELS) as PageMargin[]).map((m) => ({
            value: m,
            label: MARGIN_LABELS[m],
          }))}
        />
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-4 items-end">
        <Segmented<FontFamily>
          label="Font"
          value={settings.fontFamily}
          onChange={(v) => onChange({ fontFamily: v })}
          options={(Object.keys(FONT_FAMILY_LABELS) as FontFamily[]).map((f) => ({
            value: f,
            label: FONT_FAMILY_LABELS[f],
          }))}
        />
        <div>
          <label className="block text-xs font-medium text-graphite mb-1.5">
            Font size (pt)
          </label>
          <div className="inline-flex items-center gap-1">
            <button
              onClick={() => onChange({ fontSize: Math.max(8, settings.fontSize - 0.5) })}
              className="w-11 h-11 lg:w-8 lg:h-8 rounded-lg border border-rule text-graphite hover:bg-rule font-bold"
            >
              −
            </button>
            <input
              type="number"
              value={settings.fontSize}
              step={0.5}
              min={8}
              max={18}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
              className="w-16 lg:w-14 text-center px-2 py-2 min-h-[44px] lg:min-h-0 lg:py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
            />
            <button
              onClick={() => onChange({ fontSize: Math.min(18, settings.fontSize + 0.5) })}
              className="w-11 h-11 lg:w-8 lg:h-8 rounded-lg border border-rule text-graphite hover:bg-rule font-bold"
            >
              +
            </button>
          </div>
        </div>
      </div>
      {/* The tip this replaces asked the teacher to assemble the answer out of
          three separate controls. */}
      <div>
        <button
          onClick={() =>
            onChange({ density: "ultra", pageColumns: 2, margin: "narrow" })
          }
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] lg:min-h-0 lg:py-2 border border-ink/25 text-ink font-medium rounded-lg text-sm hover:bg-ink/5 active:scale-[0.98] transition-colors"
        >
          <LayoutGrid size={16} />
          Fit on one page
        </button>
        <p className="text-[11px] text-graphite mt-1.5">
          Sets tight spacing, two columns and narrow margins together.
        </p>
      </div>

      <div className="pt-2 border-t border-rule">
        <label className="flex items-center gap-2 text-xs text-graphite cursor-pointer select-none">
          <input
            type="checkbox"
            checked={settings.mcqOptionBox === true}
            onChange={(e) => onChange({ mcqOptionBox: e.target.checked })}
            className="h-4 w-4 accent-pen rounded"
          />
          Show answer checkboxes (□) next to MCQ options
        </label>
      </div>
    </div>
  );
}

/* ===== Line Style Thumbnail ===== */

function LineStyleThumb({ style }: { style: LineStyle }) {
  if (style === "four-line") {
    // English handwriting ruling: red / blue / blue / red band, repeated.
    const band = (key: number) => (
      <div key={key} className="flex flex-col w-full" style={{ gap: 3 }}>
        <div style={{ height: 1, background: "#e11d48" }} />
        <div style={{ height: 1, background: "#3b82f6" }} />
        <div style={{ height: 1, background: "#3b82f6" }} />
        <div style={{ height: 1, background: "#e11d48" }} />
      </div>
    );
    return (
      <div className="flex flex-col items-center w-full px-3" style={{ gap: 6 }}>
        {[0, 1].map(band)}
      </div>
    );
  }
  // Single line ruling.
  return (
    <div className="flex flex-col items-center w-full px-3" style={{ gap: 6 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ width: "100%", height: 1, background: "#475569" }} />
      ))}
    </div>
  );
}

/* ===== Header Style Thumbnails ===== */

function HeaderStyleThumb({ style }: { style: HeaderStyle }) {
  const line = (w: string) => (
    <div style={{ width: w, height: 2, background: "#94a3b8", borderRadius: 1 }} />
  );
  const thickLine = (w: string) => (
    <div style={{ width: w, height: 3, background: "#64748b", borderRadius: 1 }} />
  );

  switch (style) {
    case "clean":
      return (
        <div className="flex flex-col items-center gap-[3px] w-full px-2">
          {thickLine("70%")}
          {line("50%")}
          {line("30%")}
          <div style={{ width: "90%", height: 1, background: "#cbd5e1", marginTop: 2 }} />
        </div>
      );
    case "boxed":
      return (
        <div className="flex flex-col items-center gap-[3px] w-full px-2">
          <div style={{ border: "1.5px solid #64748b", padding: "4px 8px", width: "80%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            {thickLine("80%")}
            {line("60%")}
            {line("40%")}
          </div>
        </div>
      );
    case "double-border":
      return (
        <div className="flex flex-col items-center gap-[3px] w-full px-2">
          <div style={{ border: "3px double #64748b", padding: "4px 8px", width: "80%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            {thickLine("80%")}
            {line("60%")}
            {line("40%")}
          </div>
        </div>
      );
    case "formal":
      return (
        <div className="flex flex-col items-center gap-[3px] w-full px-2">
          <div style={{ borderTop: "3px solid #64748b", borderBottom: "1px solid #94a3b8", padding: "4px 0", width: "90%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            {thickLine("70%")}
            {line("50%")}
            {line("30%")}
          </div>
          <div style={{ borderTop: "1px solid #94a3b8", borderBottom: "3px solid #64748b", width: "90%", height: 3 }} />
        </div>
      );
    case "rounded":
      return (
        <div className="flex flex-col items-center gap-[3px] w-full px-2">
          <div style={{ border: "1.5px solid #64748b", borderRadius: 6, padding: "4px 8px", width: "80%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            {thickLine("80%")}
            {line("60%")}
            {line("40%")}
          </div>
        </div>
      );
    case "banner":
      return (
        <div className="flex flex-col items-center gap-0 w-full px-2">
          <div style={{ background: "#334155", padding: "3px 8px", width: "80%", display: "flex", justifyContent: "center" }}>
            <div style={{ width: "70%", height: 2, background: "#e2e8f0", borderRadius: 1 }} />
          </div>
          <div style={{ border: "1px solid #64748b", borderTop: "none", padding: "3px 8px", width: "80%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            {line("60%")}
            {line("40%")}
          </div>
        </div>
      );
    default:
      return null;
  }
}

/* ===== Question Card Component ===== */

/* ===== Question row (memoised) ===== */

// One keystroke re-rendered every card in the list, which is most of what made
// typing feel laggy on a phone. This wrapper takes only stable handlers and the
// question object, so React can skip every card but the one being edited; the
// per-question closures QuestionCard wants are built inside the memo boundary.
const QuestionRow = memo(function QuestionRow({
  question,
  number,
  isExpanded,
  isFirst,
  isLast,
  isRegenerating,
  onToggle,
  onUpdate,
  onDelete,
  onDuplicate,
  onRegenerate,
  onMove,
  onAddSubItem,
  onUpdateSubItem,
  onRemoveSubItem,
}: {
  question: Question;
  number: number;
  isExpanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  isRegenerating?: boolean;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Question>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRegenerate?: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onAddSubItem: (id: string, content?: string) => void;
  onUpdateSubItem: (id: string, itemId: string, updates: Partial<SubItem>) => void;
  onRemoveSubItem: (id: string, itemId: string) => void;
}) {
  const id = question.id;
  return (
    <QuestionCard
      question={question}
      number={number}
      isExpanded={isExpanded}
      isRegenerating={isRegenerating}
      onToggle={() => onToggle(id)}
      onUpdate={(updates) => onUpdate(id, updates)}
      onDelete={() => onDelete(id)}
      onDuplicate={() => onDuplicate(id)}
      onRegenerate={onRegenerate ? () => onRegenerate(id) : undefined}
      onMoveUp={() => onMove(id, -1)}
      onMoveDown={() => onMove(id, 1)}
      isFirst={isFirst}
      isLast={isLast}
      onAddSubItem={(content) => onAddSubItem(id, content)}
      onUpdateSubItem={(itemId, updates) => onUpdateSubItem(id, itemId, updates)}
      onRemoveSubItem={(itemId) => onRemoveSubItem(id, itemId)}
    />
  );
});

interface QuestionCardProps {
  question: Question;
  number: number;
  isExpanded: boolean;
  isRegenerating?: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<Question>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRegenerate?: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  onAddSubItem: (content?: string) => void;
  onUpdateSubItem: (itemId: string, updates: Partial<SubItem>) => void;
  onRemoveSubItem: (itemId: string) => void;
}

function QuestionCard({
  question: q,
  number,
  isExpanded,
  isRegenerating,
  onToggle,
  onUpdate,
  onDelete,
  onDuplicate,
  onRegenerate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onAddSubItem,
  onUpdateSubItem,
  onRemoveSubItem,
}: QuestionCardProps) {
  const isStructural = isStructuralQuestion(q);

  return (
    <div
      className={`border rounded-xl transition-all ${
        isStructural
          ? "border-pen/30 bg-pen/[0.015]"
          : isExpanded
          ? "border-ink/40 shadow-md shadow-ink/5"
          : "border-rule hover:border-rule"
      }`}
    >
      {/* Collapsed header */}
      <div
        className="flex items-center gap-2 px-3 py-3 cursor-pointer select-none"
        onClick={onToggle}
      >
        <GripVertical size={16} className="text-rule shrink-0" />
        {isStructural ? (
          <div className="px-2 py-1 bg-pen/10 text-pen border border-pen/20 rounded-lg flex items-center gap-1 shrink-0">
            <Heading size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Section</span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-ink/10 rounded-lg flex items-center justify-center text-ink shrink-0">
            <span className="text-xs sm:text-sm font-bold">Q{number}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className={`text-sm sm:text-base ${isStructural ? "font-bold text-pen" : "font-semibold text-ink"} truncate block`}>
            {q.title || (isStructural ? "Untitled Section" : "Untitled Question")}
          </span>
          <span className="text-xs text-graphite">
            {isStructural
              ? "Section Header (0 Marks — Divider)"
              : `${QUESTION_TYPE_LABELS[q.type]} · ${q.marks} Marks · ${(q.items?.length ?? 0)} item${(q.items?.length ?? 0) !== 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {!isStructural && onRegenerate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              disabled={isRegenerating}
              title="Regenerate question with AI"
              className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-pen/10 text-pen rounded disabled:opacity-30"
            >
              {isRegenerating ? (
                <Loader2 size={14} className="animate-spin text-pen" />
              ) : (
                <Sparkles size={14} />
              )}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={isFirst}
            className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-rule rounded disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronUp size={14} className="text-graphite" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={isLast}
            className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-rule rounded disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronDown size={14} className="text-graphite" />
          </button>
          <ChevronRight
            size={16}
            className={`text-graphite transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-rule">
          {/* Title & Marks */}
          <div className="grid grid-cols-[1fr_80px] gap-3 mt-3">
            <div>
              <label className="block text-xs font-semibold text-graphite mb-1">
                {isStructural ? "Section Title / Heading" : "Question Title / Instruction"}
              </label>
              <TranslitInput
                value={q.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder={isStructural ? "e.g. Section A: Multiple Choice Questions (1 mark each)" : ""}
                className="w-full px-3.5 py-2.5 min-h-[46px] border border-rule rounded-lg text-base focus:ring-2 focus:ring-ink focus:border-ink outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-graphite mb-1">
                Marks
              </label>
              <input
                type="number"
                value={q.marks}
                onChange={(e) => onUpdate({ marks: Number(e.target.value) })}
                className="w-full px-3 py-2.5 min-h-[46px] border border-rule rounded-lg text-base font-semibold focus:ring-2 focus:ring-ink focus:border-ink outline-none disabled:opacity-50 text-center"
                min={0}
                disabled={isStructural}
              />
            </div>
          </div>
          {!isStructural && (
            <div className="mt-2">
              <label className="block text-xs font-medium text-graphite mb-1">
                Hints / Help Box / Bracket words (optional — prints below question heading in normal, smaller font):
              </label>
              <TranslitInput
                value={q.hints ?? ""}
                onChange={(e) => onUpdate({ hints: e.target.value || undefined })}
                placeholder="e.g. (sweets and gifts, diyas and candles, lights) or [Help box: apple, banana]"
                className="w-full px-3 py-1.5 border border-rule rounded-lg text-xs text-ink focus:ring-2 focus:ring-ink focus:border-ink outline-none"
              />
            </div>
          )}
          {isStructural && (
            <div className="mt-2.5 text-xs text-graphite bg-rule/20 p-2.5 rounded-lg border border-rule/50">
              <span className="font-semibold text-ink">Section Divider:</span> Prints as a bold heading on the paper with no question number or marks in the margin.
            </div>
          )}

          {/* Type-specific editor */}
          <div className="mt-3">
            {q.type === "fill-blanks" && (
              <FillBlanksEditor
                items={q.items}
                columns={q.columnsPerRow || 1}
                onColumnsChange={(c) => onUpdate({ columnsPerRow: c })}
                blankLineStyle={q.blankLineStyle || "inline"}
                blankLines={q.blankLines || 1}
                hideItemNumbering={q.hideItemNumbering}
                onBlankLineStyleChange={(s) => onUpdate({ blankLineStyle: s })}
                onBlankLinesChange={(n) => onUpdate({ blankLines: n })}
                onHideItemNumberingChange={(h) => onUpdate({ hideItemNumbering: h })}
                onAdd={onAddSubItem}
                onUpdate={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {(q.type === "short-answer" || q.type === "long-answer") && !isStructural && (
              <AnswerEditor
                items={q.items}
                isLong={q.type === "long-answer"}
                columns={q.columnsPerRow || 1}
                answerLinePlacement={
                  q.answerLinePlacement ??
                  ((q.columnsPerRow && q.columnsPerRow > 1) ||
                  (q.items?.length > 0 && q.items.every((it) => (it.content || "").length <= 35))
                    ? "inline"
                    : "below")
                }
                onColumnsChange={(c) => onUpdate({ columnsPerRow: c })}
                onPlacementChange={(p) => onUpdate({ answerLinePlacement: p })}
                onAdd={onAddSubItem}
                onUpdate={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {q.type === "mcq" && (
              <MCQEditor
                items={q.items}
                columns={q.columnsPerRow || 2}
                onColumnsChange={(c) => onUpdate({ columnsPerRow: c })}
                onAdd={onAddSubItem}
                onUpdate={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {q.type === "match" && (
              <MatchEditor
                left={q.matchLeft || []}
                right={q.matchRight || []}
                leftLabel={q.matchLeftLabel ?? "numbers"}
                rightLabel={q.matchRightLabel ?? "none"}
                onLabelChange={(which, value) =>
                  onUpdate(
                    which === "left"
                      ? { matchLeftLabel: value }
                      : { matchRightLabel: value }
                  )
                }
                divider={q.matchDivider ?? false}
                onDividerChange={(v) => onUpdate({ matchDivider: v })}
                onUpdate={(left, right) =>
                  onUpdate({ matchLeft: left, matchRight: right })
                }
              />
            )}
            {q.type === "true-false" && (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 p-2 bg-ink/5/50 border border-ink/10 rounded-lg">
                  <label className="flex items-center gap-1.5 text-xs text-graphite font-medium">
                    Marker style:
                    <select
                      value={q.tfFormat ?? "bracket"}
                      onChange={(e) =>
                        onUpdate({ tfFormat: e.target.value as "bracket" | "box" })
                      }
                      className="text-xs border border-rule rounded px-2 py-1 bg-white"
                    >
                      <option value="bracket">Ruled Bracket ( _____ )</option>
                      <option value="box">Square Box [  ] (Tick / Cross)</option>
                    </select>
                  </label>
                  <OptionToggle
                    label="Place right after the statement"
                    checked={(q.tfAnswerPosition ?? "inline") === "inline"}
                    onChange={(v) =>
                      onUpdate({ tfAnswerPosition: v ? "inline" : "right" })
                    }
                  />
                  {(q.tfFormat ?? "bracket") === "bracket" && (
                    <label className="flex items-center gap-2 text-xs text-graphite">
                      Answer space:
                      <input
                        type="number"
                        min={20}
                        max={200}
                        step={5}
                        value={q.tfBlankWidth ?? 70}
                        onChange={(e) =>
                          onUpdate({ tfBlankWidth: Number(e.target.value) || 70 })
                        }
                        className="w-16 px-2 py-1 border border-rule rounded text-xs"
                      />
                      pt
                    </label>
                  )}
                </div>
                <TrueFalseEditor
                  items={q.items}
                  columns={q.columnsPerRow || 1}
                  onColumnsChange={(c) => onUpdate({ columnsPerRow: c })}
                  onAdd={onAddSubItem}
                  onUpdate={onUpdateSubItem}
                  onRemove={onRemoveSubItem}
                />
              </>
            )}
            {q.type === "math-vertical" && (
              <MathEditor
                items={q.items}
                operation={q.operation || "+"}
                columnsPerRow={q.columnsPerRow || 4}
                autoFit={q.mathAutoFit !== false}
                gap={q.mathGap ?? 12}
                problemWidth={q.mathProblemWidth ?? 90}
                answerSpace={q.mathAnswerSpace ?? 0}
                border={q.mathBorder ?? false}
                digitSpacing={q.mathDigitSpacing ?? 4}
                mathIndexGap={q.mathIndexGap ?? 6}
                mathQuotientRemainder={q.mathQuotientRemainder}
                onOperationChange={(op) => onUpdate({ operation: op as Question["operation"] })}
                onColumnsChange={(c) => onUpdate({ columnsPerRow: c })}
                onLayoutChange={(u) => onUpdate(u)}
                onAdd={onAddSubItem}
                onUpdate={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {q.type === "comprehension" && (
              <ComprehensionEditor
                passage={q.passage || ""}
                passageTitle={q.passageTitle || ""}
                passageColumns={q.passageColumns || 1}
                passageBorder={q.passageBorder ?? (q.passageColumns === 2)}
                items={q.items}
                onPassageChange={(p) => onUpdate({ passage: p })}
                onPassageTitleChange={(t) => onUpdate({ passageTitle: t })}
                onPassageColumnsChange={(c) => onUpdate({ passageColumns: c })}
                onPassageBorderChange={(b) => onUpdate({ passageBorder: b })}
                onAdd={onAddSubItem}
                onUpdate={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {q.type === "word-problem" && (
              <WordProblemEditor
                items={q.items}
                showBox={q.wpOperationBox !== false}
                boxPosition={q.wpBoxPosition || "right"}
                boxWidth={q.wpBoxWidth ?? 150}
                boxHeight={q.wpBoxHeight ?? 70}
                boxLabel={q.wpBoxLabel !== false}
                boxGrid={q.wpBoxGrid === true}
                boxRows={q.wpBoxRows ?? 4}
                boxCols={q.wpBoxCols ?? 5}
                boxShowNumbers={q.wpBoxShowNumbers}
                boxOperation={q.wpBoxOperation}
                onLayoutChange={(u) => onUpdate(u)}
                onAdd={onAddSubItem}
                onUpdate={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {q.type === "composition" && (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
                  <OptionToggle
                    label="Number the prompts"
                    checked={q.compositionNumbered ?? true}
                    onChange={(v) => onUpdate({ compositionNumbered: v })}
                  />
                  <label className="flex items-center gap-2 text-xs text-graphite">
                    Writing lines
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={q.writingLines ?? 0}
                      onChange={(e) =>
                        onUpdate({
                          writingLines: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-16 px-2 py-2 min-h-[44px] lg:min-h-0 lg:py-1.5 border border-rule rounded-lg text-xs focus:ring-2 focus:ring-ink focus:border-ink outline-none"
                    />
                  </label>
                </div>
                <CompositionEditor
                  sentences={q.compositionSentences || []}
                  onUpdate={(sentences) =>
                    onUpdate({ compositionSentences: sentences })
                  }
                />
              </>
            )}
            {q.type === "picture-composition" && (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
                  <OptionToggle
                    label="Number each picture"
                    checked={q.imageNumbers ?? (q.images?.length ?? 0) > 1}
                    onChange={(v) => onUpdate({ imageNumbers: v })}
                  />
                  <OptionToggle
                    label="Caption line under each picture"
                    checked={q.imageCaptionLine ?? (q.images?.length ?? 0) > 1}
                    onChange={(v) => onUpdate({ imageCaptionLine: v })}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                  <label className="flex items-center gap-2 text-xs text-graphite">
                    Picture position
                    <select
                      value={q.imageAlign ?? "center"}
                      onChange={(e) =>
                        onUpdate({ imageAlign: e.target.value as CellAlign })
                      }
                      className="px-2 py-2 lg:py-1.5 min-h-[40px] lg:min-h-0 border border-rule rounded-lg text-xs bg-white focus:ring-2 focus:ring-ink focus:border-ink outline-none"
                    >
                      {CELL_ALIGN_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-graphite">
                    Picture height
                    <input
                      type="number"
                      min={40}
                      max={500}
                      step={10}
                      value={q.imageMaxHeight ?? 100}
                      onChange={(e) =>
                        onUpdate({ imageMaxHeight: Math.max(40, Number(e.target.value) || 100) })
                      }
                      className="w-20 px-2 py-2 lg:py-1.5 min-h-[44px] lg:min-h-0 border border-rule rounded-lg text-xs focus:ring-2 focus:ring-ink focus:border-ink outline-none"
                    />
                    pt
                  </label>
                </div>
                <PictureCompositionEditor
                  writingLines={q.writingLines || 6}
                  onWritingLinesChange={(n) => onUpdate({ writingLines: n })}
                />
              </>
            )}
            {q.type === "handwriting" && (
              <HandwritingEditor
                items={q.items}
                onAdd={onAddSubItem}
                onUpdate={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {q.type === "dictation" && (
              <DictationEditor
                writingLines={q.writingLines || 8}
                columns={q.columnsPerRow || 1}
                onWritingLinesChange={(n) => onUpdate({ writingLines: n })}
                onColumnsChange={(c) => onUpdate({ columnsPerRow: c })}
              />
            )}
            {q.type === "draw" && (
              <DrawEditor
                items={q.items}
                boxHeight={q.boxHeight || 120}
                columns={q.columnsPerRow || 1}
                writingLines={q.writingLines ?? 0}
                linesPosition={q.drawLinesPosition ?? (q.drawOrder === "lines-first" ? "above" : "below")}
                onBoxHeightChange={(h) => onUpdate({ boxHeight: h })}
                onColumnsChange={(c) => onUpdate({ columnsPerRow: c })}
                onWritingLinesChange={(lines) => onUpdate({ writingLines: lines })}
                onLinesPositionChange={(pos) => onUpdate({ drawLinesPosition: pos, drawOrder: pos === "above" ? "lines-first" : "box-first" })}
                onAdd={onAddSubItem}
                onUpdate={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {q.type === "label-image" && (
              <LabelImageEditor
                items={q.items}
                columns={q.columnsPerRow || 2}
                onColumnsChange={(c) => onUpdate({ columnsPerRow: c })}
                onAdd={onAddSubItem}
                onUpdate={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {q.type === "assertion-reason" && (
              <AssertionReasonEditor
                items={q.items}
                onAdd={onAddSubItem}
                onUpdate={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {q.type === "case-study" && (
              <CaseStudyEditor
                passage={q.passage || ""}
                sourceLabel={q.caseSourceLabel || ""}
                roman={q.caseRomanNumerals !== false}
                onMeta={(u) => onUpdate(u)}
                items={q.items}
                onAdd={onAddSubItem}
                onUpdate={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {q.type === "diagram-label" && (
              <SimpleListEditor
                label="Legend entries (leave blank for the student to fill)"
                addLabel="+ Add legend entry"
                placeholder="Leave blank, or type the part name"
                items={q.items}
                columns={q.columnsPerRow || 2}
                onColumnsChange={(c) => onUpdate({ columnsPerRow: c })}
                onAdd={onAddSubItem}
                onUpdateItem={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {q.type === "odd-one-out" && (
              <OddOneOutEditor
                items={q.items}
                columns={q.columnsPerRow || 1}
                onColumnsChange={(c) => onUpdate({ columnsPerRow: c })}
                onAdd={onAddSubItem}
                onUpdate={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {q.type === "rearrange" && (
              <SimpleListEditor
                label="Jumbled words (separate with / )"
                addLabel="+ Add sentence"
                placeholder="is / a / this / book"
                items={q.items}
                onAdd={onAddSubItem}
                onUpdateItem={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {q.type === "word-search" && (
              <WordSearchEditor
                items={q.items}
                grid={q.puzzleGrid || []}
                columns={q.columnsPerRow || 3}
                onColumnsChange={(c) => onUpdate({ columnsPerRow: c })}
                onGrid={(puzzleGrid) => onUpdate({ puzzleGrid })}
                onAdd={onAddSubItem}
                onUpdateItem={onUpdateSubItem}
                onRemove={onRemoveSubItem}
              />
            )}
            {q.type === "table" && (
              <>
                <TableAlignEditor
                  rows={q.tableRows || []}
                  align={q.tableAlign ?? []}
                  alignDefault={q.tableAlignDefault ?? "center"}
                  onAlignChange={(tableAlign) => onUpdate({ tableAlign })}
                  onDefaultChange={(tableAlignDefault) => onUpdate({ tableAlignDefault })}
                />
                <TableEditor
                rows={q.tableRows || []}
                caption={q.tableCaption || ""}
                headerRow={q.tableHeaderRow !== false}
                headerCol={q.tableHeaderCol === true}
                cellMinHeight={q.tableCellMinHeight ?? 22}
                hideBorders={q.tableHideBorders}
                blankLine={q.tableBlankLine}
                onChange={(u) => onUpdate(u)}
                items={q.items}
                onAddSubItem={onAddSubItem}
                onUpdateSubItem={onUpdateSubItem}
                  onRemoveSubItem={onRemoveSubItem}
                />
              </>
            )}
            {q.type === "custom" && (
              <CustomBlocksEditor
                blocks={q.customBlocks || []}
                onChange={(blocks) => onUpdate({ customBlocks: blocks })}
              />
            )}
          </div>

          {/* Page-break behaviour for this question */}
          <div className="mt-3 pt-2.5 border-t border-rule/60 space-y-2">
            <div className="text-[11px] font-semibold text-graphite uppercase tracking-wider">
              Page Break &amp; Splitting
            </div>
            <div className="space-y-1.5">
              <label className="flex items-start gap-2 text-xs text-graphite cursor-pointer">
                <input
                  type="radio"
                  name={`pagebreak-${q.id}`}
                  checked={keepsTogether(q)}
                  onChange={() => onUpdate({ keepTogether: true })}
                  className="accent-ink mt-0.5"
                />
                <span>
                  Keep whole question on one page
                  <span className="block text-[11px] text-graphite/80">
                    Moves to next page as a complete block if it doesn&apos;t fit.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs text-graphite cursor-pointer">
                <input
                  type="radio"
                  name={`pagebreak-${q.id}`}
                  checked={!keepsTogether(q)}
                  onChange={() => onUpdate({ keepTogether: false })}
                  className="accent-ink mt-0.5"
                />
                <span>
                  Split between sub-questions (each sub-question stays intact)
                  <span className="block text-[11px] text-graphite/80">
                    Allows question to flow across pages. Each sub-question &amp; working box stays fully on one page (never sliced in half).
                  </span>
                </span>
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs text-graphite cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={!!q.pageBreakBefore}
                onChange={(e) => onUpdate({ pageBreakBefore: e.target.checked })}
                className="accent-ink"
              />
              <span>Start this question on a new page (Page break before)</span>
            </label>
          </div>

          {/* Per-question spacing overrides */}
          <SpacingEditor
            spacing={q.spacing}
            onChange={(spacing) => onUpdate({ spacing })}
          />

          {/* Question-level Images */}
          <QuestionImagesEditor
            images={q.images || []}
            imageColumns={q.imageColumns || 2}
            onImagesChange={(imgs) => onUpdate({ images: imgs })}
            onColumnsChange={(c) => onUpdate({ imageColumns: c })}
          />

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-rule">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={onDuplicate}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-graphite hover:text-ink hover:bg-ink/5 rounded-lg border border-rule transition-colors min-h-[38px]"
              >
                <Copy size={14} />
                Duplicate
              </button>
              {!isStructural && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                  title="Regenerate this question with fresh AI content"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-pen hover:bg-pen/10 bg-pen/5 border border-pen/20 rounded-lg transition-colors disabled:opacity-50 min-h-[38px]"
                >
                  {isRegenerating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {isRegenerating ? "Regenerating…" : "Regenerate AI"}
                </button>
              )}
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors min-h-[38px]"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>

            <button
              onClick={onToggle}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-ink hover:bg-pen rounded-lg transition-colors min-h-[38px] shadow-xs ml-auto"
            >
              <Check size={14} />
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Sub-Item Editors ===== */

interface ItemEditorProps {
  items: SubItem[];
  onAdd: (content?: string) => void;
  onUpdate: (itemId: string, updates: Partial<SubItem>) => void;
  onRemove: (itemId: string) => void;
}

/**
 * Every "+ Add …" used to be a bare 16px link sitting beside a 44px delete X —
 * the two hardest taps in the app were next to each other. Same look on a
 * desktop, a real target on a phone.
 */
function AddItemButton({
  onClick,
  className = "",
  title,
  children,
}: {
  onClick: () => void;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[46px] rounded-lg border border-rule/80 bg-rule/20 hover:bg-rule/40 text-sm text-ink font-semibold active:scale-[0.98] transition-all ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Makes a list of single-line item fields behave the way a list behaves in
 * Word: Enter finishes this item and opens the next one with the cursor already
 * in it, and pasting several lines fills one item per line instead of jamming
 * them into a single field. Ten items used to cost thirty taps and ten
 * keyboard dismiss/refocus cycles.
 *
 * The handlers sit on the wrapper rather than on the fields because the fields
 * are TranslitInputs, which accept no key props; React events bubble to here
 * either way. Nested lists (an MCQ's options inside its questions) are kept
 * apart by matching each field's own wrapper.
 */
function ItemList({
  count,
  onAddItems,
  onPasteLines,
  className,
  children,
}: {
  count: number;
  /** Append one item per string. `from` is the field the teacher was in. */
  onAddItems: (contents: string[], from: number) => void;
  /** Replace the item at `at` with values[0], then append the rest — one state
   *  update, so an editor holding its items in a plain array stays consistent. */
  onPasteLines?: (at: number, values: string[]) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const focusNext = useRef<number | null>(null);

  // Textareas as well as inputs: the question-text fields grow to fit so a
  // teacher can put a line break inside one item (Shift+Enter), while plain
  // Enter still finishes the item and opens the next.
  const fields = useCallback(
    () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          "input, textarea"
        ) ?? []
      ).filter(
        (el) =>
          (el instanceof HTMLTextAreaElement || el.type === "text") &&
          el.closest("[data-item-list]") === ref.current
      ),
    []
  );

  // The new field only exists after the parent has re-rendered with it.
  useEffect(() => {
    const want = focusNext.current;
    if (want == null) return;
    focusNext.current = null;
    fields()[want]?.focus();
  }, [count, fields]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    // Gboard sends Enter to close a composing word; that Enter belongs to the
    // keyboard, not to the list.
    if ((e.nativeEvent as KeyboardEvent).isComposing) return;
    const all = fields();
    const i = all.indexOf(e.target as HTMLInputElement | HTMLTextAreaElement);
    if (i === -1) return; // a nested list's field, already handled below us
    e.preventDefault();
    e.stopPropagation();
    if (i < all.length - 1) {
      all[i + 1].focus();
      return;
    }
    focusNext.current = i + 1;
    onAddItems([""], i);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!onPasteLines) return;
    const all = fields();
    const el = e.target as HTMLInputElement | HTMLTextAreaElement;
    const i = all.indexOf(el);
    if (i === -1) return;
    const lines = e.clipboardData
      .getData("text")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return; // ordinary paste, leave it to the browser
    e.preventDefault();
    e.stopPropagation();
    const before = el.value.slice(0, el.selectionStart ?? el.value.length);
    const after = el.value.slice(el.selectionEnd ?? el.value.length);
    const values = [before + lines[0], ...lines.slice(1)];
    values[values.length - 1] += after;
    onPasteLines(i, values);
  };

  return (
    <div data-item-list ref={ref} onKeyDown={onKeyDown} onPaste={onPaste} className={className}>
      {children}
    </div>
  );
}

/** Small inline "items per row" dropdown used by list-style question editors. */
function ColumnsSelect({
  columns,
  onColumnsChange,
}: {
  columns: number;
  onColumnsChange: (c: number) => void;
}) {
  return (
    <label className="text-xs font-medium text-graphite flex items-center gap-1.5">
      Items per row:
      <select
        value={columns}
        onChange={(e) => onColumnsChange(Number(e.target.value))}
        className="text-xs border border-rule rounded px-2 py-1"
      >
        <option value={1}>1</option>
        <option value={2}>2</option>
        <option value={3}>3</option>
      </select>
    </label>
  );
}

function FillBlanksEditor({
  items,
  columns,
  onColumnsChange,
  blankLineStyle,
  blankLines,
  hideItemNumbering,
  onBlankLineStyleChange,
  onBlankLinesChange,
  onHideItemNumberingChange,
  onAdd,
  onUpdate,
  onRemove,
}: ItemEditorProps & {
  columns: number;
  onColumnsChange: (c: number) => void;
  blankLineStyle: BlankLineStyle;
  blankLines: number;
  hideItemNumbering?: boolean;
  onBlankLineStyleChange: (s: BlankLineStyle) => void;
  onBlankLinesChange: (n: number) => void;
  onHideItemNumberingChange: (v: boolean) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-graphite">
          Items (use ___ for blanks)
        </label>
        <ColumnsSelect columns={columns} onColumnsChange={onColumnsChange} />
      </div>
      {/* Per-question writing-line ruling and numbering */}
      <div className="flex flex-wrap items-center gap-3 mb-2 p-2 bg-ink/5/50 border border-ink/10 rounded-lg">
        <label className="text-xs font-medium text-graphite">Writing line:</label>
        <select
          value={blankLineStyle}
          onChange={(e) => onBlankLineStyleChange(e.target.value as BlankLineStyle)}
          className="text-xs border border-rule rounded px-2 py-1 bg-white"
        >
          <option value="inline">Inline blank only</option>
          <option value="single">Single line</option>
          <option value="four-line">Four line</option>
        </select>
        {blankLineStyle !== "inline" && (
          <label className="text-xs text-graphite flex items-center gap-1">
            Lines per item:
            <input
              type="number"
              value={blankLines}
              min={1}
              max={10}
              onChange={(e) => onBlankLinesChange(Number(e.target.value))}
              className="w-16 px-2 py-2 min-h-[44px] lg:min-h-0 lg:w-12 lg:px-1 lg:py-0.5 border border-rule rounded text-xs"
            />
          </label>
        )}
        <label className="text-xs text-graphite flex items-center gap-1.5 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={!!hideItemNumbering}
            onChange={(e) => onHideItemNumberingChange(e.target.checked)}
            className="rounded border-rule text-ink focus:ring-ink"
          />
          Hide item numbering (e.g. poem / stanza)
        </label>
      </div>
      <ItemList
        count={items.length}
        onAddItems={(lines) => lines.forEach((l) => onAdd(l))}
        onPasteLines={(at, values) => {
          onUpdate(items[at].id, { content: values[0] });
          values.slice(1).forEach((v) => onAdd(v));
        }}
      >
        {items.map((item, i) => (
          <div key={item.id} className="mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-graphite w-5 shrink-0">
                {hideItemNumbering ? "—" : `${String.fromCharCode(97 + i)})`}
              </span>
              <TranslitTextarea
                value={item.content}
                onChange={(e) => onUpdate(item.id, { content: e.target.value })}
                placeholder="e.g. 7 × 9 = ___"
                className="flex-1 min-w-0 px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
                rows={1}
                autoGrow
              />
              <button
                onClick={() => onRemove(item.id)}
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 shrink-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
            <SubItemImageUploader
              image={item.image}
              imageWidth={item.imageWidth}
              onImageChange={(img) => onUpdate(item.id, { image: img })}
              onWidthChange={(w) => onUpdate(item.id, { imageWidth: w })}
              content={item.content}
              onContentChange={(v) => onUpdate(item.id, { content: v })}
            />
          </div>
        ))}
      </ItemList>
      <AddItemButton onClick={() => onAdd("")}>+ Add item</AddItemButton>
    </div>
  );
}

function AnswerEditor({
  items,
  isLong,
  columns = 1,
  answerLinePlacement = "inline",
  onColumnsChange,
  onPlacementChange,
  onAdd,
  onUpdate,
  onRemove,
}: ItemEditorProps & {
  isLong: boolean;
  columns?: number;
  answerLinePlacement?: "inline" | "below";
  onColumnsChange?: (c: number) => void;
  onPlacementChange?: (p: "inline" | "below") => void;
}) {
  return (
    <div>
      {!isLong && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 p-2.5 bg-paper rounded-xl border border-rule/80">
          <div className="flex items-center gap-1.5 text-xs text-graphite font-medium">
            <span>Items per row:</span>
            <div className="inline-flex rounded-lg border border-rule overflow-hidden bg-white">
              {[1, 2, 3, 4].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => onColumnsChange?.(col)}
                  className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                    columns === col
                      ? "bg-ink text-white"
                      : "text-graphite hover:bg-rule/40"
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-graphite font-medium">
            <span>Answer space:</span>
            <div className="inline-flex rounded-lg border border-rule overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => onPlacementChange?.("inline")}
                className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                  answerLinePlacement === "inline"
                    ? "bg-pen text-white"
                    : "text-graphite hover:bg-rule/40"
                }`}
                title="Line directly in front of question — saves paper"
              >
                In front (Save space)
              </button>
              <button
                type="button"
                onClick={() => onPlacementChange?.("below")}
                className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                  answerLinePlacement === "below"
                    ? "bg-pen text-white"
                    : "text-graphite hover:bg-rule/40"
                }`}
                title="Full width line below question"
              >
                Line below
              </button>
            </div>
          </div>
        </div>
      )}

      <label className="block text-xs font-medium text-graphite mb-1">
        Questions
      </label>
      <ItemList
        count={items.length}
        onAddItems={(lines) => lines.forEach((l) => onAdd(l))}
        onPasteLines={(at, values) => {
          onUpdate(items[at].id, { content: values[0] });
          values.slice(1).forEach((v) => onAdd(v));
        }}
      >
        {items.map((item, i) => (
          <div key={item.id} className="mb-3 p-2 bg-paper rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs text-graphite w-5 shrink-0">
                {i + 1})
              </span>
              <TranslitTextarea
                value={item.content}
                onChange={(e) => onUpdate(item.id, { content: e.target.value })}
                placeholder="Enter question..."
                className="flex-1 min-w-0 px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none bg-white"
                rows={1}
                autoGrow
              />
              <button
                onClick={() => onRemove(item.id)}
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 shrink-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-1.5 ml-7 flex items-center gap-4">
              <label className="text-xs text-graphite flex items-center gap-1.5">
                Answer lines (0 for none):
                <input
                  type="number"
                  value={item.lines ?? (isLong ? 4 : 1)}
                  onChange={(e) =>
                    onUpdate(item.id, {
                      lines: e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  min={0}
                  max={20}
                  className="w-16 px-2 py-2 min-h-[44px] lg:min-h-0 border border-rule rounded text-xs"
                />
              </label>
            </div>
            <SubItemImageUploader
              image={item.image}
              imageWidth={item.imageWidth}
              onImageChange={(img) => onUpdate(item.id, { image: img })}
              onWidthChange={(w) => onUpdate(item.id, { imageWidth: w })}
              content={item.content}
              onContentChange={(v) => onUpdate(item.id, { content: v })}
            />
          </div>
        ))}
      </ItemList>
      <AddItemButton onClick={() => onAdd("")}>+ Add question</AddItemButton>
    </div>
  );
}

function MCQEditor({
  items,
  columns,
  onColumnsChange,
  onAdd,
  onUpdate,
  onRemove,
}: ItemEditorProps & {
  columns: number;
  onColumnsChange: (c: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <label className="text-xs font-medium text-graphite">
          Options layout:
        </label>
        <select
          value={columns}
          onChange={(e) => onColumnsChange(Number(e.target.value))}
          className="text-xs border border-rule rounded px-2 py-1"
        >
          <option value={1}>1 column</option>
          <option value={2}>2 columns</option>
          <option value={4}>4 columns</option>
        </select>
      </div>

      <ItemList
        count={items.length}
        onAddItems={(lines) => lines.forEach((l) => onAdd(l))}
        onPasteLines={(at, values) => {
          onUpdate(items[at].id, { content: values[0] });
          values.slice(1).forEach((v) => onAdd(v));
        }}
      >
        {items.map((item, i) => {
          const options = item.options || ["", "", "", ""];
          const setOptions = (next: string[]) => onUpdate(item.id, { options: next });
          return (
            <div key={item.id} className="mb-3 p-3 bg-paper rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-graphite w-5 shrink-0">
                  {i + 1})
                </span>
                <TranslitTextarea
                  value={item.content}
                  onChange={(e) => onUpdate(item.id, { content: e.target.value })}
                  placeholder="Enter question..."
                  className="flex-1 min-w-0 px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none bg-white"
                  rows={1}
                  autoGrow
                />
                <button
                  onClick={() => onRemove(item.id)}
                  className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 shrink-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
              {/* Two boxes across a phone left about eight Latin characters
                  visible, and far fewer Devanagari clusters. */}
              <ItemList
                count={options.length}
                onAddItems={(lines) => setOptions([...options, ...lines])}
                onPasteLines={(at, values) =>
                  setOptions([...options.slice(0, at), ...values, ...options.slice(at + 1)])
                }
                className="ml-7 grid grid-cols-1 sm:grid-cols-2 gap-1.5"
              >
                {options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-1">
                    <span className="text-xs text-graphite">
                      ({String.fromCharCode(97 + oi)})
                    </span>
                    <TranslitInput
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[oi] = e.target.value;
                        setOptions(newOpts);
                      }}
                      placeholder={`Option ${String.fromCharCode(97 + oi)}`}
                      className="flex-1 px-2 py-2.5 min-h-[44px] lg:min-h-0 lg:py-1 border border-rule rounded text-xs focus:ring-2 focus:ring-ink focus:border-ink outline-none bg-white"
                    />
                  </div>
                ))}
              </ItemList>
              <AddItemButton
                onClick={() => setOptions([...options, ""])}
                className="ml-7"
              >
                + Add option
              </AddItemButton>
              <SubItemImageUploader
                image={item.image}
                imageWidth={item.imageWidth}
                onImageChange={(img) => onUpdate(item.id, { image: img })}
                onWidthChange={(w) => onUpdate(item.id, { imageWidth: w })}
                content={item.content}
                onContentChange={(v) => onUpdate(item.id, { content: v })}
              />
            </div>
          );
        })}
      </ItemList>
      <AddItemButton onClick={() => onAdd("")}>+ Add MCQ</AddItemButton>
    </div>
  );
}

function MatchEditor({
  left,
  right,
  leftLabel,
  rightLabel,
  onLabelChange,
  divider,
  onDividerChange,
  onUpdate,
}: {
  left: string[];
  right: string[];
  leftLabel: MatchLabel;
  rightLabel: MatchLabel;
  onLabelChange: (which: "left" | "right", value: MatchLabel) => void;
  divider: boolean;
  onDividerChange: (v: boolean) => void;
  onUpdate: (left: string[], right: string[]) => void;
}) {
  const maxLen = Math.max(left.length, right.length);
  const rows = Array.from({ length: maxLen });
  // Either column can be short; square them off before appending so nothing
  // lands opposite the wrong pair.
  const cols = {
    left: Array.from({ length: maxLen }, (_, i) => left[i] || ""),
    right: Array.from({ length: maxLen }, (_, i) => right[i] || ""),
  };
  const appendRows = (contents: string[], col: number) =>
    onUpdate(
      [...cols.left, ...contents.map((t) => (col === 0 ? t : ""))],
      [...cols.right, ...contents.map((t) => (col === 1 ? t : ""))]
    );

  const labelSelect = (which: "left" | "right", value: MatchLabel) => (
    <select
      value={value}
      onChange={(e) => onLabelChange(which, e.target.value as MatchLabel)}
      aria-label={`Numbering for Column ${which === "left" ? "A" : "B"}`}
      className="w-full mt-1 px-2 py-2 lg:py-1.5 min-h-[40px] lg:min-h-0 border border-rule rounded-lg text-xs bg-white focus:ring-2 focus:ring-ink focus:border-ink outline-none"
    >
      {MATCH_LABEL_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div>
      {/* Numbering — Column B is off by default; teachers turn it on when they
          want students to answer "1-c" style. */}
      <div className="grid grid-cols-[1fr_1fr_32px] gap-2 mb-3">
        <div>
          <label className="text-xs font-medium text-graphite">Column A numbering</label>
          {labelSelect("left", leftLabel)}
        </div>
        <div>
          <label className="text-xs font-medium text-graphite">Column B numbering</label>
          {labelSelect("right", rightLabel)}
        </div>
        <div />
      </div>

      <div className="mb-3">
        <OptionToggle
          label="Divider line between Column A and Column B"
          checked={divider}
          onChange={onDividerChange}
        />
      </div>

      <div className="grid grid-cols-[1fr_1fr_32px] gap-2 mb-1">
        <label className="text-xs font-medium text-graphite">Column A</label>
        <label className="text-xs font-medium text-graphite">Column B</label>
        <div />
      </div>
      {/* The fields run A1, B1, A2, B2 … so Enter walks across the pair and then
          on to a fresh row, and a pasted list lands down the column it was
          pasted into. */}
      <ItemList
        count={maxLen}
        onAddItems={(lines, from) => appendRows(lines, from % 2)}
        onPasteLines={(at, values) => {
          const col = at % 2;
          const row = Math.floor(at / 2);
          const next = col === 0 ? [...cols.left] : [...cols.right];
          next[row] = values[0];
          const rest = values.slice(1);
          if (col === 0) onUpdate([...next, ...rest], [...cols.right, ...rest.map(() => "")]);
          else onUpdate([...cols.left, ...rest.map(() => "")], [...next, ...rest]);
        }}
      >
        {rows.map((_, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_32px] gap-2 mb-1.5">
            <TranslitInput
              value={left[i] || ""}
              onChange={(e) => {
                const newL = [...left];
                newL[i] = e.target.value;
                onUpdate(newL, right);
              }}
              className="px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
            />
            <TranslitInput
              value={right[i] || ""}
              onChange={(e) => {
                const newR = [...right];
                newR[i] = e.target.value;
                onUpdate(left, newR);
              }}
              className="px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
            />
            <button
              onClick={() => {
                const newL = left.filter((_, j) => j !== i);
                const newR = right.filter((_, j) => j !== i);
                onUpdate(newL, newR);
              }}
              className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500 self-center"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </ItemList>
      <AddItemButton onClick={() => appendRows([""], 0)}>+ Add row</AddItemButton>
    </div>
  );
}

function TrueFalseEditor({
  items,
  columns,
  onColumnsChange,
  onAdd,
  onUpdate,
  onRemove,
}: ItemEditorProps & { columns: number; onColumnsChange: (c: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-graphite">
          Statements
        </label>
        <ColumnsSelect columns={columns} onColumnsChange={onColumnsChange} />
      </div>
      <ItemList
        count={items.length}
        onAddItems={(lines) => lines.forEach((l) => onAdd(l))}
        onPasteLines={(at, values) => {
          onUpdate(items[at].id, { content: values[0] });
          values.slice(1).forEach((v) => onAdd(v));
        }}
      >
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 mb-2">
            <span className="text-xs text-graphite w-5 shrink-0">
              {i + 1})
            </span>
            <TranslitTextarea
              value={item.content}
              onChange={(e) => onUpdate(item.id, { content: e.target.value })}
              placeholder="Enter statement..."
              className="flex-1 min-w-0 px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
              rows={1}
              autoGrow
            />
            <button
              onClick={() => onRemove(item.id)}
              className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 shrink-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </ItemList>
      <AddItemButton onClick={() => onAdd("")}>+ Add statement</AddItemButton>
    </div>
  );
}

function MathEditor({
  items,
  operation,
  columnsPerRow,
  autoFit,
  gap,
  problemWidth,
  answerSpace,
  border,
  digitSpacing,
  mathIndexGap = 6,
  mathQuotientRemainder,
  onOperationChange,
  onColumnsChange,
  onLayoutChange,
  onAdd,
  onUpdate,
  onRemove,
}: ItemEditorProps & {
  operation: string;
  columnsPerRow: number;
  autoFit: boolean;
  gap: number;
  problemWidth: number;
  answerSpace: number;
  border: boolean;
  digitSpacing: number;
  mathIndexGap?: number;
  mathQuotientRemainder?: boolean;
  onOperationChange: (op: string) => void;
  onColumnsChange: (c: number) => void;
  onLayoutChange: (u: Partial<Question>) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <div>
          <label className="text-xs font-medium text-graphite">Operation:</label>
          <select
            value={operation}
            onChange={(e) => onOperationChange(e.target.value)}
            className="ml-2 text-sm border border-rule rounded px-2 py-1"
          >
            <option value="+">Addition (+)</option>
            <option value="-">Subtraction (-)</option>
            <option value="×">Multiplication (×)</option>
            <option value="÷">Division (÷)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-graphite">Items per row:</label>
          <select
            value={autoFit ? "auto" : columnsPerRow}
            onChange={(e) => {
              if (e.target.value === "auto") {
                onLayoutChange({ mathAutoFit: true });
              } else {
                const cols = Number(e.target.value);
                onColumnsChange(cols);
                onLayoutChange({ mathAutoFit: false, columnsPerRow: cols });
              }
            }}
            className="ml-2 text-sm border border-rule rounded px-2 py-1 font-medium text-ink bg-white"
          >
            <option value="auto">Auto-fit (natural)</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
            <option value={6}>6</option>
          </select>
        </div>
      </div>

      {/* Layout controls — fix the "too much space" problem */}
      <div className="mb-3 p-2.5 bg-ink/5/50 border border-ink/10 rounded-lg space-y-2">
        {operation === "÷" && (
          <label className="flex items-center gap-2 text-xs font-semibold text-ink">
            <input
              type="checkbox"
              checked={mathQuotientRemainder ?? true}
              onChange={(e) => onLayoutChange({ mathQuotientRemainder: e.target.checked })}
              className="accent-ink"
            />
            Show Quotient & Remainder (Q = ___ R = ___) in 1 row
          </label>
        )}
        <label className="flex items-center gap-2 text-xs font-medium text-graphite">
          <input
            type="checkbox"
            checked={autoFit}
            onChange={(e) => onLayoutChange({ mathAutoFit: e.target.checked })}
            className="accent-ink"
          />
          Auto-fit width (each sum takes only the space it needs)
        </label>
        <div className="flex items-center gap-4 flex-wrap">
          <MiniSlider
            label="Sum width"
            value={problemWidth}
            min={60}
            max={160}
            step={5}
            unit="pt"
            onChange={(v) => onLayoutChange({ mathProblemWidth: v })}
          />
          <MiniSlider
            label="Gap"
            value={gap}
            min={4}
            max={32}
            step={2}
            unit="pt"
            onChange={(v) => onLayoutChange({ mathGap: v })}
          />
          <MiniSlider
            label="Answer space"
            value={answerSpace}
            min={0}
            max={60}
            step={4}
            unit="pt"
            onChange={(v) => onLayoutChange({ mathAnswerSpace: v })}
          />
          <MiniSlider
            label="Digit spacing"
            value={digitSpacing}
            min={0}
            max={16}
            step={1}
            unit="pt"
            onChange={(v) => onLayoutChange({ mathDigitSpacing: v })}
          />
          <MiniSlider
            label="Index gap"
            value={mathIndexGap}
            min={0}
            max={30}
            step={1}
            unit="pt"
            onChange={(v) => onLayoutChange({ mathIndexGap: v })}
          />
          <label className="flex items-center gap-1.5 text-xs text-graphite">
            <input
              type="checkbox"
              checked={border}
              onChange={(e) => onLayoutChange({ mathBorder: e.target.checked })}
              className="accent-ink"
            />
            Border box
          </label>
        </div>
      </div>

      <p className="text-[10px] text-graphite mb-1.5">
        Each sum can have 2 or more numbers. Use <b>+ number</b> for sums like
        34 + 37 + 26.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, i) => {
          // Operands array: nums[] (3+) wins; otherwise the legacy num1/num2 pair.
          const operands =
            item.nums && item.nums.length >= 2
              ? item.nums
              : [item.num1 || "", item.num2 || ""];
          const writeOperands = (ops: string[]) => onUpdate(item.id, { nums: ops });
          const setOperand = (idx: number, val: string) => {
            const ops = [...operands];
            ops[idx] = val;
            writeOperands(ops);
          };
          const addOperand = () => writeOperands([...operands, ""]);
          const removeOperand = (idx: number) =>
            writeOperands(operands.filter((_, k) => k !== idx));
          return (
            <div key={item.id} className="p-2 bg-paper rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-graphite">{i + 1})</span>
                <button
                  onClick={() => onRemove(item.id)}
                  className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
                  title="Remove problem"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {operation === "÷" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-graphite">Divisor:</span>
                    <input
                      type="text"
                      value={operands[1] || ""}
                      onChange={(e) => {
                        const next = [operands[0] || "", e.target.value];
                        writeOperands(next);
                        onUpdate(item.id, { num1: operands[0] || "", num2: e.target.value, nums: next });
                      }}
                      placeholder="e.g. 8"
                      className="w-16 px-2 py-1 border border-rule rounded text-sm text-center font-mono font-bold"
                      title="Divisor (outside the division bracket)"
                    />
                    <span className="text-xs font-medium text-graphite">Dividend:</span>
                    <input
                      type="text"
                      value={operands[0] || ""}
                      onChange={(e) => {
                        const next = [e.target.value, operands[1] || ""];
                        writeOperands(next);
                        onUpdate(item.id, { num1: e.target.value, num2: operands[1] || "", nums: next });
                      }}
                      placeholder="e.g. 77"
                      className="w-20 px-2 py-1 border border-rule rounded text-sm text-center font-mono font-bold"
                      title="Dividend (inside the division bracket)"
                    />
                    <span className="text-xs text-graphite/70 font-mono">
                      ({operands[1] || "?"} |‾ {operands[0] || "?"})
                    </span>
                  </div>
                ) : (
                  <>
                    {operands.map((n, idx) => (
                      <span key={idx} className="flex items-center gap-1">
                        {idx > 0 && (
                          <span className="text-sm font-bold text-graphite">
                            {operation}
                          </span>
                        )}
                        <input
                          type="text"
                          value={n}
                          onChange={(e) => setOperand(idx, e.target.value)}
                          placeholder={idx === 0 ? "number" : ""}
                          className="w-16 px-2 py-2 min-h-[44px] lg:min-h-0 lg:py-1 border border-rule rounded text-sm text-center focus:ring-2 focus:ring-ink focus:border-ink outline-none bg-white"
                        />
                        {operands.length > 2 && (
                          <button
                            onClick={() => removeOperand(idx)}
                            className="text-rule hover:text-red-500"
                            title="Remove number"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </span>
                    ))}
                    <AddItemButton
                      onClick={addOperand}
                      title="Add another number to this sum"
                    >
                      + number
                    </AddItemButton>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <AddItemButton onClick={() => onAdd("")}>+ Add problem</AddItemButton>
    </div>
  );
}

function ComprehensionEditor({
  passage,
  passageTitle,
  passageColumns = 1,
  passageBorder = false,
  items,
  onPassageChange,
  onPassageTitleChange,
  onPassageColumnsChange,
  onPassageBorderChange,
  onAdd,
  onUpdate,
  onRemove,
}: ItemEditorProps & {
  passage: string;
  passageTitle?: string;
  passageColumns?: number;
  passageBorder?: boolean;
  onPassageChange: (p: string) => void;
  onPassageTitleChange: (t: string) => void;
  onPassageColumnsChange: (c: number) => void;
  onPassageBorderChange: (b: boolean) => void;
}) {
  return (
    <div>
      <div className="mb-3">
        <label className="block text-xs font-medium text-graphite mb-1">
          Passage Title (Optional - displayed centered above passage)
        </label>
        <TranslitInput
          value={passageTitle || ""}
          onChange={(e) => onPassageTitleChange(e.target.value)}
          placeholder="e.g. The Honest Woodcutter"
          className="w-full px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
        />
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-graphite">
            Passage / Poem Text
          </label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-xs text-graphite cursor-pointer">
              <input
                type="checkbox"
                checked={passageColumns === 2}
                onChange={(e) => onPassageColumnsChange(e.target.checked ? 2 : 1)}
                className="accent-ink"
              />
              <span>2 Columns (Poem / Split)</span>
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-graphite cursor-pointer">
              <input
                type="checkbox"
                checked={passageBorder}
                onChange={(e) => onPassageBorderChange(e.target.checked)}
                className="accent-ink"
              />
              <span>Bordered Box</span>
            </label>
          </div>
        </div>
        <TranslitTextarea
          value={passage}
          onChange={(e) => onPassageChange(e.target.value)}
          rows={passageColumns === 2 ? 6 : 4}
          placeholder="Enter the reading passage or poem... (Tip: for 2 columns, separate parts with '---' or lines will split equally)"
          className="w-full px-3 py-2 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none resize-y"
        />
        <div className="text-[11px] text-graphite/70 mt-1">
          Tip: Place <code className="bg-paper px-1 py-0.5 rounded font-mono">---</code> on its own line to choose where column 1 ends and column 2 begins.
        </div>
      </div>

      <label className="block text-xs font-medium text-graphite mb-1">
        Questions
      </label>
      <ItemList
        count={items.length}
        onAddItems={(lines) => lines.forEach((l) => onAdd(l))}
        onPasteLines={(at, values) => {
          onUpdate(items[at].id, { content: values[0] });
          values.slice(1).forEach((v) => onAdd(v));
        }}
      >
        {items.map((item, i) => (
          <div key={item.id} className="mb-2 p-2 bg-paper rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs text-graphite w-5 shrink-0">
                {i + 1})
              </span>
              <TranslitTextarea
                value={item.content}
                onChange={(e) => onUpdate(item.id, { content: e.target.value })}
                placeholder="Enter question..."
                className="flex-1 min-w-0 px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none bg-white"
                rows={1}
                autoGrow
              />
              <button
                onClick={() => onRemove(item.id)}
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 shrink-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-1.5 ml-7 flex items-center gap-2">
              <label className="text-xs text-graphite flex items-center gap-1.5" title="Set to 0 for no answer lines (e.g. fill in the blanks)">
                Lines (0 for none):
                <input
                  type="number"
                  value={item.lines ?? 1}
                  onChange={(e) =>
                    onUpdate(item.id, {
                      lines: e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  min={0}
                  max={10}
                  className="w-16 px-2 py-1 border border-rule rounded text-xs bg-white"
                />
              </label>
            </div>
          </div>
        ))}
      </ItemList>
      <AddItemButton onClick={() => onAdd("")}>+ Add question</AddItemButton>
    </div>
  );
}

function WordProblemEditor({
  items,
  showBox,
  boxPosition,
  boxWidth,
  boxHeight,
  boxLabel,
  boxGrid,
  boxRows,
  boxCols,
  boxShowNumbers,
  boxOperation,
  onLayoutChange,
  onAdd,
  onUpdate,
  onRemove,
}: ItemEditorProps & {
  showBox: boolean;
  boxPosition: "right" | "below";
  boxWidth: number;
  boxHeight: number;
  boxLabel: boolean;
  boxGrid: boolean;
  boxRows: number;
  boxCols: number;
  boxShowNumbers?: boolean;
  boxOperation?: string;
  onLayoutChange: (u: Partial<Question>) => void;
}) {
  const labels = "abcdefghijklmnopqrstuvwxyz";
  return (
    <div>
      {/* Operation-box layout controls (great for class 1-2 sums) */}
      <div className="mb-3 p-2.5 bg-ink/5/50 border border-ink/10 rounded-lg space-y-2">
        <label className="flex items-center gap-2 text-xs font-medium text-graphite">
          <input
            type="checkbox"
            checked={showBox}
            onChange={(e) => onLayoutChange({ wpOperationBox: e.target.checked })}
            className="accent-ink"
          />
          Show working box (student does the operation in the box, writes the
          answer in the open space)
        </label>
        {showBox && (
          <label className="flex items-center gap-2 text-xs font-medium text-graphite">
            <input
              type="checkbox"
              checked={boxShowNumbers ?? false}
              onChange={(e) => onLayoutChange({ wpBoxShowNumbers: e.target.checked })}
              className="accent-ink"
            />
            Pre-print numbers inside box (students fill operator and solve)
          </label>
        )}
        {showBox && boxShowNumbers && (
          <div className="flex items-center gap-2 text-xs text-graphite ml-6">
            <span>Operator:</span>
            <select
              value={boxOperation || ""}
              onChange={(e) => onLayoutChange({ wpBoxOperation: e.target.value })}
              className="text-xs border border-rule rounded px-2 py-1 font-mono font-bold bg-white"
            >
              <option value="">Leave blank for student to write</option>
              <option value="+">+ (Addition)</option>
              <option value="-">- (Subtraction)</option>
              <option value="×">× (Multiplication)</option>
            </select>
          </div>
        )}
        {showBox && !boxShowNumbers && (
          <label className="flex items-center gap-2 text-xs font-medium text-graphite">
            <input
              type="checkbox"
              checked={boxLabel}
              onChange={(e) => onLayoutChange({ wpBoxLabel: e.target.checked })}
              className="accent-ink"
            />
            Print the &ldquo;Working&rdquo; caption inside the box
          </label>
        )}
        {showBox && !boxShowNumbers && (
          <label className="flex items-center gap-2 text-xs font-medium text-graphite">
            <input
              type="checkbox"
              checked={boxGrid}
              onChange={(e) => onLayoutChange({ wpBoxGrid: e.target.checked })}
              className="accent-ink"
            />
            Rule the box into squares (one digit per cell)
          </label>
        )}
        {showBox && boxGrid && (
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-graphite">
              Rows
              <input
                type="number"
                min={1}
                max={20}
                value={boxRows}
                onChange={(e) =>
                  onLayoutChange({ wpBoxRows: Math.max(1, Math.min(20, Number(e.target.value) || 4)) })
                }
                className="w-16 px-2 py-2 min-h-[44px] lg:min-h-0 lg:py-1.5 border border-rule rounded text-xs focus:ring-2 focus:ring-ink focus:border-ink outline-none"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-graphite">
              Columns
              <input
                type="number"
                min={1}
                max={20}
                value={boxCols}
                onChange={(e) =>
                  onLayoutChange({ wpBoxCols: Math.max(1, Math.min(20, Number(e.target.value) || 5)) })
                }
                className="w-16 px-2 py-2 min-h-[44px] lg:min-h-0 lg:py-1.5 border border-rule rounded text-xs focus:ring-2 focus:ring-ink focus:border-ink outline-none"
              />
            </label>
          </div>
        )}
        {showBox && (
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-xs text-graphite">Box position:</label>
              <select
                value={boxPosition}
                onChange={(e) =>
                  onLayoutChange({ wpBoxPosition: e.target.value as "right" | "below" })
                }
                className="ml-2 text-xs border border-rule rounded px-2 py-1"
              >
                <option value="right">Right side</option>
                <option value="below">Below answer</option>
              </select>
            </div>
            {boxPosition === "right" && (
              <MiniSlider
                label="Box width"
                value={boxWidth}
                min={80}
                max={260}
                step={10}
                unit="pt"
                onChange={(v) => onLayoutChange({ wpBoxWidth: v })}
              />
            )}
            <MiniSlider
              label="Box height"
              value={boxHeight}
              min={40}
              max={180}
              step={10}
              unit="pt"
              onChange={(v) => onLayoutChange({ wpBoxHeight: v })}
            />
          </div>
        )}
      </div>

      <label className="block text-xs font-medium text-graphite mb-1">
        Problems
      </label>
      {items.map((item, i) => (
        <div key={item.id} className="mb-3 p-2 bg-paper rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-xs text-graphite w-5 shrink-0 pt-2">
              {labels[i]})
            </span>
            <TranslitTextarea
              value={item.content}
              onChange={(e) => onUpdate(item.id, { content: e.target.value })}
              rows={2}
              placeholder="Enter word problem..."
              className="flex-1 min-w-0 px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none bg-white resize-y"
            />
            <button
              onClick={() => onRemove(item.id)}
              className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 shrink-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
          <div className="mt-1.5 ml-7 flex items-center gap-4 flex-wrap">
            <label className="text-xs text-graphite flex items-center gap-1.5">
              Answer lines:
              <input
                type="number"
                value={item.lines ?? 2}
                onChange={(e) =>
                  onUpdate(item.id, {
                    lines: e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
                min={0}
                max={20}
                className="w-16 px-2 py-1 border border-rule rounded text-xs"
              />
            </label>
            {boxShowNumbers && (
              <div className="flex items-center gap-1.5 text-xs text-graphite">
                <span>Box numbers:</span>
                <input
                  type="text"
                  value={item.num1 ?? (item.nums?.[0] ?? (item.content?.match(/\b\d+\b/g)?.[0] ?? ""))}
                  onChange={(e) => {
                    const n1 = e.target.value;
                    const n2 = item.num2 ?? (item.nums?.[1] ?? (item.content?.match(/\b\d+\b/g)?.[1] ?? ""));
                    onUpdate(item.id, { num1: n1, num2: n2, nums: [n1, n2] });
                  }}
                  placeholder="e.g. 8"
                  className="w-12 px-1.5 py-0.5 border border-rule rounded text-xs text-center font-mono font-bold bg-white"
                />
                <span>,</span>
                <input
                  type="text"
                  value={item.num2 ?? (item.nums?.[1] ?? (item.content?.match(/\b\d+\b/g)?.[1] ?? ""))}
                  onChange={(e) => {
                    const n1 = item.num1 ?? (item.nums?.[0] ?? (item.content?.match(/\b\d+\b/g)?.[0] ?? ""));
                    const n2 = e.target.value;
                    onUpdate(item.id, { num1: n1, num2: n2, nums: [n1, n2] });
                  }}
                  placeholder="e.g. 2"
                  className="w-12 px-1.5 py-0.5 border border-rule rounded text-xs text-center font-mono font-bold bg-white"
                />
              </div>
            )}
          </div>
        </div>
      ))}
      <AddItemButton onClick={() => onAdd("")}>+ Add problem</AddItemButton>
    </div>
  );
}

function CompositionEditor({
  sentences,
  onUpdate,
}: {
  sentences: string[];
  onUpdate: (sentences: string[]) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-graphite mb-1">
        Sentences (use ___ for blanks)
      </label>
      <ItemList
        count={sentences.length}
        onAddItems={(lines) => onUpdate([...sentences, ...lines])}
        onPasteLines={(at, values) =>
          onUpdate([...sentences.slice(0, at), ...values, ...sentences.slice(at + 1)])
        }
      >
        {sentences.map((s, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <span className="text-xs text-graphite w-5 shrink-0">
              {i + 1})
            </span>
            <TranslitInput
              value={s}
              onChange={(e) => {
                const newS = [...sentences];
                newS[i] = e.target.value;
                onUpdate(newS);
              }}
              placeholder='e.g. My mother is very ___.'
              className="flex-1 px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
            />
            <button
              onClick={() => onUpdate(sentences.filter((_, j) => j !== i))}
              className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </ItemList>
      <AddItemButton onClick={() => onUpdate([...sentences, ""])}>
        + Add sentence
      </AddItemButton>
    </div>
  );
}

function PictureCompositionEditor({
  writingLines,
  onWritingLinesChange,
}: {
  writingLines: number;
  onWritingLinesChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="text-xs text-graphite flex items-center gap-1.5">
        Writing lines below the picture:
        <input
          type="number"
          value={writingLines}
          min={1}
          max={30}
          onChange={(e) => onWritingLinesChange(Number(e.target.value))}
          className="w-16 px-2 py-2 min-h-[44px] lg:min-h-0 lg:py-1 border border-rule rounded text-sm"
        />
      </label>
      <p className="text-[11px] text-graphite mt-2">
        Upload the picture below in <b>Question Images</b>. Writing lines use the
        global Single / Four-line setting.
      </p>
    </div>
  );
}

function HandwritingEditor({ items, onAdd, onUpdate, onRemove }: ItemEditorProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-graphite mb-1">
        Words / letters to copy
      </label>
      <ItemList
        count={items.length}
        onAddItems={(lines) => lines.forEach((l) => onAdd(l))}
        onPasteLines={(at, values) => {
          onUpdate(items[at].id, { content: values[0] });
          values.slice(1).forEach((v) => onAdd(v));
        }}
      >
        {items.map((item, i) => (
          <div key={item.id} className="mb-2 p-2 bg-paper rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs text-graphite w-5 shrink-0">{i + 1})</span>
              <TranslitTextarea
                value={item.content}
                onChange={(e) => onUpdate(item.id, { content: e.target.value })}
                placeholder="e.g. apple"
                className="flex-1 min-w-0 px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none bg-white"
                rows={1}
                autoGrow
              />
              <button
                onClick={() => onRemove(item.id)}
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 shrink-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-1.5 ml-7 flex items-center gap-2">
              <label className="text-xs text-graphite flex items-center gap-1.5">
                Rows:
                <input
                  type="number"
                  value={item.lines ?? 2}
                  min={1}
                  max={10}
                  onChange={(e) =>
                    onUpdate(item.id, {
                      lines: e.target.value === "" ? 1 : Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  className="w-16 px-2 py-1 border border-rule rounded text-xs bg-white"
                />
              </label>
            </div>
          </div>
        ))}
      </ItemList>
      <AddItemButton onClick={() => onAdd("")}>+ Add word</AddItemButton>
      <p className="text-[11px] text-graphite mt-1">
        Rows use the global Single / Four-line setting (set Four-line for class 1 &amp; 2).
      </p>
    </div>
  );
}

function DictationEditor({
  writingLines,
  columns,
  onWritingLinesChange,
  onColumnsChange,
}: {
  writingLines: number;
  columns: number;
  onWritingLinesChange: (n: number) => void;
  onColumnsChange: (c: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <label className="text-xs text-graphite flex items-center gap-1.5">
        Number of lines:
        <input
          type="number"
          value={writingLines}
          min={1}
          max={40}
          onChange={(e) => onWritingLinesChange(Number(e.target.value))}
          className="w-16 px-2 py-2 min-h-[44px] lg:min-h-0 lg:py-1 border border-rule rounded text-sm"
        />
      </label>
      <ColumnsSelect columns={columns} onColumnsChange={onColumnsChange} />
      <p className="text-[11px] text-graphite w-full">
        Numbered blank lines only — the teacher reads the words aloud. Ruling
        follows the global Single / Four-line setting.
      </p>
    </div>
  );
}

function DrawEditor({
  items,
  boxHeight,
  columns,
  writingLines,
  linesPosition = "below",
  onBoxHeightChange,
  onColumnsChange,
  onWritingLinesChange,
  onLinesPositionChange,
  onAdd,
  onUpdate,
  onRemove,
}: ItemEditorProps & {
  boxHeight: number;
  columns: number;
  writingLines: number;
  linesPosition?: "below" | "above";
  onBoxHeightChange: (h: number) => void;
  onColumnsChange: (c: number) => void;
  onWritingLinesChange: (lines: number) => void;
  onLinesPositionChange?: (pos: "below" | "above") => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-2">
        <label className="text-xs text-graphite flex items-center gap-1.5">
          Box height (pt):
          <input
            type="number"
            value={boxHeight}
            min={40}
            max={400}
            step={10}
            onChange={(e) => onBoxHeightChange(Number(e.target.value))}
            className="w-16 px-2 py-2 min-h-[44px] lg:min-h-0 lg:py-1 border border-rule rounded text-sm"
          />
        </label>
        <label className="text-xs text-graphite flex items-center gap-1.5">
          Writing lines:
          <input
            type="number"
            value={writingLines}
            min={0}
            max={15}
            step={1}
            onChange={(e) => onWritingLinesChange(Math.max(0, Number(e.target.value)))}
            className="w-16 px-2 py-2 min-h-[44px] lg:min-h-0 lg:py-1 border border-rule rounded text-sm"
          />
        </label>
        {onLinesPositionChange && (
          <label className="text-xs text-graphite flex items-center gap-1.5">
            Order:
            <select
              value={linesPosition || "below"}
              onChange={(e) => onLinesPositionChange(e.target.value as "below" | "above")}
              className="px-2 py-2 min-h-[44px] lg:min-h-0 lg:py-1 border border-rule rounded text-sm bg-white"
            >
              <option value="below">Box first, then lines</option>
              <option value="above">Lines first, then box</option>
            </select>
          </label>
        )}
        <ColumnsSelect columns={columns} onColumnsChange={onColumnsChange} />
      </div>
      <label className="block text-xs font-medium text-graphite mb-1">
        Prompts (one box each)
      </label>
      <ItemList
        count={items.length}
        onAddItems={(lines) => lines.forEach((l) => onAdd(l))}
        onPasteLines={(at, values) => {
          onUpdate(items[at].id, { content: values[0] });
          values.slice(1).forEach((v) => onAdd(v));
        }}
      >
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 mb-2">
            <span className="text-xs text-graphite w-5 shrink-0">{i + 1})</span>
            <TranslitTextarea
              value={item.content}
              onChange={(e) => onUpdate(item.id, { content: e.target.value })}
              placeholder="e.g. Draw a mango and colour it."
              className="flex-1 px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
              rows={1}
              autoGrow
            />
            <button
              onClick={() => onRemove(item.id)}
              className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </ItemList>
      <AddItemButton onClick={() => onAdd("")}>+ Add box</AddItemButton>
    </div>
  );
}

function LabelImageEditor({
  items,
  columns,
  onColumnsChange,
  onAdd,
  onRemove,
}: ItemEditorProps & { columns: number; onColumnsChange: (c: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-graphite">
          Number of label lines
        </label>
        <ColumnsSelect columns={columns} onColumnsChange={onColumnsChange} />
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {items.map((item, i) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1 text-xs bg-rule rounded px-2 py-1"
          >
            {i + 1}
            <button
              onClick={() => onRemove(item.id)}
              className="hover:text-red-500 text-graphite"
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <AddItemButton onClick={() => onAdd("")}>+ Add label line</AddItemButton>
      <p className="text-[11px] text-graphite mt-2">
        Upload the diagram below in <b>Question Images</b>. Each line is numbered
        for the student to write a label.
      </p>
    </div>
  );
}

/* ===== Image Upload Helpers ===== */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Question-level images editor — grid of images for the question */
function QuestionImagesEditor({
  images,
  imageColumns,
  onImagesChange,
  onColumnsChange,
}: {
  images: string[];
  imageColumns: number;
  onImagesChange: (imgs: string[]) => void;
  onColumnsChange: (c: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showSearch, setShowSearch] = useState(false);
  // Keep latest images in a ref so the (open) modal always appends to the
  // newest array even after several inserts.
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      newImages.push(await fileToBase64(files[i]));
    }
    onImagesChange([...images, ...newImages]);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-amber-800 flex items-center gap-1">
          <ImageIcon size={13} />
          Question Images
        </label>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-amber-700">
            Per row:
            <select
              value={imageColumns}
              onChange={(e) => onColumnsChange(Number(e.target.value))}
              className="ml-1 text-[10px] border border-amber-300 rounded px-1 py-0.5 bg-white"
            >
              {/* 1 gives a picture the full width — the usual case for picture
                  composition, where the old minimum of 2 forced a half column. */}
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
        </div>
      </div>

      {images.length > 0 && (
        <div
          className="grid gap-2 mb-2"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, Math.min(imageColumns, 3))}, 1fr)`,
          }}
        >
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img
                src={img}
                alt={`Image ${i + 1}`}
                className="w-full h-20 object-contain bg-white rounded border border-amber-200"
              />
              <button
                onClick={() => onImagesChange(images.filter((_, j) => j !== i))}
                className="absolute -top-2 -right-2 w-7 h-7 lg:w-5 lg:h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
              >
                <X size={14} className="lg:hidden" />
                <X size={10} className="hidden lg:block" />
              </button>
              <span className="absolute bottom-0.5 left-1 text-[9px] bg-black/50 text-white px-1 rounded">
                {i + 1})
              </span>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors justify-center active:scale-[0.98]"
        >
          <Search size={14} />
          Search Images
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors justify-center active:scale-[0.98]"
        >
          <ImagePlus size={14} />
          Upload
        </button>
      </div>
      <p className="text-[10px] text-amber-600 mt-1.5">
        Search free images (shapes, clocks, animals, diagrams…) or upload your own. They appear above the sub-items in print.
      </p>

      <ImageSearchModal
        open={showSearch}
        onClose={() => setShowSearch(false)}
        multiple
        onInsert={(dataUrl) => onImagesChange([...imagesRef.current, dataUrl])}
      />
    </div>
  );
}

/** Sub-item level image — single image attached to one item */
function SubItemImageUploader({
  image,
  imageWidth,
  onImageChange,
  onWidthChange,
  content,
  onContentChange,
}: {
  image?: string;
  imageWidth?: number;
  onImageChange: (img: string | undefined) => void;
  onWidthChange: (w: number) => void;
  // When provided, AI placeholders like "(Image of an apple)" surface a
  // one-click "Get picture: apple" button and are stripped on insert.
  content?: string;
  onContentChange?: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchSeed, setSearchSeed] = useState("");

  const placeholder = extractImagePlaceholder(content);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    onImageChange(base64);
    if (placeholder && onContentChange && content !== undefined) {
      onContentChange(stripImagePlaceholder(content));
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const openSearch = (seed: string) => {
    setSearchSeed(seed);
    setShowSearch(true);
  };

  const handleInsert = (dataUrl: string) => {
    onImageChange(dataUrl);
    if (placeholder && onContentChange && content !== undefined) {
      onContentChange(stripImagePlaceholder(content));
    }
  };

  if (image) {
    return (
      <div className="mt-1.5 ml-7 flex items-start gap-2">
        <div className="relative group">
          <img
            src={image}
            alt="Attached"
            className="h-16 object-contain bg-paper rounded border border-rule"
          />
          <button
            onClick={() => onImageChange(undefined)}
            className="absolute -top-2 -right-2 w-7 h-7 lg:w-5 lg:h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
          >
            <X size={10} />
          </button>
        </div>
        <label className="text-[10px] text-graphite shrink-0">
          Width (pt):
          <input
            type="number"
            value={imageWidth || 80}
            onChange={(e) => onWidthChange(Number(e.target.value))}
            min={30}
            max={300}
            className="w-16 px-2 py-2 min-h-[44px] lg:min-h-0 lg:w-12 lg:px-1 lg:py-0.5 border border-rule rounded text-[10px] ml-1"
          />
        </label>
      </div>
    );
  }

  return (
    <div className="mt-1 ml-7 flex flex-wrap items-center gap-2">
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      {placeholder && (
        <button
          onClick={() => openSearch(placeholder.subject)}
          className="flex items-center gap-1 text-[11px] font-medium text-white bg-ink hover:bg-ink/90 rounded-md px-2 py-1 transition-colors"
          title={`Search pictures for "${placeholder.subject}"`}
        >
          <Search size={11} />
          Get picture: {placeholder.subject}
        </button>
      )}
      <button
        onClick={() => openSearch("")}
        className="flex items-center gap-1 text-[10px] text-graphite hover:text-ink transition-colors"
      >
        <Search size={11} />
        {placeholder ? "Search other…" : "Search image"}
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1 text-[10px] text-graphite hover:text-ink transition-colors"
      >
        <ImagePlus size={11} />
        Upload
      </button>

      <ImageSearchModal
        open={showSearch}
        onClose={() => setShowSearch(false)}
        onInsert={handleInsert}
        initialQuery={searchSeed}
      />
    </div>
  );
}

// Compact labelled range slider used across the layout controls.
function MiniSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-graphite">
      <span className="whitespace-nowrap">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-ink w-24"
      />
      <span className="tabular-nums text-graphite w-10">
        {value}
        {unit}
      </span>
    </label>
  );
}

// Table / data-grid editor. Edit cells in a grid, add/remove rows & columns,
// toggle header row/column, set a caption, and adjust blank-cell height. Any
// sub-questions about the table are edited below as short answers.
function TableEditor({
  rows,
  caption,
  headerRow,
  headerCol,
  cellMinHeight,
  hideBorders,
  blankLine,
  onChange,
  items,
  onAddSubItem,
  onUpdateSubItem,
  onRemoveSubItem,
}: {
  rows: string[][];
  caption: string;
  headerRow: boolean;
  headerCol: boolean;
  cellMinHeight: number;
  hideBorders?: boolean;
  blankLine?: boolean;
  onChange: (u: Partial<Question>) => void;
  items: SubItem[];
  onAddSubItem: (content?: string) => void;
  onUpdateSubItem: (itemId: string, updates: Partial<SubItem>) => void;
  onRemoveSubItem: (itemId: string) => void;
}) {
  const cols = rows.reduce((m, r) => Math.max(m, r.length, 1), 1);
  // Normalize so every row has `cols` cells (keeps the grid rectangular).
  const grid: string[][] = rows.length
    ? rows.map((r) => {
        const out = [...r];
        while (out.length < cols) out.push("");
        return out;
      })
    : [Array(cols).fill("")];

  const setCell = (ri: number, ci: number, val: string) => {
    const next = grid.map((r) => [...r]);
    next[ri][ci] = val;
    onChange({ tableRows: next });
  };
  const addRow = () => onChange({ tableRows: [...grid, Array(cols).fill("")] });
  const removeRow = (ri: number) =>
    onChange({ tableRows: grid.filter((_, i) => i !== ri) });
  const addCol = () =>
    onChange({ tableRows: grid.map((r) => [...r, ""]) });
  const removeCol = (ci: number) =>
    onChange({ tableRows: grid.map((r) => r.filter((_, i) => i !== ci)) });

  return (
    <div>
      <label className="block text-xs font-medium text-graphite mb-1">
        Table caption (optional)
      </label>
      <TranslitInput
        value={caption}
        onChange={(e) => onChange({ tableCaption: e.target.value })}
        placeholder="e.g. Butterflies in the garden"
        className="w-full px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none mb-3"
      />

      <div className="flex flex-wrap items-center gap-3 mb-2 p-2 bg-ink/5/50 border border-ink/10 rounded-lg">
        <label className="text-xs font-medium text-graphite flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={headerRow}
            onChange={(e) => onChange({ tableHeaderRow: e.target.checked })}
          />
          Header row
        </label>
        <label className="text-xs font-medium text-graphite flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={headerCol}
            onChange={(e) => onChange({ tableHeaderCol: e.target.checked })}
          />
          Header column
        </label>
        <label className="text-xs font-medium text-graphite flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={hideBorders ?? false}
            onChange={(e) => onChange({ tableHideBorders: e.target.checked })}
          />
          Hide grid borders
        </label>
        <label className="text-xs font-medium text-graphite flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={blankLine ?? false}
            onChange={(e) => onChange({ tableBlankLine: e.target.checked })}
          />
          Underscore (_) in blank cells
        </label>
        <label className="text-xs text-graphite flex items-center gap-1">
          Cell height:
          <input
            type="number"
            value={cellMinHeight}
            min={14}
            max={120}
            onChange={(e) =>
              onChange({ tableCellMinHeight: Number(e.target.value) })
            }
            className="w-16 px-2 py-2 min-h-[44px] lg:min-h-0 lg:w-14 lg:px-1 lg:py-0.5 border border-rule rounded text-xs"
          />
          pt
        </label>
      </div>
      <p className="text-[10px] text-graphite mb-2">
        Leave a cell empty to make it a blank box the student fills in. Increase
        cell height to give room for drawing (e.g. pictographs).
      </p>

      {/* Cell grid */}
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <tbody>
            {grid.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="p-0.5">
                    <TranslitInput
                      value={cell}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      placeholder={
                        (headerRow && ri === 0) || (headerCol && ci === 0)
                          ? "header"
                          : "blank"
                      }
                      className={`w-24 px-2 py-1.5 border rounded text-sm outline-none focus:ring-2 focus:ring-ink ${
                        (headerRow && ri === 0) || (headerCol && ci === 0)
                          ? "border-graphite bg-rule font-semibold"
                          : "border-rule"
                      }`}
                    />
                  </td>
                ))}
                <td className="pl-1">
                  <button
                    onClick={() => removeRow(ri)}
                    disabled={grid.length <= 1}
                    className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 text-graphite hover:text-red-500 disabled:opacity-30"
                    title="Remove row"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {/* Column remove controls */}
            <tr>
              {Array.from({ length: cols }).map((_, ci) => (
                <td key={ci} className="text-center">
                  <button
                    onClick={() => removeCol(ci)}
                    disabled={cols <= 1}
                    className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 text-graphite hover:text-red-500 disabled:opacity-30"
                    title="Remove column"
                  >
                    <X size={13} />
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 mt-2">
        <AddItemButton
          onClick={addRow}
          className="border border-ink/20 rounded-lg hover:bg-ink/5"
        >
          <Plus size={13} /> Add row
        </AddItemButton>
        <AddItemButton
          onClick={addCol}
          className="border border-ink/20 rounded-lg hover:bg-ink/5"
        >
          <Plus size={13} /> Add column
        </AddItemButton>
      </div>

      {/* Sub-questions about the table (rendered below the grid) */}
      <div className="mt-4 pt-3 border-t border-rule">
        <label className="block text-xs font-medium text-graphite mb-1">
          Questions about the table (optional)
        </label>
        <ItemList
          count={items.length}
          onAddItems={(lines) => lines.forEach((l) => onAddSubItem(l))}
          onPasteLines={(at, values) => {
            onUpdateSubItem(items[at].id, { content: values[0] });
            values.slice(1).forEach((v) => onAddSubItem(v));
          }}
        >
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-2 mb-2">
              <span className="text-xs text-graphite w-5 shrink-0">{i + 1})</span>
              <TranslitTextarea
                value={item.content}
                onChange={(e) =>
                  onUpdateSubItem(item.id, { content: e.target.value })
                }
                placeholder="e.g. On which day does she see 16 butterflies?"
                className="flex-1 px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
                rows={1}
                autoGrow
              />
              <button
                onClick={() => onRemoveSubItem(item.id)}
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </ItemList>
        <AddItemButton onClick={() => onAddSubItem("")} className="hover:bg-ink/5 rounded-lg">
          <Plus size={13} /> Add question
        </AddItemButton>
      </div>
    </div>
  );
}

// Per-question spacing overrides. Collapsed by default; when "custom" is on the
// question ignores the paper-wide density preset for these three metrics.
function SpacingEditor({
  spacing,
  onChange,
}: {
  spacing?: import("@/lib/types").QuestionSpacing;
  onChange: (s: import("@/lib/types").QuestionSpacing | undefined) => void;
}) {
  const enabled = !!spacing;
  const v = spacing || {};
  return (
    <div className="mt-3 pt-3 border-t border-rule">
      <label className="flex items-center gap-2 text-xs font-medium text-graphite">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            onChange(e.target.checked ? { qGap: 12, itemGap: 6, ansHeight: 18 } : undefined)
          }
          className="accent-ink"
        />
        Custom spacing for this question (override paper density)
      </label>
      {enabled && (
        <div className="mt-2 flex items-center gap-4 flex-wrap pl-5">
          <MiniSlider
            label="Top gap"
            value={v.qGap ?? 12}
            min={0}
            max={36}
            step={2}
            unit="pt"
            onChange={(n) => onChange({ ...v, qGap: n })}
          />
          <MiniSlider
            label="Item gap"
            value={v.itemGap ?? 6}
            min={0}
            max={24}
            step={1}
            unit="pt"
            onChange={(n) => onChange({ ...v, itemGap: n })}
          />
          <MiniSlider
            label="Line height"
            value={v.ansHeight ?? 18}
            min={10}
            max={40}
            step={1}
            unit="pt"
            onChange={(n) => onChange({ ...v, ansHeight: n })}
          />
        </div>
      )}
    </div>
  );
}

// Editor for the freeform "custom" question type: an ordered list of
// text / ruled-lines / box / spacer blocks the teacher can mix freely.
function CustomBlocksEditor({
  blocks,
  onChange,
}: {
  blocks: import("@/lib/types").CustomBlock[];
  onChange: (b: import("@/lib/types").CustomBlock[]) => void;
}) {
  type Block = import("@/lib/types").CustomBlock;
  const kindLabel: Record<Block["kind"], string> = {
    text: "Text",
    lines: "Ruled lines",
    box: "Box",
    spacer: "Spacer",
  };

  function add(kind: Block["kind"]) {
    const b: Block =
      kind === "text"
        ? { id: newId(), kind, text: "", bold: false }
        : kind === "lines"
        ? { id: newId(), kind, lines: 2, ruling: "single" }
        : kind === "box"
        ? { id: newId(), kind, height: 100 }
        : { id: newId(), kind, height: 12 };
    onChange([...blocks, b]);
  }
  function update(id: string, patch: Partial<Block>) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function remove(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }
  function move(id: string, dir: -1 | 1) {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div>
      <label className="block text-xs font-medium text-graphite mb-1">
        Blocks (stacked top to bottom)
      </label>
      <div className="space-y-2">
        {blocks.map((b, i) => (
          <div key={b.id} className="p-2 bg-paper rounded-lg">
            <div className="flex items-center gap-2 mb-1.5">
              <GripHorizontal size={14} className="text-rule" />
              <span className="text-xs font-semibold text-graphite">
                {kindLabel[b.kind]}
              </span>
              <div className="flex-1" />
              <button
                onClick={() => move(b.id, -1)}
                disabled={i === 0}
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-rule rounded disabled:opacity-30"
              >
                <ChevronUp size={13} className="text-graphite" />
              </button>
              <button
                onClick={() => move(b.id, 1)}
                disabled={i === blocks.length - 1}
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-rule rounded disabled:opacity-30"
              >
                <ChevronDown size={13} className="text-graphite" />
              </button>
              <button
                onClick={() => remove(b.id)}
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>

            {b.kind === "text" && (
              <div className="flex items-start gap-2">
                <TranslitTextarea
                  value={b.text || ""}
                  onChange={(e) => update(b.id, { text: e.target.value })}
                  rows={2}
                  placeholder="Text (use ___ for a blank)"
                  className="flex-1 px-2 py-1.5 border border-rule rounded text-sm bg-white focus:ring-2 focus:ring-ink outline-none resize-y"
                />
                <label className="text-xs text-graphite flex items-center gap-1 pt-1.5">
                  <input
                    type="checkbox"
                    checked={!!b.bold}
                    onChange={(e) => update(b.id, { bold: e.target.checked })}
                    className="accent-ink"
                  />
                  Bold
                </label>
              </div>
            )}
            {b.kind === "lines" && (
              <div className="flex items-center gap-4 flex-wrap">
                <label className="text-xs text-graphite flex items-center gap-1">
                  Rows:
                  <input
                    type="number"
                    value={b.lines || 1}
                    min={1}
                    max={20}
                    onChange={(e) => update(b.id, { lines: Number(e.target.value) })}
                    className="w-16 px-2 py-2 min-h-[44px] lg:min-h-0 lg:w-12 lg:px-1 lg:py-0.5 border border-rule rounded text-xs"
                  />
                </label>
                <label className="text-xs text-graphite">
                  Ruling:
                  <select
                    value={b.ruling || "single"}
                    onChange={(e) =>
                      update(b.id, { ruling: e.target.value as "single" | "four-line" })
                    }
                    className="ml-1 text-xs border border-rule rounded px-1.5 py-0.5"
                  >
                    <option value="single">Single line</option>
                    <option value="four-line">Four line</option>
                  </select>
                </label>
              </div>
            )}
            {(b.kind === "box" || b.kind === "spacer") && (
              <MiniSlider
                label="Height"
                value={b.height || (b.kind === "box" ? 100 : 12)}
                min={b.kind === "box" ? 30 : 4}
                max={b.kind === "box" ? 300 : 60}
                step={b.kind === "box" ? 10 : 2}
                unit="pt"
                onChange={(v) => update(b.id, { height: v })}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {(["text", "lines", "box", "spacer"] as Block["kind"][]).map((k) => (
          <AddItemButton
            key={k}
            onClick={() => add(k)}
            className="border border-ink/20 hover:bg-ink/5 rounded-lg transition-colors"
          >
            + {kindLabel[k]}
          </AddItemButton>
        ))}
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const map = {
    idle: { icon: null, text: "", cls: "text-graphite" },
    loading: { icon: <Loader2 size={13} className="animate-spin" />, text: "Loading…", cls: "text-graphite" },
    saving: { icon: <Loader2 size={13} className="animate-spin" />, text: "Saving…", cls: "text-graphite" },
    saved: { icon: <Check size={13} />, text: "Saved", cls: "text-green-600" },
    error: { icon: <CloudOff size={13} />, text: "Save failed", cls: "text-red-600" },
  }[state];
  if (!map.text) return null;
  return (
    <span className={`flex items-center gap-1 text-xs ${map.cls}`}>
      {map.icon}
      {/* A failure has to read as a failure on a phone too — hiding the words
          left "Save failed" as an unlabelled cloud glyph. */}
      <span className={state === "error" ? "" : "hidden sm:inline"}>{map.text}</span>
    </span>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={null}>
      <BuilderInner />
    </Suspense>
  );
}

// Compact labelled checkbox used by the per-question option rows below.
function OptionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-graphite cursor-pointer min-h-[40px] lg:min-h-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-ink"
      />
      {label}
    </label>
  );
}


// Per-column alignment for the table question. Columns are derived from the
// widest row, so this stays in step as the teacher adds columns.
function TableAlignEditor({
  rows,
  align,
  alignDefault,
  onAlignChange,
  onDefaultChange,
}: {
  rows: string[][];
  align: CellAlign[];
  alignDefault: CellAlign;
  onAlignChange: (align: CellAlign[]) => void;
  onDefaultChange: (a: CellAlign) => void;
}) {
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  if (cols === 0) return null;

  const setCol = (ci: number, value: CellAlign) => {
    const next = [...align];
    while (next.length < cols) next.push(alignDefault);
    next[ci] = value;
    onAlignChange(next);
  };

  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
        <label className="flex items-center gap-2 text-xs text-graphite">
          Default alignment
          <select
            value={alignDefault}
            onChange={(e) => onDefaultChange(e.target.value as CellAlign)}
            className="px-2 py-2 lg:py-1.5 min-h-[40px] lg:min-h-0 border border-rule rounded-lg text-xs bg-white focus:ring-2 focus:ring-ink focus:border-ink outline-none"
          >
            {CELL_ALIGN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => onAlignChange([])}
          className="text-xs text-graphite hover:text-ink underline min-h-[40px] lg:min-h-0"
        >
          Reset columns
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: cols }).map((_, ci) => (
          <label key={ci} className="text-xs text-graphite">
            <span className="block mb-1">Col {ci + 1}</span>
            <select
              value={align[ci] ?? alignDefault}
              onChange={(e) => setCol(ci, e.target.value as CellAlign)}
              className="px-2 py-2 lg:py-1.5 min-h-[40px] lg:min-h-0 border border-rule rounded-lg text-xs bg-white focus:ring-2 focus:ring-ink focus:border-ink outline-none"
            >
              {CELL_ALIGN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}


/* ===== Editors for the reasoning / source-based question types ===== */

// Generic numbered list of single-line items. Used by "rearrange" and the
// diagram legend, which differ only in wording.
function SimpleListEditor({
  label,
  addLabel,
  placeholder,
  items,
  columns,
  onColumnsChange,
  onAdd,
  onUpdateItem,
  onRemove,
}: {
  label: string;
  addLabel: string;
  placeholder: string;
  items: SubItem[];
  columns?: number;
  onColumnsChange?: (c: number) => void;
  onAdd: (content: string) => void;
  onUpdateItem: (id: string, updates: Partial<SubItem>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <label className="block text-xs font-medium text-graphite">{label}</label>
        {columns != null && onColumnsChange && (
          <ColumnsSelect columns={columns} onColumnsChange={onColumnsChange} />
        )}
      </div>
      <ItemList
        count={items.length}
        onAddItems={(lines) => lines.forEach((l) => onAdd(l))}
        onPasteLines={(at, values) => {
          onUpdateItem(items[at].id, { content: values[0] });
          values.slice(1).forEach((v) => onAdd(v));
        }}
      >
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 mb-2">
            <span className="text-xs text-graphite w-5 shrink-0">{i + 1}.</span>
            <TranslitTextarea
              value={item.content}
              onChange={(e) => onUpdateItem(item.id, { content: e.target.value })}
              placeholder={placeholder}
              className="flex-1 px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
              rows={1}
              autoGrow
            />
            <button
              onClick={() => onRemove(item.id)}
              className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </ItemList>
      <AddItemButton onClick={() => onAdd("")}>{addLabel}</AddItemButton>
    </div>
  );
}

// Assertion & Reason: two lines per item, so it needs its own editor rather
// than the generic list.
function AssertionReasonEditor({
  items,
  onAdd,
  onUpdate,
  onRemove,
}: ItemEditorProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-graphite mb-1">
        Assertion &amp; Reason pairs
      </label>
      {/* Two fields per pair, so Enter walks A → R → the next pair. */}
      <ItemList
        count={items.length}
        onAddItems={(lines) => lines.forEach((l) => onAdd(l))}
        onPasteLines={(at, values) => {
          const item = items[Math.floor(at / 2)];
          onUpdate(item.id, at % 2 ? { secondary: values[0] } : { content: values[0] });
          values.slice(1).forEach((v) => onAdd(v));
        }}
      >
        {items.map((item, i) => (
          <div key={item.id} className="border border-rule rounded-lg p-2.5 mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-graphite">Pair {i + 1}</span>
              <button
                onClick={() => onRemove(item.id)}
                className="min-h-[40px] min-w-[40px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
            <TranslitTextarea
              value={item.content}
              onChange={(e) => onUpdate(item.id, { content: e.target.value })}
              placeholder="Assertion (A)…"
              className="w-full mb-2 px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
              rows={1}
              autoGrow
            />
            <TranslitTextarea
              value={item.secondary || ""}
              onChange={(e) => onUpdate(item.id, { secondary: e.target.value })}
              placeholder="Reason (R)…"
              className="w-full px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
              rows={1}
              autoGrow
            />
          </div>
        ))}
      </ItemList>
      <AddItemButton onClick={() => onAdd("")}>+ Add pair</AddItemButton>
      <p className="text-[11px] text-graphite mt-2">
        The four standard options print automatically under every pair.
      </p>
    </div>
  );
}

// Case study: the source text plus its sub-questions.
function CaseStudyEditor({
  passage,
  sourceLabel,
  roman,
  onMeta,
  items,
  onAdd,
  onUpdate,
  onRemove,
}: ItemEditorProps & {
  passage: string;
  sourceLabel: string;
  roman: boolean;
  onMeta: (u: Partial<Question>) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-graphite mb-1">
        Source heading
      </label>
      <TranslitInput
        value={sourceLabel}
        onChange={(e) => onMeta({ caseSourceLabel: e.target.value })}
        placeholder="Read the source given below:"
        className="w-full mb-3 px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
      />

      <label className="block text-xs font-medium text-graphite mb-1">
        Source / case text
      </label>
      <TranslitTextarea
        value={passage}
        onChange={(e) => onMeta({ passage: e.target.value })}
        rows={5}
        placeholder="Paste the passage, data or extract the questions refer to…"
        className="w-full mb-3 px-3 py-2 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
      />

      <div className="mb-3">
        <OptionToggle
          label="Number sub-questions (i) (ii) (iii)"
          checked={roman}
          onChange={(v) => onMeta({ caseRomanNumerals: v })}
        />
      </div>

      <label className="block text-xs font-medium text-graphite mb-1">
        Sub-questions
      </label>
      <ItemList
        count={items.length}
        onAddItems={(lines) => lines.forEach((l) => onAdd(l))}
        onPasteLines={(at, values) => {
          onUpdate(items[at].id, { content: values[0] });
          values.slice(1).forEach((v) => onAdd(v));
        }}
      >
        {items.map((item, i) => (
          <div key={item.id} className="mb-2 p-2 bg-paper rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs text-graphite w-6 shrink-0">
                ({roman ? romanNumeral(i + 1) : i + 1})
              </span>
              <TranslitTextarea
                value={item.content}
                onChange={(e) => onUpdate(item.id, { content: e.target.value })}
                placeholder="Sub-question…"
                className="flex-1 min-w-0 px-3 py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none bg-white"
                rows={1}
                autoGrow
              />
              <button
                onClick={() => onRemove(item.id)}
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 shrink-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-1.5 ml-8 flex items-center gap-2">
              <label className="text-xs text-graphite flex items-center gap-1.5" title="Answer lines (0 for none)">
                Answer lines (0 for none):
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={item.lines ?? 1}
                  onChange={(e) =>
                    onUpdate(item.id, {
                      lines: e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="w-16 px-2 py-1 border border-rule rounded text-xs bg-white"
                />
              </label>
            </div>
          </div>
        ))}
      </ItemList>
      <AddItemButton onClick={() => onAdd("")}>+ Add sub-question</AddItemButton>
    </div>
  );
}

// Odd one out: each item is a group of choices on one line.
function OddOneOutEditor({
  items,
  columns,
  onColumnsChange,
  onAdd,
  onUpdate,
  onRemove,
}: ItemEditorProps & { columns: number; onColumnsChange: (c: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <label className="block text-xs font-medium text-graphite">
          Groups — the odd word is just one of the choices
        </label>
        <ColumnsSelect columns={columns} onColumnsChange={onColumnsChange} />
      </div>
      {items.map((item, i) => (
        <div key={item.id} className="border border-rule rounded-lg p-2.5 mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-graphite">Group {i + 1}</span>
            <button
              onClick={() => onRemove(item.id)}
              className="min-h-[40px] min-w-[40px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
          <ItemList
            count={(item.options ?? []).length}
            onAddItems={(lines) =>
              onUpdate(item.id, { options: [...(item.options ?? []), ...lines] })
            }
            onPasteLines={(at, values) => {
              const opts = item.options ?? [];
              onUpdate(item.id, {
                options: [...opts.slice(0, at), ...values, ...opts.slice(at + 1)],
              });
            }}
            className="flex flex-wrap gap-2"
          >
            {(item.options ?? []).map((o, oi) => (
              <div key={oi} className="flex items-center gap-1 flex-1 min-w-[44%]">
                <TranslitInput
                  value={o}
                  onChange={(e) => {
                    const next = [...(item.options ?? [])];
                    next[oi] = e.target.value;
                    onUpdate(item.id, { options: next });
                  }}
                  placeholder={`Choice ${oi + 1}`}
                  className="w-full px-2 py-2.5 min-h-[44px] lg:min-h-0 lg:py-1.5 border border-rule rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
                />
                <button
                  onClick={() =>
                    onUpdate(item.id, {
                      options: (item.options ?? []).filter((_, j) => j !== oi),
                    })
                  }
                  className="min-h-[40px] min-w-[40px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 text-graphite hover:text-red-500 rounded"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </ItemList>
          <AddItemButton
            onClick={() =>
              onUpdate(item.id, { options: [...(item.options ?? []), ""] })
            }
          >
            + Add choice
          </AddItemButton>
        </div>
      ))}
      <AddItemButton onClick={() => onAdd("")}>+ Add group</AddItemButton>
    </div>
  );
}

// Word search: the word list, plus grid generation. The grid is stored on the
// question rather than regenerated at render time, so the printed sheet always
// matches the preview.
function WordSearchEditor({
  items,
  grid,
  columns,
  onColumnsChange,
  onGrid,
  onAdd,
  onUpdateItem,
  onRemove,
}: {
  items: SubItem[];
  grid: string[][];
  columns: number;
  onColumnsChange: (c: number) => void;
  onGrid: (grid: string[][]) => void;
  onAdd: (content: string) => void;
  onUpdateItem: (id: string, updates: Partial<SubItem>) => void;
  onRemove: (id: string) => void;
}) {
  const [size, setSize] = useState(12);
  const [note, setNote] = useState<string | null>(null);

  function generate() {
    const words = items.map((i) => i.content).filter((w) => w.trim());
    if (words.length === 0) {
      setNote("Add a few words first.");
      return;
    }
    // Seed from the word list so the same words always give the same grid, but
    // a changed list produces a fresh one.
    const seed = words.join("|").split("").reduce((a, c) => a + c.charCodeAt(0), 7);
    const { grid: g, skipped } = buildWordSearch(words, size, seed);
    onGrid(g);
    setNote(
      skipped.length
        ? `Grid made. Too long to fit: ${skipped.join(", ")} — try a bigger grid.`
        : `Grid made — ${words.length} words placed.`
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <label className="block text-xs font-medium text-graphite">
          Words to hide
        </label>
        <ColumnsSelect columns={columns} onColumnsChange={onColumnsChange} />
      </div>
      <ItemList
        count={items.length}
        onAddItems={(lines) => lines.forEach((l) => onAdd(l))}
        onPasteLines={(at, values) => {
          onUpdateItem(items[at].id, { content: values[0] });
          values.slice(1).forEach((v) => onAdd(v));
        }}
      >
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 mb-2">
            <span className="text-xs text-graphite w-5 shrink-0">{i + 1}.</span>
            <input
              type="text"
              value={item.content}
              onChange={(e) => onUpdateItem(item.id, { content: e.target.value })}
              placeholder="RIVER"
              className="flex-1 px-3 py-1.5 border border-rule rounded-lg text-sm uppercase focus:ring-2 focus:ring-ink focus:border-ink outline-none"
            />
            <button
              onClick={() => onRemove(item.id)}
              className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 inline-flex items-center justify-center p-1 hover:bg-red-50 rounded text-graphite hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </ItemList>
      <AddItemButton onClick={() => onAdd("")}>+ Add word</AddItemButton>

      <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-rule">
        <label className="flex items-center gap-2 text-xs text-graphite">
          Grid size
          <input
            type="number"
            min={5}
            max={20}
            value={size}
            onChange={(e) => setSize(Math.max(5, Math.min(20, Number(e.target.value) || 12)))}
            className="w-16 px-2 py-2 lg:py-1.5 min-h-[44px] lg:min-h-0 border border-rule rounded-lg text-xs focus:ring-2 focus:ring-ink focus:border-ink outline-none"
          />
        </label>
        <button
          onClick={generate}
          className="px-3 py-2 lg:py-1.5 min-h-[44px] lg:min-h-0 text-xs font-semibold bg-ink text-white rounded-lg hover:bg-ink/90"
        >
          {grid.length ? "Regenerate grid" : "Generate grid"}
        </button>
        {grid.length > 0 && (
          <span className="text-xs text-graphite">
            {grid.length}×{grid[0]?.length ?? 0} grid ready
          </span>
        )}
      </div>
      {note && <p className="text-[11px] text-graphite mt-2">{note}</p>}
      {grid.length === 0 && (
        <p className="text-[11px] text-graphite mt-2">
          Nothing prints until you generate the grid.
        </p>
      )}
    </div>
  );
}
