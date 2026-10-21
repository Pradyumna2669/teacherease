// SEO landing-page data for each supported paper language. Drives the
// programmatic routes at /languages and /languages/[lang]. Every language that
// has native UI strings in the registry gets its own page, targeting that
// language's search terms in both English and the native script.

import {
  LANGUAGES,
  PAPER_LANGUAGES,
  titlesFor,
  itcOf,
  dirOf,
  type PaperLanguage,
  type LanguageDef,
} from "./languages";
import {
  PAPER_LANGUAGE_FONT_STACK,
  QUESTION_TYPE_LABELS,
  type QuestionType,
} from "./types";

// Only languages with native strings get a dedicated page (English is the
// default site language, so it's excluded).
export const LANGUAGE_PAGES: PaperLanguage[] = PAPER_LANGUAGES.filter(
  (l) => l !== "english" && !!(LANGUAGES[l] as LanguageDef).titles
);

export function isLanguagePage(slug: string): slug is PaperLanguage {
  return (LANGUAGE_PAGES as string[]).includes(slug);
}

// Native tagline + native word for "question paper" — the high-value native
// keyword for each language. (Drafted; refine alongside the label translations.)
interface LangSeo {
  tagline: string;
  qp: string;
}

const LANG_SEO: Partial<Record<PaperLanguage, LangSeo>> = {
  hindi: { tagline: "हिंदी में प्रश्न पत्र मिनटों में बनाएँ", qp: "प्रश्न पत्र" },
  marathi: { tagline: "मराठीत प्रश्नपत्रिका काही मिनिटांत तयार करा", qp: "प्रश्नपत्रिका" },
  tamil: { tagline: "தமிழில் வினாத்தாளை நிமிடங்களில் உருவாக்குங்கள்", qp: "வினாத்தாள்" },
  telugu: { tagline: "తెలుగులో ప్రశ్నపత్రాన్ని నిమిషాల్లో తయారు చేయండి", qp: "ప్రశ్నపత్రం" },
  kannada: { tagline: "ಕನ್ನಡದಲ್ಲಿ ಪ್ರಶ್ನೆ ಪತ್ರಿಕೆಯನ್ನು ನಿಮಿಷಗಳಲ್ಲಿ ರಚಿಸಿ", qp: "ಪ್ರಶ್ನೆ ಪತ್ರಿಕೆ" },
  bengali: { tagline: "বাংলায় প্রশ্নপত্র মিনিটেই তৈরি করুন", qp: "প্রশ্নপত্র" },
  gujarati: { tagline: "ગુજરાતીમાં પ્રશ્નપત્ર મિનિટોમાં બનાવો", qp: "પ્રશ્નપત્ર" },
  punjabi: { tagline: "ਪੰਜਾਬੀ ਵਿੱਚ ਪ੍ਰਸ਼ਨ ਪੱਤਰ ਮਿੰਟਾਂ ਵਿੱਚ ਬਣਾਓ", qp: "ਪ੍ਰਸ਼ਨ ਪੱਤਰ" },
  malayalam: { tagline: "മലയാളത്തിൽ ചോദ്യപേപ്പർ മിനിറ്റുകൾക്കുള്ളിൽ തയ്യാറാക്കൂ", qp: "ചോദ്യപേപ്പർ" },
  odia: { tagline: "ଓଡ଼ିଆରେ ପ୍ରଶ୍ନପତ୍ର କିଛି ମିନିଟ୍‌ରେ ତିଆରି କରନ୍ତୁ", qp: "ପ୍ରଶ୍ନପତ୍ର" },
  urdu: { tagline: "اردو میں سوالیہ پرچہ منٹوں میں بنائیں", qp: "سوالیہ پرچہ" },
  assamese: { tagline: "অসমীয়াত প্ৰশ্নকাকত মিনিটতে বনাওক", qp: "প্ৰশ্ন কাকত" },
  sanskrit: { tagline: "संस्कृतेन प्रश्नपत्रं क्षणैः रचयत", qp: "प्रश्नपत्रम्" },
  nepali: { tagline: "नेपालीमा प्रश्नपत्र मिनेटमै बनाउनुहोस्", qp: "प्रश्नपत्र" },
  konkani: { tagline: "कोंकणींत प्रश्नपत्र मिनटांनी तयार करात", qp: "प्रश्नपत्र" },
  maithili: { tagline: "मैथिलीमे प्रश्नपत्र मिनटमे बनाबू", qp: "प्रश्नपत्र" },
  dogri: { tagline: "डोगरी विच सवाल पत्तर मिनटें विच बनाओ", qp: "सवाल पत्तर" },
};

// Question types shown in-script on each page — real native product strings, so
// every page carries unique, keyword-relevant content (not a doorway page).
const SHOWCASE_TYPES: QuestionType[] = [
  "fill-blanks",
  "mcq",
  "match",
  "true-false",
  "short-answer",
  "comprehension",
  "word-problem",
  "math-vertical",
];

export interface FaqItem {
  q: string;
  a: string;
}

// ---------------------------------------------------------------------------
// Per-language depth
// ---------------------------------------------------------------------------
// The template below (taglines, showcase, generic FAQ) is identical across every
// language bar a label substitution. On its own that reads as a set of near
// duplicate pages, which is why Google left them at "Discovered – currently not
// indexed". A language only earns a place in the index once it has genuinely
// unique content here: its own boards, its own sample questions in script, and
// its own script-handling notes. Languages without a LANG_DEPTH entry are marked
// noindex and kept out of the sitemap until one is written.

export interface LangSample {
  /** Question type, in English. */
  label: string;
  /** The question itself, written in the language's own script. */
  q: string;
  /** What it is and roughly which class it suits. */
  gloss: string;
}

export interface LangDepth {
  /** Where this language is the medium of instruction. */
  regions: string;
  /** Short board tag for the <title> — must keep the title under ~55 chars. */
  boardShort: string;
  /** Boards whose teachers set papers in this language. */
  boards: string[];
  /** Unique positioning copy for this language. */
  context: string;
  /** Real sample questions, in script. */
  samples: LangSample[];
  /** Script-specific typing and printing notes. */
  scriptNotes: { h: string; p: string }[];
  /** Language-specific FAQ, appended to the generic set. */
  extraFaq: FaqItem[];
}

const LANG_DEPTH: Partial<Record<PaperLanguage, LangDepth>> = {
  hindi: {
    regions:
      "Uttar Pradesh, Bihar, Madhya Pradesh, Rajasthan, Haryana, Jharkhand, Chhattisgarh, Uttarakhand, Delhi",
    boardShort: "CBSE & State Board",
    boards: [
      "CBSE",
      "UP Board (UPMSP)",
      "Bihar Board (BSEB)",
      "MP Board (MPBSE)",
      "RBSE Rajasthan",
    ],
    context:
      "Hindi-medium teachers set more papers than almost anyone else in the country, and usually on the least convenient hardware — a school desktop with no Devanagari keyboard mapping, or a phone between periods. The two things that eat the time are typing the script and rebuilding the layout: the header block, the section split, the marks column, the ruled answer space. PaperGen removes both. Type in ordinary English letters and the Devanagari appears as you press space, or photograph the paper you already wrote by hand and get it back typed and formatted. The result is an A4 PDF that prints and photocopies cleanly — the format a UP Board or CBSE half-yearly actually expects.",
    samples: [
      {
        label: "Fill in the blanks",
        q: "रिक्त स्थान भरिए — भारत की राजधानी ______ है।",
        gloss: "Class 3–5 EVS or social studies, one mark each.",
      },
      {
        label: "Multiple choice",
        q: "निम्नलिखित में से कौन-सा जंतु स्तनधारी है? (क) मछली  (ख) गाय  (ग) साँप  (घ) मेंढक",
        gloss: "Class 4–6 science, options laid out on one line to save paper.",
      },
      {
        label: "Word problem",
        q: "एक टोकरी में 24 सेब हैं। यदि उन्हें 3 बच्चों में बराबर बाँटा जाए, तो प्रत्येक बच्चे को कितने सेब मिलेंगे?",
        gloss: "Class 3–4 maths division, with ruled working space below.",
      },
    ],
    scriptNotes: [
      {
        h: "Matras land where you expect",
        p: "Vowel signs — ि ी ु ू े ै ो ौ — are the usual casualty of a bad editor: the i-matra drifts to the wrong consonant, or a word breaks across a line mid-matra. Papers are laid out with a real Devanagari font, so what you see in the preview is what prints.",
      },
      {
        h: "Conjuncts stay joined",
        p: "क्ष, त्र, ज्ञ, द्व and the rest render as single ligatures rather than splitting into their parts, which is what makes a printed Hindi paper readable for a Class 3 student.",
      },
      {
        h: "Nukta letters are available",
        p: "क़, ख़, ग़, ज़, फ़ and ड़/ढ़ are typed and printed correctly — useful for Urdu-origin vocabulary in Hindi comprehension passages.",
      },
      {
        h: "Numbers your way",
        p: "Use Western digits (24) or Devanagari digits (२४) for marks and question numbers, whichever your board's papers follow.",
      },
    ],
    extraFaq: [
      {
        q: "Can I make a CBSE or UP Board style Hindi paper?",
        a: "Yes. Build the header (school, subject, class, समय, पूर्णांक), an instructions block (सामान्य निर्देश), then Section A/B/C — खंड अ, खंड ब, खंड स — with marks in the right column. The layout is the same one those boards' sample papers use, and you can reuse it every term.",
      },
      {
        q: "How do I type Hindi if my keyboard is English only?",
        a: "Type it the way you would text it. \"bharat ki rajdhani\" becomes भारत की राजधानी as you press space, with a suggestion list when a word is ambiguous. You never install a Hindi keyboard or change your system language.",
      },
      {
        q: "Can I mix Hindi and English in one paper?",
        a: "Yes — common for science and maths, where the term stays in English (photosynthesis, LCM) inside a Hindi question. Switch mid-sentence and both render in their proper fonts.",
      },
    ],
  },

  marathi: {
    regions: "Maharashtra and Marathi-medium schools in Goa, Karnataka border districts",
    boardShort: "Maharashtra Board",
    boards: [
      "Maharashtra State Board (MSBSHSE) — SSC and HSC",
      "Balbharati-aligned primary schools",
      "CBSE schools teaching Marathi as a subject",
    ],
    context:
      "A Marathi-medium teacher setting a घटक चाचणी or a semester paper is usually working from the Balbharati textbook and a format the school has used for years. The formatting is the tedious part, not the questions. PaperGen keeps your format and takes the typing away: write in English letters and it becomes Marathi as you go, or photograph a handwritten paper — including the ones your school stores in a file from last year — and get an editable, print-ready version. Everything comes out on clean A4 with the marks column aligned, ready for the photocopier.",
    samples: [
      {
        label: "Fill in the blanks",
        q: "रिकाम्या जागा भरा — महाराष्ट्राची राजधानी ______ आहे.",
        gloss: "Class 3–5 परिसर अभ्यास, one mark each.",
      },
      {
        label: "Multiple choice",
        q: "खालीलपैकी कोणता प्राणी सस्तन आहे? (अ) मासा  (ब) गाय  (क) साप  (ड) बेडूक",
        gloss: "Class 4–6 विज्ञान, four options on one line.",
      },
      {
        label: "Word problem",
        q: "एका टोपलीत २४ सफरचंदे आहेत. ती ३ मुलांमध्ये सारखी वाटल्यास प्रत्येकाला किती सफरचंदे मिळतील?",
        gloss: "Class 3–4 गणित division, with ruled working space.",
      },
    ],
    scriptNotes: [
      {
        h: "ळ and the Marathi-only letters",
        p: "Marathi shares Devanagari with Hindi but not its alphabet. ळ, ऱ्ह, ऱ्य and the ॲ/ऑ vowels are all typed and printed properly instead of being silently swapped for their Hindi lookalikes.",
      },
      {
        h: "Devanagari digits by default",
        p: "Marathi papers conventionally number questions and marks in ०१२३ rather than 0123. Both are available; pick whichever your school's papers use and stay consistent across the term.",
      },
      {
        h: "Conjuncts and matras hold",
        p: "श्री, क्ष, ज्ञ, द्व render as single ligatures, and vowel signs stay attached to the right consonant through line breaks — the difference between a paper a Class 3 child can read and one they can't.",
      },
      {
        h: "Long comprehension passages fit",
        p: "उतारा-based questions run long. The A4 preview shows exactly where the passage breaks across pages, so you can adjust before printing instead of after.",
      },
    ],
    extraFaq: [
      {
        q: "Does it suit the Maharashtra State Board (SSC) format?",
        a: "Yes. Set the header with शाळेचे नाव, विषय, इयत्ता, वेळ and गुण, add सूचना, then split into विभाग with marks in the right column — the layout Balbharati and MSBSHSE papers follow. Save it once and reuse it for every unit test.",
      },
      {
        q: "I have last year's handwritten Marathi papers in a file. Can I reuse them?",
        a: "Photograph them. Each one comes back as an editable Marathi paper — change the numbers, swap a few questions, reprint. That is usually faster than typing a fresh paper, and it rescues papers that only exist on the staffroom shelf.",
      },
      {
        q: "Can I set a Marathi paper on my phone?",
        a: "Yes — typing, scanning and the PDF export all work in a phone browser, which is what most teachers use between classes. Nothing to install.",
      },
    ],
  },

  tamil: {
    regions: "Tamil Nadu, Puducherry, and Tamil-medium schools elsewhere",
    boardShort: "Samacheer Kalvi",
    boards: [
      "Tamil Nadu State Board — Samacheer Kalvi",
      "TN Directorate of Government Examinations (DGE)",
      "CBSE schools teaching Tamil as a language subject",
    ],
    context:
      "Samacheer Kalvi standardised the syllabus, but every teacher still rebuilds the paper by hand each term. Tamil typing is the specific obstacle: most staffroom machines have no Tamil keyboard, and phone keyboards make long comprehension passages painful. PaperGen lets you type in English letters and get Tamil script back as you press space, or photograph a paper you have already written out. The output is a properly typeset A4 PDF with the marks column aligned and ruled answer space under each question — a paper you can hand straight to the photocopier.",
    samples: [
      {
        label: "Fill in the blanks",
        q: "கோடிட்ட இடங்களை நிரப்புக — தமிழ்நாட்டின் தலைநகரம் ______ ஆகும்.",
        gloss: "Class 3–5 சமூக அறிவியல், one mark each.",
      },
      {
        label: "Multiple choice",
        q: "பின்வருவனவற்றுள் பாலூட்டி எது? (அ) மீன்  (ஆ) பசு  (இ) பாம்பு  (ஈ) தவளை",
        gloss: "Class 4–6 அறிவியல், options on a single line.",
      },
      {
        label: "Word problem",
        q: "ஒரு கூடையில் 24 ஆப்பிள்கள் உள்ளன. அவற்றை 3 குழந்தைகளுக்குச் சமமாகப் பங்கிட்டால், ஒவ்வொருவருக்கும் எத்தனை ஆப்பிள்கள் கிடைக்கும்?",
        gloss: "Class 3–4 கணிதம் division, with working space below.",
      },
    ],
    scriptNotes: [
      {
        h: "Grantha letters included",
        p: "ஜ, ஷ, ஸ, ஹ and க்ஷ appear constantly in science terms and proper nouns. They are typed and printed correctly rather than being approximated with the nearest pure-Tamil letter.",
      },
      {
        h: "Pulli and vowel signs stay put",
        p: "The pulli (்) and the ெ ே ை ொ ோ ௌ vowel signs sit either side of their consonant. A weak font drifts them onto the wrong letter; papers here render with a real Tamil font so the preview matches the print.",
      },
      {
        h: "Long words don't break badly",
        p: "Tamil words run long, and a naive layout snaps them mid-cluster. Line breaking respects grapheme boundaries, which matters most in comprehension passages and long-answer prompts.",
      },
      {
        h: "ஸ்ரீ and mixed English terms",
        p: "Keep an English technical term inline in a Tamil question — photosynthesis, LCM, GDP — and each renders in its own font without the line spacing jumping.",
      },
    ],
    extraFaq: [
      {
        q: "Does it work for Samacheer Kalvi paper formats?",
        a: "Yes. Build the header (பள்ளியின் பெயர், பாடம், வகுப்பு, நேரம், மதிப்பெண்கள்), add பொது வழிமுறைகள், then பகுதி அ / ஆ / இ with marks aligned right — the structure Samacheer Kalvi and DGE papers use. Save the format and reuse it every term.",
      },
      {
        q: "How do I type Tamil without a Tamil keyboard?",
        a: "Type phonetically in English letters. \"tamilnadu thalainagaram\" becomes தமிழ்நாட்டின் தலைநகரம் as you press space, with suggestions when a word could go more than one way. No keyboard layout to install, no system language to change.",
      },
      {
        q: "Can I scan a handwritten Tamil paper?",
        a: "Yes, and it is usually the fastest route. Photograph the paper and it comes back as editable Tamil text in a formatted layout. Proofread it before printing — a pulli or a vowel sign can occasionally be misread from handwriting.",
      },
    ],
  },

  telugu: {
    regions: "Telangana and Andhra Pradesh",
    boardShort: "Telangana & AP Board",
    boards: [
      "BSE Telangana (SSC)",
      "BSE Andhra Pradesh (BSEAP)",
      "SCERT Telangana / Andhra Pradesh textbooks",
      "CBSE schools teaching Telugu as a subject",
    ],
    context:
      "Telugu-medium teachers across Telangana and Andhra Pradesh set formative and summative papers on the same SCERT syllabus, and almost all of them still format each one by hand. The script is the bottleneck — Telugu vattulu sit below the line and most editors handle them badly, so teachers fall back to handwriting and photocopying a smudged original. PaperGen takes either input: type in English letters and get Telugu as you go, or photograph the handwritten paper. Out comes a clean A4 PDF with proper Telugu type, aligned marks and ruled answer space.",
    samples: [
      {
        label: "Fill in the blanks",
        q: "ఖాళీలను పూరించండి — తెలంగాణ రాజధాని ______.",
        gloss: "Class 3–5 పరిసరాల విజ్ఞానం, one mark each.",
      },
      {
        label: "Multiple choice",
        q: "కింది వాటిలో క్షీరదం ఏది? (అ) చేప  (ఆ) ఆవు  (ఇ) పాము  (ఈ) కప్ప",
        gloss: "Class 4–6 సాధారణ విజ్ఞానం, four options on one line.",
      },
      {
        label: "Word problem",
        q: "ఒక బుట్టలో 24 ఆపిల్స్ ఉన్నాయి. వాటిని 3 మంది పిల్లలకు సమానంగా పంచితే ఒక్కొక్కరికి ఎన్ని ఆపిల్స్ వస్తాయి?",
        gloss: "Class 3–4 గణితం division, with ruled working space.",
      },
    ],
    scriptNotes: [
      {
        h: "Vattulu sit where they should",
        p: "Telugu conjuncts hang the second consonant below the base letter — క్క, ప్ప, స్త, ష్ట. Editors that treat them as ordinary characters push them out of line or clip them at the row edge. Papers here use a real Telugu font with the line height to match.",
      },
      {
        h: "Talakattu and the vowel signs",
        p: "ా ి ీ ు ూ ె ే ై ొ ో ౌ attach to the correct consonant and survive line breaks, so a Class 3 reader isn't decoding a mangled word.",
      },
      {
        h: "Both regional spellings",
        p: "Telangana and Andhra textbooks differ in places on vocabulary and spelling. Type whichever your SCERT textbook uses — nothing is autocorrected to the other.",
      },
      {
        h: "Telugu digits optional",
        p: "Question numbers and marks can be set in Western digits (24) or Telugu digits (౨౪), matching the convention your school's papers already follow.",
      },
    ],
    extraFaq: [
      {
        q: "Does it fit the BSE Telangana / AP SSC paper format?",
        a: "Yes. Set the header with పాఠశాల పేరు, విషయం, తరగతి, సమయం and మార్కులు, add సూచనలు, then split into విభాగం with marks in the right column — the structure both boards' papers follow. Save it once and reuse it for every unit test.",
      },
      {
        q: "How do I type Telugu on an English keyboard?",
        a: "Type it phonetically. \"telangana rajadhani\" becomes తెలంగాణ రాజధాని as you press space, with a suggestion list when a word is ambiguous. No Telugu keyboard, no system language change.",
      },
      {
        q: "Will vattulu print correctly in the PDF?",
        a: "Yes — the PDF embeds a Telugu font, so subscript consonants and vowel signs print exactly as the on-screen A4 preview shows them, including after photocopying.",
      },
    ],
  },

  bengali: {
    regions: "West Bengal, Tripura, and Bengali-medium schools in Assam and Jharkhand",
    boardShort: "WBBSE",
    boards: [
      "WBBSE (West Bengal Board of Secondary Education)",
      "WBCHSE",
      "TBSE Tripura",
      "CBSE schools teaching Bengali as a subject",
    ],
    context:
      "Bengali-medium teachers write a lot of long-form questions — রচনা, comprehension passages, ব্যাখ্যা করো prompts — and that is exactly the work that punishes bad typing tools. Juktakkhor break, the passage reflows wrongly across pages, and the paper ends up handwritten again. PaperGen handles both ends: type in English letters and get Bengali as you press space, or photograph a handwritten paper and get it back as editable text. The A4 preview is the printed page, so you see where a long passage breaks before you print, not after.",
    samples: [
      {
        label: "Fill in the blanks",
        q: "শূন্যস্থান পূরণ করো — পশ্চিমবঙ্গের রাজধানী ______।",
        gloss: "Class 3–5 পরিবেশ পরিচয়, one mark each.",
      },
      {
        label: "Multiple choice",
        q: "নিচের কোনটি স্তন্যপায়ী প্রাণী? (ক) মাছ  (খ) গরু  (গ) সাপ  (ঘ) ব্যাঙ",
        gloss: "Class 4–6 বিজ্ঞান, four options on a single line.",
      },
      {
        label: "Word problem",
        q: "একটি ঝুড়িতে ২৪টি আপেল আছে। ৩ জন শিশুর মধ্যে সমানভাবে ভাগ করলে প্রত্যেকে কতটি আপেল পাবে?",
        gloss: "Class 3–4 গণিত division, with ruled working space below.",
      },
    ],
    scriptNotes: [
      {
        h: "Juktakkhor render as one letter",
        p: "ক্ষ, জ্ঞ, ঞ্চ, ন্দ, ষ্ট and the rest print as proper conjuncts instead of splitting into consonant plus hasant, which is the usual giveaway of a paper typed in the wrong editor.",
      },
      {
        h: "Khanda ta and hasant behave",
        p: "ৎ stays distinct from ত্, and the hasant (্) never floats onto the next character — small details that decide whether a Class 4 student can read the question at all.",
      },
      {
        h: "Bengali digits throughout",
        p: "Question numbers, marks and the numbers inside maths questions can all be set in ০১২৩ — the convention WBBSE papers use — or in Western digits if your school prefers.",
      },
      {
        h: "Long passages break cleanly",
        p: "Comprehension passages and রচনা prompts run to many lines. The live A4 preview shows the exact page break, so you can move a question rather than discovering the split on the photocopy.",
      },
    ],
    extraFaq: [
      {
        q: "Does it suit the WBBSE paper format?",
        a: "Yes. Build the header with বিদ্যালয়ের নাম, বিষয়, শ্রেণি, সময় and পূর্ণমান, add নির্দেশাবলী, then split into বিভাগ with marks in the right column — the structure WBBSE and WBCHSE papers follow. Save the format and reuse it each term.",
      },
      {
        q: "How do I type Bengali without a Bengali keyboard?",
        a: "Type phonetically in English letters. \"poschimbonger rajdhani\" becomes পশ্চিমবঙ্গের রাজধানী as you press space, with suggestions when a word could be spelled more than one way. Nothing to install.",
      },
      {
        q: "Can I set a Bengali comprehension paper with a long passage?",
        a: "Yes. Paste or type the passage, add the questions under it, and the preview shows exactly how it lays out on A4 — including where it crosses to the second page — before you print a single copy.",
      },
    ],
  },
};

export function langDepth(lang: PaperLanguage): LangDepth | undefined {
  return LANG_DEPTH[lang];
}

/**
 * Languages whose page carries unique, indexable content. The rest render (and
 * stay linked) but are marked noindex and left out of the sitemap, so a set of
 * near-identical template pages can't drag the site's quality signal down.
 */
export const INDEXABLE_LANGUAGE_PAGES: PaperLanguage[] = LANGUAGE_PAGES.filter(
  (l) => LANG_DEPTH[l] != null
);

function buildKeywords(label: string, qp?: string): string[] {
  const base = [
    `${label} question paper maker`,
    `${label} question paper generator`,
    `${label} question paper format`,
    `${label} exam paper maker`,
    `question paper in ${label}`,
    `${label} model question paper`,
    `${label} worksheet maker`,
  ];
  if (qp) base.push(qp, `${qp} maker`, `${qp} online`);
  return base;
}

function buildFaq(label: string, hasTranslit: boolean): FaqItem[] {
  return [
    {
      q: `Can I make a ${label} question paper without knowing how to type in ${label}?`,
      a: hasTranslit
        ? `Yes. Type in plain English letters and PaperGen converts them to ${label} script as you go — just press space after each word, and pick from suggestions if needed. If you'd rather not type at all, photograph a handwritten ${label} paper and it's turned into an editable one.`
        : `Yes. Photograph a handwritten ${label} paper and PaperGen reads it into an editable, print-ready paper — no typing needed. You can also type or paste ${label} text directly.`,
    },
    {
      q: `Will the ${label} text print correctly?`,
      a: `Yes. Papers are laid out with proper ${label} fonts and export to a clean A4 PDF, so the print matches the preview exactly — headers, marks, and ruled answer lines included.`,
    },
    {
      q: `Which classes and subjects does it work for?`,
      a: `Any — from primary to high school, and every subject: maths, science, ${label}, English, social studies and more. There are 15+ question types, including fill-in-the-blanks, MCQ, match, comprehension and vertical maths.`,
    },
    {
      q: `Can I photograph a handwritten ${label} paper?`,
      a: `Yes — that's the fastest way. Take a photo of your handwritten paper and PaperGen digitises it into an editable ${label} paper you can tweak and print. Please proofread the scan, as a letter or matra can occasionally be misread.`,
    },
    {
      q: `Is it free?`,
      a: `You start free with 3 free papers on signup — enough to generate or scan right away. After that you pay only for what you use; editing saved papers is always free.`,
    },
  ];
}

export interface LanguagePageData {
  lang: PaperLanguage;
  label: string;
  native: string;
  dir: "ltr" | "rtl";
  hasTranslit: boolean;
  fontStack: string;
  tagline: string;
  qp: string;
  showcase: { type: QuestionType; en: string; native: string }[];
  keywords: string[];
  faq: FaqItem[];
  /** Unique per-language content. Absent languages render the template only. */
  depth?: LangDepth;
}

export function languagePageData(lang: PaperLanguage): LanguagePageData {
  const def = LANGUAGES[lang] as LanguageDef;
  const seo = LANG_SEO[lang];
  const titles = titlesFor(lang);
  const depth = LANG_DEPTH[lang];
  return {
    depth,
    lang,
    label: def.label,
    native: def.native ?? def.label,
    dir: dirOf(lang),
    hasTranslit: itcOf(lang) != null,
    fontStack: PAPER_LANGUAGE_FONT_STACK[lang].sans,
    tagline: seo?.tagline ?? `Question papers in ${def.label}, in minutes`,
    qp: seo?.qp ?? "question paper",
    showcase: SHOWCASE_TYPES.map((t) => ({
      type: t,
      en: QUESTION_TYPE_LABELS[t],
      native: titles[t],
    })),
    keywords: [
      ...buildKeywords(def.label, seo?.qp),
      ...(depth ? depth.boards.map((b) => `${b} question paper`) : []),
    ],
    // Language-specific questions lead; the generic set backs them up.
    faq: [
      ...(depth?.extraFaq ?? []),
      ...buildFaq(def.label, itcOf(lang) != null),
    ],
  };
}

// For the /languages hub: cards for every page-language, plus the names of the
// remaining registered languages (usable, native UI labels still in progress).
export function hubData() {
  const pages = LANGUAGE_PAGES.map((l) => {
    const def = LANGUAGES[l] as LanguageDef;
    return {
      lang: l,
      label: def.label,
      native: def.native ?? def.label,
      dir: dirOf(l),
      fontStack: PAPER_LANGUAGE_FONT_STACK[l].sans,
    };
  });
  const moreLangs = PAPER_LANGUAGES.filter(
    (l) => l !== "english" && !(LANGUAGES[l] as LanguageDef).titles
  ).map((l) => (LANGUAGES[l] as LanguageDef).label);
  return { pages, moreLangs };
}
