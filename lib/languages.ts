// ===== Single source of truth for every supported paper language =====
//
// Add a language = add ONE entry here (+ load its script font once in
// app/layout.tsx if the script is new). Everything else — the builder dropdown,
// header labels, default question titles, print fonts, scan enum, and the
// Roman->script transliteration input — derives from this file.
//
// `titles` / `copy` are OPTIONAL. When a language hasn't had its strings
// translated & verified by a native speaker yet, it simply falls back to
// English labels — while the paper CONTENT the teacher types still renders in
// the correct script, transliteration still works, and scan still reads it. So
// a language is "usable" the moment it's registered; translating the fixed UI
// strings is a follow-up that can't break anything.

import type { QuestionType } from "./types";

// A writing system. Languages that share a script share a font.
export type ScriptKey =
  | "latin"
  | "devanagari"
  | "bengali"
  | "gujarati"
  | "gurmukhi"
  | "tamil"
  | "telugu"
  | "kannada"
  | "malayalam"
  | "odia"
  | "nastaliq" // Perso-Arabic (Urdu/Sindhi/Kashmiri) — right-to-left
  | "olchiki"
  | "meitei";

// Font wiring for a script: the CSS variables next/font exposes (see
// app/layout.tsx) plus real OS fonts to fall back to (so the print pop-up, which
// can't see next/font's @font-face, still renders instead of showing tofu).
export interface ScriptFont {
  serifVar?: string;
  sansVar?: string;
  os: string[];
}

export const SCRIPT_FONT: Record<ScriptKey, ScriptFont> = {
  latin: { os: [] },
  devanagari: {
    serifVar: "--font-devanagari-serif",
    sansVar: "--font-devanagari-sans",
    os: ["Nirmala UI", "Kohinoor Devanagari", "Mangal"],
  },
  bengali: { sansVar: "--font-bengali", os: ["Nirmala UI", "Kohinoor Bangla", "Vrinda"] },
  gujarati: { sansVar: "--font-gujarati", os: ["Nirmala UI", "Gujarati Sangam MN", "Shruti"] },
  gurmukhi: { sansVar: "--font-gurmukhi", os: ["Nirmala UI", "Gurmukhi MN", "Raavi"] },
  tamil: { sansVar: "--font-tamil", os: ["Nirmala UI", "Tamil Sangam MN", "Latha"] },
  telugu: { sansVar: "--font-telugu", os: ["Nirmala UI", "Telugu Sangam MN", "Gautami"] },
  kannada: { sansVar: "--font-kannada", os: ["Nirmala UI", "Kannada Sangam MN", "Tunga"] },
  malayalam: { sansVar: "--font-malayalam", os: ["Nirmala UI", "Malayalam Sangam MN", "Kartika"] },
  odia: { sansVar: "--font-odia", os: ["Nirmala UI", "Oriya Sangam MN", "Kalinga"] },
  nastaliq: { sansVar: "--font-urdu", os: ["Noto Nastaliq Urdu", "Urdu Typesetting", "Nirmala UI"] },
  olchiki: { sansVar: "--font-olchiki", os: ["Noto Sans Ol Chiki"] },
  meitei: { sansVar: "--font-meitei", os: ["Noto Sans Meetei Mayek", "Nirmala UI"] },
};

// Native digit characters for each script, indexed 0–9.
// Latin is null → numbers pass through unchanged.
const SCRIPT_NUMERALS: Record<ScriptKey, string | null> = {
  latin:      null,
  devanagari: "०१२३४५६७८९",
  bengali:    "০১২৩৪৫৬৭৮৯",
  gujarati:   "૦૧૨૩૪૫૬૭૮૯",
  gurmukhi:   "੦੧੨੩੪੫੬੭੮੯",
  tamil:      "௦௧௨௩௪௫௬௭௮௯",
  telugu:     "౦౧౨౩౪౫౬౭౮౯",
  kannada:    "೦೧೨೩೪೫೬೭೮೯",
  malayalam:  "൦൧൨൩൪൫൬൭൮൯",
  odia:       "୦୧୨୩୪୫୬୭୮୯",
  nastaliq:   "۰۱۲۳۴۵۶۷۸۹",
  olchiki:    "᱐᱑᱒᱓᱔᱕᱖᱗᱘᱙",
  meitei:     "꯰꯱꯲꯳꯴꯵꯶꯷꯸꯹",
};

/**
 * Replace every Western Arabic digit (0-9) in `value` with the native digit
 * of `language`'s script. Returns the string unchanged for Latin-script
 * languages (English).
 */
export function localizeNumber(
  value: number | string,
  language: PaperLanguage,
): string {
  const digits = SCRIPT_NUMERALS[LANGUAGES[language].script];
  if (!digits) return String(value);
  return String(value).replace(/[0-9]/g, (d) => digits[Number(d)]);
}

// Header / boilerplate labels printed on every paper.
export interface PaperCopy {
  name: string;
  rollNo: string;
  marks: string;
  subject: string;
  classLabel: string;
  date: string;
  /** Header field labels added later — untranslated languages fall back to
      ENGLISH_COPY via the spread in copyFor(). */
  timeLabel: string;
  sectionLabel: string;
  working: string;
  questions: string;
  /** Heading on the answer-key sheet, printed only when the teacher asks for one. */
  answerKeyTitle: string;
  /** Heading for the general instructions block. */
  instructionsTitle: string;
  /** Prefix for student write-in answer lines (e.g. 'Ans', 'उत्तर'). */
  answerPrefix: string;
}

export interface LanguageDef {
  label: string; // English name shown in the builder dropdown
  native?: string; // endonym (for reference / future UI)
  script: ScriptKey;
  // Google Input Tools transliteration code (Roman -> script as you type).
  // null = no phonetic input for this language; the teacher types the script
  // directly (OS keyboard / paste) and everything else still works.
  itc: string | null;
  dir: "ltr" | "rtl";
  titles?: Partial<Record<QuestionType, string>>;
  copy?: Partial<PaperCopy>;
}

// English default question titles — the fallback base every language builds on.
export const DEFAULT_TITLES: Record<QuestionType, string> = {
  "fill-blanks": "Fill in the blanks:",
  "short-answer": "Answer the following questions:",
  "long-answer": "Answer in detail:",
  mcq: "Choose the correct answer:",
  match: "Match the following:",
  "true-false": "State whether True or False:",
  "math-vertical": "Solve the following:",
  comprehension: "Read the passage and answer the questions:",
  "word-problem": "Solve the real life problems:",
  composition: "Complete the following essay:",
  "picture-composition": "Look at the picture and write a few sentences:",
  handwriting: "Copy the words neatly:",
  dictation: "Dictation — write the words your teacher reads:",
  draw: "Draw and colour:",
  "label-image": "Label the picture:",
  table: "Study the table and answer:",
  "assertion-reason":
    "Read the Assertion (A) and Reason (R) and choose the correct option:",
  "case-study": "Read the given source and answer the questions:",
  "diagram-label": "Label the parts marked in the diagram:",
  "odd-one-out": "Circle the odd one out:",
  rearrange: "Rearrange the words to make a correct sentence:",
  "word-search": "Find and circle the hidden words:",
  custom: "Answer the following:",
};

export const ENGLISH_COPY: PaperCopy = {
  name: "Name :",
  rollNo: "Roll No:",
  marks: "Marks",
  subject: "Subject :",
  classLabel: "Class -",
  date: "Date :",
  timeLabel: "Time :",
  sectionLabel: "Section :",
  working: "Working",
  questions: "Questions:",
  answerKeyTitle: "Answer Key",
  instructionsTitle: "General Instructions:",
  answerPrefix: "Ans",
};

// Hindi (Devanagari) — fully translated.
const HINDI_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "रिक्त स्थान भरिए:",
  "short-answer": "निम्न प्रश्नों के उत्तर दीजिए:",
  "long-answer": "विस्तार से उत्तर दीजिए:",
  mcq: "सही उत्तर चुनिए:",
  match: "मिलान कीजिए:",
  "true-false": "सत्य या असत्य लिखिए:",
  "math-vertical": "निम्नलिखित हल कीजिए:",
  comprehension: "गद्यांश पढ़िए और प्रश्नों के उत्तर दीजिए:",
  "word-problem": "शब्द समस्याएँ हल कीजिए:",
  composition: "निबंध पूरा कीजिए:",
  "picture-composition": "चित्र देखकर कुछ वाक्य लिखिए:",
  handwriting: "शब्द सुंदर लिखिए:",
  dictation: "श्रुतलेख:",
  draw: "चित्र बनाएँ और रंग भरिए:",
  "label-image": "चित्र के भागों के नाम लिखिए:",
  table: "तालिका देखकर उत्तर दीजिए:",
  custom: "निम्नलिखित उत्तर दीजिए:",
};
const HINDI_COPY: Partial<PaperCopy> = {
  name: "नाम :",
  rollNo: "रोल नंबर:",
  marks: "अंक",
  subject: "विषय :",
  classLabel: "कक्षा -",
  date: "दिनांक :",
  working: "कार्य",
  questions: "प्रश्न:",
  answerKeyTitle: "उत्तर सूची",
  instructionsTitle: "सामान्य निर्देश:",
  answerPrefix: "उत्तर",
};

// Marathi (Devanagari) — fully translated.
const MARATHI_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "रिकाम्या जागा भरा:",
  "short-answer": "खालील प्रश्नांची उत्तरे द्या:",
  "long-answer": "सविस्तर उत्तरे द्या:",
  mcq: "योग्य पर्याय निवडा:",
  match: "जोड्या लावा:",
  "true-false": "खरे की खोटे लिहा:",
  "math-vertical": "खालील उदाहरणे सोडवा:",
  comprehension: "गद्य वाचा आणि प्रश्नांची उत्तरे द्या:",
  "word-problem": "शब्दप्रश्न सोडवा:",
  composition: "निबंध पूर्ण करा:",
  "picture-composition": "चित्र पाहून काही वाक्ये लिहा:",
  handwriting: "शब्द स्वच्छ लिहा:",
  dictation: "श्रुतलेखन:",
  draw: "चित्र काढा आणि रंगवा:",
  "label-image": "चित्रातील भागांना लेबल द्या:",
  table: "तक्ता पाहून उत्तरे द्या:",
  custom: "खालील उत्तर द्या:",
};
const MARATHI_COPY: Partial<PaperCopy> = {
  name: "नाव :",
  rollNo: "हजेरी क्रमांक:",
  marks: "गुण",
  subject: "विषय :",
  classLabel: "इयत्ता -",
  date: "दिनांक :",
  working: "काम",
  questions: "प्रश्न:",
  answerKeyTitle: "उत्तरसूची",
  instructionsTitle: "सर्वसाधारण सूचना:",
  answerPrefix: "उत्तर",
};

// ===== Batch 1 drafts (2026-07-16) — Tamil, Telugu, Kannada, Bengali,
// Gujarati. Machine-drafted standard exam-paper phrasing; PENDING native-speaker
// verification before production. Any string a teacher corrects just replaces
// the value here. =====

const TAMIL_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "கோடிட்ட இடங்களை நிரப்புக:",
  "short-answer": "பின்வரும் வினாக்களுக்கு விடையளிக்கவும்:",
  "long-answer": "விரிவாக விடையளிக்கவும்:",
  mcq: "சரியான விடையைத் தேர்ந்தெடுக்கவும்:",
  match: "பொருத்துக:",
  "true-false": "சரியா தவறா எனக் குறிப்பிடுக:",
  "math-vertical": "பின்வரும் கணக்குகளைச் செய்க:",
  comprehension: "பத்தியைப் படித்து வினாக்களுக்கு விடையளிக்கவும்:",
  "word-problem": "வாழ்க்கை நிகழ்வுக் கணக்குகளைத் தீர்க்கவும்:",
  composition: "பின்வரும் கட்டுரையை நிறைவு செய்க:",
  "picture-composition": "படத்தைப் பார்த்து சில வாக்கியங்களை எழுதுக:",
  handwriting: "சொற்களை நேர்த்தியாக எழுதுக:",
  dictation: "சொல்வதெழுதல் — ஆசிரியர் வாசிக்கும் சொற்களை எழுதுக:",
  draw: "வரைந்து வண்ணம் தீட்டுக:",
  "label-image": "படத்தின் பாகங்களைக் குறிக்கவும்:",
  table: "அட்டவணையைப் பார்த்து விடையளிக்கவும்:",
  custom: "பின்வருவனவற்றிற்கு விடையளிக்கவும்:",
};
const TAMIL_COPY: Partial<PaperCopy> = {
  name: "பெயர் :",
  rollNo: "வரிசை எண்:",
  marks: "மதிப்பெண்கள்",
  subject: "பாடம் :",
  classLabel: "வகுப்பு -",
  date: "தேதி :",
  working: "கணக்கீடு",
  questions: "வினாக்கள்:",
  instructionsTitle: "பொதுவான அறிவுறுத்தல்கள்:",
};

const TELUGU_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "ఖాళీలను పూరించండి:",
  "short-answer": "కింది ప్రశ్నలకు సమాధానాలు రాయండి:",
  "long-answer": "వివరంగా సమాధానం రాయండి:",
  mcq: "సరైన సమాధానాన్ని ఎంచుకోండి:",
  match: "జతపరచండి:",
  "true-false": "ఒప్పా తప్పా తెలపండి:",
  "math-vertical": "కింది లెక్కలను సాధించండి:",
  comprehension: "గద్యాన్ని చదివి ప్రశ్నలకు సమాధానాలు రాయండి:",
  "word-problem": "నిజ జీవిత సమస్యలను సాధించండి:",
  composition: "కింది వ్యాసాన్ని పూర్తి చేయండి:",
  "picture-composition": "చిత్రాన్ని చూసి కొన్ని వాక్యాలు రాయండి:",
  handwriting: "పదాలను శుభ్రంగా రాయండి:",
  dictation: "శ్రుతలేఖనం — ఉపాధ్యాయుడు చదివే పదాలను రాయండి:",
  draw: "గీసి రంగులు వేయండి:",
  "label-image": "చిత్రంలోని భాగాలను గుర్తించండి:",
  table: "పట్టికను చూసి సమాధానాలు రాయండి:",
  custom: "కింది వాటికి సమాధానాలు రాయండి:",
};
const TELUGU_COPY: Partial<PaperCopy> = {
  name: "పేరు :",
  rollNo: "రోల్ నెం:",
  marks: "మార్కులు",
  subject: "విషయం :",
  classLabel: "తరగతి -",
  date: "తేదీ :",
  working: "గణన",
  questions: "ప్రశ్నలు:",
  instructionsTitle: "సాధారణ సూచనలు:",
};

const KANNADA_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "ಬಿಟ್ಟ ಸ್ಥಳಗಳನ್ನು ತುಂಬಿರಿ:",
  "short-answer": "ಕೆಳಗಿನ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ:",
  "long-answer": "ವಿವರವಾಗಿ ಉತ್ತರಿಸಿ:",
  mcq: "ಸರಿಯಾದ ಉತ್ತರವನ್ನು ಆರಿಸಿ:",
  match: "ಹೊಂದಿಸಿ ಬರೆಯಿರಿ:",
  "true-false": "ಸರಿ ಅಥವಾ ತಪ್ಪು ಎಂದು ಬರೆಯಿರಿ:",
  "math-vertical": "ಕೆಳಗಿನವುಗಳನ್ನು ಬಿಡಿಸಿ:",
  comprehension: "ಗದ್ಯವನ್ನು ಓದಿ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ:",
  "word-problem": "ದೈನಂದಿನ ಜೀವನದ ಸಮಸ್ಯೆಗಳನ್ನು ಬಿಡಿಸಿ:",
  composition: "ಕೆಳಗಿನ ಪ್ರಬಂಧವನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ:",
  "picture-composition": "ಚಿತ್ರವನ್ನು ನೋಡಿ ಕೆಲವು ವಾಕ್ಯಗಳನ್ನು ಬರೆಯಿರಿ:",
  handwriting: "ಪದಗಳನ್ನು ಅಂದವಾಗಿ ಬರೆಯಿರಿ:",
  dictation: "ಶ್ರುತಲೇಖನ — ಶಿಕ್ಷಕರು ಓದುವ ಪದಗಳನ್ನು ಬರೆಯಿರಿ:",
  draw: "ಚಿತ್ರ ಬಿಡಿಸಿ ಬಣ್ಣ ತುಂಬಿರಿ:",
  "label-image": "ಚಿತ್ರದ ಭಾಗಗಳನ್ನು ಗುರುತಿಸಿ:",
  table: "ಕೋಷ್ಟಕವನ್ನು ನೋಡಿ ಉತ್ತರಿಸಿ:",
  custom: "ಕೆಳಗಿನವುಗಳಿಗೆ ಉತ್ತರಿಸಿ:",
};
const KANNADA_COPY: Partial<PaperCopy> = {
  name: "ಹೆಸರು :",
  rollNo: "ಕ್ರಮ ಸಂಖ್ಯೆ:",
  marks: "ಅಂಕಗಳು",
  subject: "ವಿಷಯ :",
  classLabel: "ತರಗತಿ -",
  date: "ದಿನಾಂಕ :",
  working: "ಲೆಕ್ಕಾಚಾರ",
  questions: "ಪ್ರಶ್ನೆಗಳು:",
  instructionsTitle: "ಸಾಮಾನ್ಯ ಸೂಚನೆಗಳು:",
};

const BENGALI_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "শূন্যস্থান পূরণ করো:",
  "short-answer": "নিচের প্রশ্নগুলির উত্তর দাও:",
  "long-answer": "বিস্তারিত উত্তর দাও:",
  mcq: "সঠিক উত্তরটি বেছে নাও:",
  match: "মিলিয়ে লেখো:",
  "true-false": "সত্য না মিথ্যা লেখো:",
  "math-vertical": "নিচেরগুলি সমাধান করো:",
  comprehension: "অনুচ্ছেদটি পড়ে প্রশ্নগুলির উত্তর দাও:",
  "word-problem": "বাস্তব জীবনের সমস্যাগুলি সমাধান করো:",
  composition: "নিচের রচনাটি সম্পূর্ণ করো:",
  "picture-composition": "ছবিটি দেখে কয়েকটি বাক্য লেখো:",
  handwriting: "শব্দগুলি সুন্দর করে লেখো:",
  dictation: "শ্রুতিলিখন — শিক্ষক যে শব্দগুলি পড়বেন তা লেখো:",
  draw: "আঁকো এবং রং করো:",
  "label-image": "ছবির অংশগুলি চিহ্নিত করো:",
  table: "সারণিটি দেখে উত্তর দাও:",
  custom: "নিচেরগুলির উত্তর দাও:",
};
const BENGALI_COPY: Partial<PaperCopy> = {
  name: "নাম :",
  rollNo: "রোল নং:",
  marks: "নম্বর",
  subject: "বিষয় :",
  classLabel: "শ্রেণি -",
  date: "তারিখ :",
  working: "কষা",
  questions: "প্রশ্ন:",
  instructionsTitle: "সাধারণ নির্দেশাবলি:",
};

const GUJARATI_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "ખાલી જગ્યા પૂરો:",
  "short-answer": "નીચેના પ્રશ્નોના જવાબ આપો:",
  "long-answer": "વિગતવાર જવાબ આપો:",
  mcq: "સાચો જવાબ પસંદ કરો:",
  match: "જોડકાં જોડો:",
  "true-false": "ખરું કે ખોટું લખો:",
  "math-vertical": "નીચેના દાખલા ગણો:",
  comprehension: "ફકરો વાંચીને પ્રશ્નોના જવાબ આપો:",
  "word-problem": "રોજિંદા જીવનના કોયડા ઉકેલો:",
  composition: "નીચેનો નિબંધ પૂર્ણ કરો:",
  "picture-composition": "ચિત્ર જોઈને થોડાં વાક્યો લખો:",
  handwriting: "શબ્દો સુંદર અક્ષરે લખો:",
  dictation: "શ્રુતલેખન — શિક્ષક બોલે તે શબ્દો લખો:",
  draw: "દોરો અને રંગ પૂરો:",
  "label-image": "ચિત્રના ભાગોને નામ આપો:",
  table: "કોષ્ટક જોઈને જવાબ આપો:",
  custom: "નીચેનાના જવાબ આપો:",
};
const GUJARATI_COPY: Partial<PaperCopy> = {
  name: "નામ :",
  rollNo: "રોલ નં:",
  marks: "ગુણ",
  subject: "વિષય :",
  classLabel: "ધોરણ -",
  date: "તારીખ :",
  working: "ગણતરી",
  questions: "પ્રશ્નો:",
  instructionsTitle: "સામાન્ય સૂચનાઓ:",
};

// ===== Batch 2 drafts (2026-07-16) — Punjabi, Malayalam, Odia, Urdu, Assamese.
// Machine-drafted, PENDING native-speaker verification. Urdu is right-to-left
// (dir handled by the registry). =====

const PUNJABI_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "ਖਾਲੀ ਥਾਂਵਾਂ ਭਰੋ:",
  "short-answer": "ਹੇਠ ਲਿਖੇ ਪ੍ਰਸ਼ਨਾਂ ਦੇ ਉੱਤਰ ਦਿਓ:",
  "long-answer": "ਵਿਸਥਾਰ ਨਾਲ ਉੱਤਰ ਦਿਓ:",
  mcq: "ਸਹੀ ਉੱਤਰ ਚੁਣੋ:",
  match: "ਮਿਲਾਨ ਕਰੋ:",
  "true-false": "ਸਹੀ ਜਾਂ ਗਲਤ ਲਿਖੋ:",
  "math-vertical": "ਹੇਠ ਲਿਖੇ ਸਵਾਲ ਹੱਲ ਕਰੋ:",
  comprehension: "ਪੈਰਾ ਪੜ੍ਹ ਕੇ ਪ੍ਰਸ਼ਨਾਂ ਦੇ ਉੱਤਰ ਦਿਓ:",
  "word-problem": "ਅਸਲ ਜ਼ਿੰਦਗੀ ਦੇ ਸਵਾਲ ਹੱਲ ਕਰੋ:",
  composition: "ਹੇਠ ਲਿਖਿਆ ਲੇਖ ਪੂਰਾ ਕਰੋ:",
  "picture-composition": "ਤਸਵੀਰ ਦੇਖ ਕੇ ਕੁਝ ਵਾਕ ਲਿਖੋ:",
  handwriting: "ਸ਼ਬਦ ਸੋਹਣੇ ਕਰਕੇ ਲਿਖੋ:",
  dictation: "ਇਮਲਾ — ਅਧਿਆਪਕ ਵੱਲੋਂ ਬੋਲੇ ਸ਼ਬਦ ਲਿਖੋ:",
  draw: "ਬਣਾਓ ਅਤੇ ਰੰਗ ਭਰੋ:",
  "label-image": "ਤਸਵੀਰ ਦੇ ਭਾਗਾਂ ਦੇ ਨਾਂ ਲਿਖੋ:",
  table: "ਸਾਰਣੀ ਦੇਖ ਕੇ ਉੱਤਰ ਦਿਓ:",
  custom: "ਹੇਠ ਲਿਖੇ ਦੇ ਉੱਤਰ ਦਿਓ:",
};
const PUNJABI_COPY: Partial<PaperCopy> = {
  name: "ਨਾਂ :",
  rollNo: "ਰੋਲ ਨੰ:",
  marks: "ਅੰਕ",
  subject: "ਵਿਸ਼ਾ :",
  classLabel: "ਜਮਾਤ -",
  date: "ਮਿਤੀ :",
  working: "ਹਿਸਾਬ",
  questions: "ਪ੍ਰਸ਼ਨ:",
  instructionsTitle: "ਸਧਾਰਨ ਹਿਦਾਇਤਾਂ:",
};

const MALAYALAM_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "വിട്ട സ്ഥലങ്ങൾ പൂരിപ്പിക്കുക:",
  "short-answer": "താഴെ കൊടുത്ത ചോദ്യങ്ങൾക്ക് ഉത്തരം എഴുതുക:",
  "long-answer": "വിശദമായി ഉത്തരം എഴുതുക:",
  mcq: "ശരിയായ ഉത്തരം തിരഞ്ഞെടുക്കുക:",
  match: "യോജിപ്പിക്കുക:",
  "true-false": "ശരിയോ തെറ്റോ എന്ന് എഴുതുക:",
  "math-vertical": "താഴെ കൊടുത്ത കണക്കുകൾ ചെയ്യുക:",
  comprehension: "ഖണ്ഡിക വായിച്ച് ചോദ്യങ്ങൾക്ക് ഉത്തരം എഴുതുക:",
  "word-problem": "ദൈനംദിന ജീവിതത്തിലെ പ്രശ്നങ്ങൾ പരിഹരിക്കുക:",
  composition: "താഴെ കൊടുത്ത ഉപന്യാസം പൂർത്തിയാക്കുക:",
  "picture-composition": "ചിത്രം നോക്കി ഏതാനും വാക്യങ്ങൾ എഴുതുക:",
  handwriting: "വാക്കുകൾ ഭംഗിയായി പകർത്തി എഴുതുക:",
  dictation: "കേട്ടെഴുത്ത് — അധ്യാപകൻ വായിക്കുന്ന വാക്കുകൾ എഴുതുക:",
  draw: "വരച്ച് നിറം കൊടുക്കുക:",
  "label-image": "ചിത്രത്തിന്റെ ഭാഗങ്ങൾ അടയാളപ്പെടുത്തുക:",
  table: "പട്ടിക നോക്കി ഉത്തരം എഴുതുക:",
  custom: "താഴെ കൊടുത്തവയ്ക്ക് ഉത്തരം എഴുതുക:",
};
const MALAYALAM_COPY: Partial<PaperCopy> = {
  name: "പേര് :",
  rollNo: "റോൾ നം:",
  marks: "മാർക്ക്",
  subject: "വിഷയം :",
  classLabel: "ക്ലാസ് -",
  date: "തീയതി :",
  working: "കണക്ക്",
  questions: "ചോദ്യങ്ങൾ:",
  instructionsTitle: "പൊതുവായ നിർദ്ദേശങ്ങൾ:",
};

const ODIA_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "ଶୂନ୍ୟସ୍ଥାନ ପୂରଣ କର:",
  "short-answer": "ନିମ୍ନଲିଖିତ ପ୍ରଶ୍ନଗୁଡ଼ିକର ଉତ୍ତର ଦିଅ:",
  "long-answer": "ବିସ୍ତୃତ ଭାବରେ ଉତ୍ତର ଦିଅ:",
  mcq: "ସଠିକ୍ ଉତ୍ତର ବାଛ:",
  match: "ମେଳ କର:",
  "true-false": "ଠିକ୍ କି ଭୁଲ୍ ଲେଖ:",
  "math-vertical": "ନିମ୍ନଲିଖିତ ଅଙ୍କ କଷ:",
  comprehension: "ଅନୁଚ୍ଛେଦ ପଢ଼ି ପ୍ରଶ୍ନଗୁଡ଼ିକର ଉତ୍ତର ଦିଅ:",
  "word-problem": "ଦୈନନ୍ଦିନ ଜୀବନର ସମସ୍ୟା ସମାଧାନ କର:",
  composition: "ନିମ୍ନଲିଖିତ ରଚନା ସମ୍ପୂର୍ଣ୍ଣ କର:",
  "picture-composition": "ଚିତ୍ର ଦେଖି କିଛି ବାକ୍ୟ ଲେଖ:",
  handwriting: "ଶବ୍ଦଗୁଡ଼ିକ ସୁନ୍ଦର ଭାବରେ ଲେଖ:",
  dictation: "ଶ୍ରୁତିଲିଖନ — ଶିକ୍ଷକ ପଢ଼ୁଥିବା ଶବ୍ଦ ଲେଖ:",
  draw: "ଚିତ୍ର ଆଙ୍କ ଓ ରଙ୍ଗ ଦିଅ:",
  "label-image": "ଚିତ୍ରର ଅଂଶଗୁଡ଼ିକୁ ଚିହ୍ନଟ କର:",
  table: "ସାରଣୀ ଦେଖି ଉତ୍ତର ଦିଅ:",
  custom: "ନିମ୍ନଲିଖିତର ଉତ୍ତର ଦିଅ:",
};
const ODIA_COPY: Partial<PaperCopy> = {
  name: "ନାମ :",
  rollNo: "ରୋଲ୍ ନଂ:",
  marks: "ମାର୍କ",
  subject: "ବିଷୟ :",
  classLabel: "ଶ୍ରେଣୀ -",
  date: "ତାରିଖ :",
  working: "କଷାକଷି",
  questions: "ପ୍ରଶ୍ନ:",
};

const URDU_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "خالی جگہ پُر کریں:",
  "short-answer": "درج ذیل سوالوں کے جواب دیں:",
  "long-answer": "تفصیل سے جواب دیں:",
  mcq: "درست جواب کا انتخاب کریں:",
  match: "آپس میں ملائیں:",
  "true-false": "صحیح یا غلط لکھیں:",
  "math-vertical": "درج ذیل سوالات حل کریں:",
  comprehension: "عبارت پڑھ کر سوالوں کے جواب دیں:",
  "word-problem": "روزمرہ زندگی کے مسائل حل کریں:",
  composition: "درج ذیل مضمون مکمل کریں:",
  "picture-composition": "تصویر دیکھ کر چند جملے لکھیں:",
  handwriting: "الفاظ خوش خط لکھیں:",
  dictation: "املا — استاد کے پڑھے ہوئے الفاظ لکھیں:",
  draw: "بنائیں اور رنگ بھریں:",
  "label-image": "تصویر کے حصوں کے نام لکھیں:",
  table: "جدول دیکھ کر جواب دیں:",
  custom: "درج ذیل کے جواب دیں:",
};
const URDU_COPY: Partial<PaperCopy> = {
  name: "نام :",
  rollNo: "رول نمبر:",
  marks: "نمبر",
  subject: "مضمون :",
  classLabel: "جماعت -",
  date: "تاریخ :",
  working: "حساب",
  questions: "سوالات:",
  instructionsTitle: "عمومی ہدایات:",
};

const ASSAMESE_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "খালী ঠাইবোৰ পূৰণ কৰা:",
  "short-answer": "তলৰ প্ৰশ্নবোৰৰ উত্তৰ লিখা:",
  "long-answer": "বিতংকৈ উত্তৰ লিখা:",
  mcq: "শুদ্ধ উত্তৰটো বাছি উলিওৱা:",
  match: "মিলোৱা:",
  "true-false": "শুদ্ধ নে অশুদ্ধ লিখা:",
  "math-vertical": "তলৰ অংকবোৰ সমাধান কৰা:",
  comprehension: "অনুচ্ছেদটো পঢ়ি প্ৰশ্নবোৰৰ উত্তৰ লিখা:",
  "word-problem": "প্ৰকৃত জীৱনৰ সমস্যাবোৰ সমাধান কৰা:",
  composition: "তলৰ ৰচনাটো সম্পূৰ্ণ কৰা:",
  "picture-composition": "ছবিখন চাই কেইটামান বাক্য লিখা:",
  handwriting: "শব্দবোৰ ধুনীয়াকৈ লিখা:",
  dictation: "শ্ৰুতিলিখন — শিক্ষকে পঢ়া শব্দবোৰ লিখা:",
  draw: "আঁকি ৰং দিয়া:",
  "label-image": "ছবিখনৰ অংশবোৰ চিহ্নিত কৰা:",
  table: "তালিকাখন চাই উত্তৰ লিখা:",
  custom: "তলৰবোৰৰ উত্তৰ লিখা:",
};
const ASSAMESE_COPY: Partial<PaperCopy> = {
  name: "নাম :",
  rollNo: "ৰোল নং:",
  marks: "নম্বৰ",
  subject: "বিষয় :",
  classLabel: "শ্ৰেণী -",
  date: "তাৰিখ :",
  working: "কষা",
  questions: "প্ৰশ্ন:",
};

// ===== Batch 3 drafts (2026-07-17) — Devanagari group. Sanskrit + Nepali are
// solid; Konkani, Maithili, Dogri are lower-confidence (regional imperative
// forms / orthography vary) and want a careful native pass. Bodo is
// deliberately left English-fallback: it's Tibeto-Burman, not derivable from
// the Indo-Aryan neighbours, and a wrong draft would be worse than English. =====

const SANSKRIT_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "रिक्तस्थानानि पूरयत:",
  "short-answer": "अधोलिखितप्रश्नानाम् उत्तराणि लिखत:",
  "long-answer": "विस्तारेण उत्तरं लिखत:",
  mcq: "समुचितम् उत्तरं चिनुत:",
  match: "मेलनं कुरुत:",
  "true-false": "सत्यम् असत्यं वा लिखत:",
  "math-vertical": "अधोलिखितानि गणयत:",
  comprehension: "गद्यांशं पठित्वा प्रश्नानाम् उत्तराणि लिखत:",
  "word-problem": "दैनन्दिनजीवनस्य समस्याः साधयत:",
  composition: "अधोलिखितं निबन्धं पूरयत:",
  "picture-composition": "चित्रं दृष्ट्वा कानिचन वाक्यानि लिखत:",
  handwriting: "शब्दान् सुन्दरम् लिखत:",
  dictation: "श्रुतलेखनम् — अध्यापकेन उच्चारितान् शब्दान् लिखत:",
  draw: "चित्रं निर्माय वर्णं पूरयत:",
  "label-image": "चित्रस्य भागान् नामाङ्कयत:",
  table: "सारणीं दृष्ट्वा उत्तरं लिखत:",
  custom: "अधोलिखितानाम् उत्तराणि लिखत:",
};
const SANSKRIT_COPY: Partial<PaperCopy> = {
  name: "नाम :",
  rollNo: "क्रमाङ्कः:",
  marks: "अङ्काः",
  subject: "विषयः :",
  classLabel: "कक्षा -",
  date: "दिनाङ्कः :",
  working: "गणनम्",
  questions: "प्रश्नाः:",
};

const NEPALI_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "खाली ठाउँ भर्नुहोस्:",
  "short-answer": "तलका प्रश्नहरूको उत्तर दिनुहोस्:",
  "long-answer": "विस्तारमा उत्तर दिनुहोस्:",
  mcq: "सही उत्तर छान्नुहोस्:",
  match: "मिलान गर्नुहोस्:",
  "true-false": "सही या गलत लेख्नुहोस्:",
  "math-vertical": "तलका सवाल हल गर्नुहोस्:",
  comprehension: "अनुच्छेद पढेर प्रश्नहरूको उत्तर दिनुहोस्:",
  "word-problem": "दैनिक जीवनका समस्याहरू हल गर्नुहोस्:",
  composition: "तलको निबन्ध पूरा गर्नुहोस्:",
  "picture-composition": "चित्र हेरेर केही वाक्य लेख्नुहोस्:",
  handwriting: "शब्दहरू राम्ररी लेख्नुहोस्:",
  dictation: "श्रुतलेख — शिक्षकले पढ्नुभएका शब्दहरू लेख्नुहोस्:",
  draw: "चित्र बनाएर रङ भर्नुहोस्:",
  "label-image": "चित्रका भागहरूको नाम लेख्नुहोस्:",
  table: "तालिका हेरेर उत्तर दिनुहोस्:",
  custom: "तलका उत्तर दिनुहोस्:",
};
const NEPALI_COPY: Partial<PaperCopy> = {
  name: "नाम :",
  rollNo: "रोल नं:",
  marks: "अङ्क",
  subject: "विषय :",
  classLabel: "कक्षा -",
  date: "मिति :",
  working: "हिसाब",
  questions: "प्रश्न:",
};

const KONKANI_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "रिकाम्यो जागो भरात:",
  "short-answer": "सकयल्या प्रश्नांची जाप दियात:",
  "long-answer": "विस्तारान जाप दियात:",
  mcq: "योग्य जाप वेंचात:",
  match: "जोड्यो लायात:",
  "true-false": "सारकें वा चूक बरयात:",
  "math-vertical": "सकयलीं गणितां सोडयात:",
  comprehension: "उतारो वाचून प्रश्नांची जाप दियात:",
  "word-problem": "दिसपट्ट्या जिणयेतले प्रस्न सोडयात:",
  composition: "सकयलो निबंध पुराय करात:",
  "picture-composition": "चित्र पळोवन थोडी वाक्यां बरयात:",
  handwriting: "उतरां सुंदर बरयात:",
  dictation: "श्रुतलेखन — शिक्षक वाचतात तीं उतरां बरयात:",
  draw: "चित्र काडात आनी रंग भरात:",
  "label-image": "चित्राच्या वांट्यांक नांव दियात:",
  table: "तक्तो पळोवन जाप दियात:",
  custom: "सकयल्यांची जाप दियात:",
};
const KONKANI_COPY: Partial<PaperCopy> = {
  name: "नांव :",
  rollNo: "रोल नं:",
  marks: "गूण",
  subject: "विशय :",
  classLabel: "इयत्ता -",
  date: "तारीख :",
  working: "काम",
  questions: "प्रस्न:",
};

const MAITHILI_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "खाली स्थान भरू:",
  "short-answer": "निम्नलिखित प्रश्नक उत्तर दिअ:",
  "long-answer": "विस्तारसँ उत्तर दिअ:",
  mcq: "सही उत्तर चुनू:",
  match: "मिलान करू:",
  "true-false": "सही वा गलत लिखू:",
  "math-vertical": "निम्नलिखित सवाल हल करू:",
  comprehension: "गद्यांश पढ़ि कऽ प्रश्नक उत्तर दिअ:",
  "word-problem": "दैनिक जीवनक समस्या हल करू:",
  composition: "निम्नलिखित निबंध पूर्ण करू:",
  "picture-composition": "चित्र देखि कऽ किछु वाक्य लिखू:",
  handwriting: "शब्द सुन्दर लिखू:",
  dictation: "श्रुतलेख — शिक्षक जे शब्द पढ़ैत छथि से लिखू:",
  draw: "चित्र बनाउ आ रंग भरू:",
  "label-image": "चित्रक भागक नाम लिखू:",
  table: "तालिका देखि कऽ उत्तर दिअ:",
  custom: "निम्नलिखितक उत्तर दिअ:",
};
const MAITHILI_COPY: Partial<PaperCopy> = {
  name: "नाम :",
  rollNo: "रोल नं:",
  marks: "अंक",
  subject: "विषय :",
  classLabel: "कक्षा -",
  date: "तिथि :",
  working: "काज",
  questions: "प्रश्न:",
};

const DOGRI_TITLES: Partial<Record<QuestionType, string>> = {
  "fill-blanks": "खाली थाह्वां भरो:",
  "short-answer": "थल्ले दित्ते सवालें दे जवाब देओ:",
  "long-answer": "विस्तार कन्नै जवाब देओ:",
  mcq: "सही जवाब चुनो:",
  match: "मिलान करो:",
  "true-false": "सही जां गलत लिखो:",
  "math-vertical": "थल्ले दित्ते सवाल हल करो:",
  comprehension: "अनुच्छेद पढ़ी करी सवालें दे जवाब देओ:",
  "word-problem": "रोज़मर्रा दी जिंदगी दे सवाल हल करो:",
  composition: "थल्ला दित्ता निबंध पूरा करो:",
  "picture-composition": "तस्वीर दिक्खी करी किश वाक्य लिखो:",
  handwriting: "शब्द सुंदर लिखो:",
  dictation: "श्रुतलेख — मास्टर जेह्ड़े शब्द पढ़दे न, सै लिखो:",
  draw: "चित्र बनाओ ते रंग भरो:",
  "label-image": "तस्वीर दे हिस्सें दे नां लिखो:",
  table: "सारणी दिक्खी करी जवाब देओ:",
  custom: "थल्ले दित्ते दा जवाब देओ:",
};
const DOGRI_COPY: Partial<PaperCopy> = {
  name: "नां :",
  rollNo: "रोल नं:",
  marks: "अंक",
  subject: "विषय :",
  classLabel: "जमात -",
  date: "तरीक :",
  working: "हिसाब",
  questions: "सवाल:",
};

// The registry. English + all 22 languages of the Eighth Schedule.
//
// itc is set where Google Input Tools has a transliteration engine. For
// Devanagari-script languages without a dedicated engine we point at the Hindi
// engine (same script, phonetically close — the teacher fine-tunes); for
// Perso-Arabic ones we point at Urdu. Scripts with no engine (Ol Chiki, Meitei
// Mayek) get null and rely on direct/paste input.
export const LANGUAGES = {
  english: { label: "English", native: "English", script: "latin", itc: null, dir: "ltr" },

  hindi: {
    label: "Hindi",
    native: "हिन्दी",
    script: "devanagari",
    itc: "hi-t-i0-und",
    dir: "ltr",
    titles: HINDI_TITLES,
    copy: HINDI_COPY,
  },
  marathi: {
    label: "Marathi",
    native: "मराठी",
    script: "devanagari",
    itc: "mr-t-i0-und",
    dir: "ltr",
    titles: MARATHI_TITLES,
    copy: MARATHI_COPY,
  },

  bengali: { label: "Bengali", native: "বাংলা", script: "bengali", itc: "bn-t-i0-und", dir: "ltr", titles: BENGALI_TITLES, copy: BENGALI_COPY },
  telugu: { label: "Telugu", native: "తెలుగు", script: "telugu", itc: "te-t-i0-und", dir: "ltr", titles: TELUGU_TITLES, copy: TELUGU_COPY },
  tamil: { label: "Tamil", native: "தமிழ்", script: "tamil", itc: "ta-t-i0-und", dir: "ltr", titles: TAMIL_TITLES, copy: TAMIL_COPY },
  gujarati: { label: "Gujarati", native: "ગુજરાતી", script: "gujarati", itc: "gu-t-i0-und", dir: "ltr", titles: GUJARATI_TITLES, copy: GUJARATI_COPY },
  kannada: { label: "Kannada", native: "ಕನ್ನಡ", script: "kannada", itc: "kn-t-i0-und", dir: "ltr", titles: KANNADA_TITLES, copy: KANNADA_COPY },
  malayalam: { label: "Malayalam", native: "മലയാളം", script: "malayalam", itc: "ml-t-i0-und", dir: "ltr", titles: MALAYALAM_TITLES, copy: MALAYALAM_COPY },
  odia: { label: "Odia", native: "ଓଡ଼ିଆ", script: "odia", itc: "or-t-i0-und", dir: "ltr", titles: ODIA_TITLES, copy: ODIA_COPY },
  punjabi: { label: "Punjabi", native: "ਪੰਜਾਬੀ", script: "gurmukhi", itc: "pa-t-i0-und", dir: "ltr", titles: PUNJABI_TITLES, copy: PUNJABI_COPY },
  assamese: { label: "Assamese", native: "অসমীয়া", script: "bengali", itc: "as-t-i0-und", dir: "ltr", titles: ASSAMESE_TITLES, copy: ASSAMESE_COPY },
  urdu: { label: "Urdu", native: "اردو", script: "nastaliq", itc: "ur-t-i0-und", dir: "rtl", titles: URDU_TITLES, copy: URDU_COPY },
  sanskrit: { label: "Sanskrit", native: "संस्कृतम्", script: "devanagari", itc: "sa-t-i0-und", dir: "ltr", titles: SANSKRIT_TITLES, copy: SANSKRIT_COPY },
  nepali: { label: "Nepali", native: "नेपाली", script: "devanagari", itc: "ne-t-i0-und", dir: "ltr", titles: NEPALI_TITLES, copy: NEPALI_COPY },

  konkani: { label: "Konkani", native: "कोंकणी", script: "devanagari", itc: "hi-t-i0-und", dir: "ltr", titles: KONKANI_TITLES, copy: KONKANI_COPY },
  maithili: { label: "Maithili", native: "मैथिली", script: "devanagari", itc: "hi-t-i0-und", dir: "ltr", titles: MAITHILI_TITLES, copy: MAITHILI_COPY },
  bodo: { label: "Bodo", native: "बड़ो", script: "devanagari", itc: "hi-t-i0-und", dir: "ltr" },
  dogri: { label: "Dogri", native: "डोगरी", script: "devanagari", itc: "hi-t-i0-und", dir: "ltr", titles: DOGRI_TITLES, copy: DOGRI_COPY },
  sindhi: { label: "Sindhi", native: "سنڌي", script: "nastaliq", itc: "ur-t-i0-und", dir: "rtl" },
  kashmiri: { label: "Kashmiri", native: "كٲشُر", script: "nastaliq", itc: "ur-t-i0-und", dir: "rtl" },
  santali: { label: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ", script: "olchiki", itc: null, dir: "ltr" },
  manipuri: { label: "Manipuri (Meitei)", native: "ꯃꯩꯇꯩ", script: "meitei", itc: null, dir: "ltr" },
} satisfies Record<string, LanguageDef>;

export type PaperLanguage = keyof typeof LANGUAGES;

export const PAPER_LANGUAGES = Object.keys(LANGUAGES) as PaperLanguage[];

export const PAPER_LANGUAGE_LABELS = Object.fromEntries(
  PAPER_LANGUAGES.map((k) => [k, LANGUAGES[k].label])
) as Record<PaperLanguage, string>;

export const scriptOf = (l: PaperLanguage): ScriptKey => LANGUAGES[l].script;
export const itcOf = (l: PaperLanguage): string | null => LANGUAGES[l].itc;
export const dirOf = (l: PaperLanguage): "ltr" | "rtl" => LANGUAGES[l].dir;

// Full title / copy maps for a language, English-filled where untranslated.
export function titlesFor(l: PaperLanguage): Record<QuestionType, string> {
  return { ...DEFAULT_TITLES, ...((LANGUAGES[l] as LanguageDef).titles ?? {}) };
}
export function copyFor(l: PaperLanguage): PaperCopy {
  return { ...ENGLISH_COPY, ...((LANGUAGES[l] as LanguageDef).copy ?? {}) };
}

/**
 * Returns the write-in prefix (e.g. 'उत्तर' or 'Ans') for a given language.
 * Checks the paper language copy, and also inspects `subject` defensively
 * (e.g., if language was left as 'english' but subject is Hindi/Marathi).
 */
export function answerPrefixFor(l: PaperLanguage = "english", subject?: string): string {
  if (subject) {
    const s = subject.toLowerCase();
    if (s.includes("hindi") || s.includes("हिंदी") || s.includes("हिन्दी") || s.includes("marathi") || s.includes("मराठी")) {
      return "उत्तर";
    }
    if (s.includes("sanskrit") || s.includes("संस्कृत")) {
      return "उत्तरम्";
    }
    if (s.includes("gujarati") || s.includes("ગુજરાતી")) {
      return "જવાબ";
    }
  }

  const copy = copyFor(l);
  return copy.answerPrefix || "Ans";
}
