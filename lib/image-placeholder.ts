// Detects AI-generated picture placeholders such as
//   "(Image of an apple)", "[picture: sun]", "(Photo of a cup)",
//   "चित्र 1: तोते", "चित्र: आम", "[picture: parrot]".
// The AI writes them because it cannot produce a real image — the teacher
// then swaps each one for a searched or uploaded picture.

const BRACKET_RE =
  /[\(\[]\s*(?:image|picture|photo|pic|diagram|drawing|चित्र)\s*(?:of\s+)?(?:\d+)?\s*[:\-]?\s*(?:an?\s+|the\s+)?([^)\]]+?)\s*[\)\]]/i;

const PREFIX_RE =
  /^(?:चित्र|picture|image|diagram|pic)\s*(?:\d+)?\s*[:\-]\s*(.+)$/i;

const STRIP_RE =
  /(?:\s*[\(\[]\s*(?:image|picture|photo|pic|diagram|drawing|चित्र)\s*(?:of\s+)?(?:\d+)?\s*[:\-]?\s*(?:an?\s+|the\s+)?[^)\]]+?\s*[\)\]]\s*|^(?:चित्र|picture|image|diagram|pic)\s*(?:\d+)?\s*[:\-]\s*.+$)/gi;

const VOCAB_MAP: Record<string, string> = {
  तोते: "parrot",
  तोता: "parrot",
  गाय: "cow",
  सारस: "crane bird",
  मयूर: "peacock",
  मोर: "peacock",
  आम: "mango",
  पर्वत: "mountain",
  आँख: "eye",
  पौधा: "plant",
  भारवाहक: "porter luggage",
  लड़का: "boy",
  किताब: "book",
  लड़की: "girl",
  शेर: "lion",
  मक्खी: "housefly",
  पहिया: "wheel",
  हाथी: "elephant",
  बंदर: "monkey",
  घोड़ा: "horse",
  सेब: "apple",
  केला: "banana",
  कमल: "lotus flower",
  घड़ी: "clock",
};

/** Returns the pictured subject and the exact matched fragment, or null. */
export function extractImagePlaceholder(
  text: string | undefined | null,
): { subject: string; match: string } | null {
  if (!text) return null;

  const b = BRACKET_RE.exec(text);
  if (b) {
    const rawSubject = b[1].replace(/\s+/g, " ").trim();
    if (!rawSubject) return null;
    const subject = VOCAB_MAP[rawSubject] || rawSubject;
    return { subject, match: b[0] };
  }

  const p = PREFIX_RE.exec(text.trim());
  if (p) {
    const rawSubject = p[1].replace(/\s+/g, " ").trim();
    if (!rawSubject) return null;
    const subject = VOCAB_MAP[rawSubject] || rawSubject;
    return { subject, match: p[0] };
  }

  return null;
}

/** Removes every placeholder mention so the printed paper shows just the image. */
export function stripImagePlaceholder(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(STRIP_RE, " ").replace(/\s{2,}/g, " ").trim();
}
