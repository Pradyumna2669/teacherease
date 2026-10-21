import { Question, SubItem } from "@/lib/types";

const TIMEOUT_MS = 6000;
const MAX_BYTES = 4_000_000; // 4MB cap

// Common elementary Hindi / Sanskrit / Indian language vocabulary mapped to English outline queries
const DICTIONARY: Record<string, string> = {
  // Animals & Birds
  तोते: "two parrots",
  तोता: "parrot",
  शुकः: "parrot",
  गाय: "cow",
  धेनुः: "cow",
  सारस: "crane bird",
  बकः: "crane bird",
  मयूर: "peacock",
  मयूरः: "peacock",
  मोर: "peacock",
  शेर: "lion",
  सिंहः: "lion",
  हाथी: "elephant",
  गजः: "elephant",
  मक्खी: "housefly",
  मक्षिका: "housefly",
  कच्छपः: "tortoise",
  कछुआ: "tortoise",
  वानरः: "monkey",
  बंदर: "monkey",
  अश्वः: "horse",
  घोड़ा: "horse",
  मत्स्यः: "fish",
  मछली: "fish",
  कुक्कुरः: "dog",
  कुत्ता: "dog",
  बिडालः: "cat",
  बिल्ली: "cat",

  // Fruits & Plants & Nature
  आम: "mango",
  आम्रम्: "mango",
  सेब: "apple",
  सेवम्: "apple",
  केला: "banana",
  कदलीफलम्: "banana",
  कमल: "lotus flower",
  कमलम्: "lotus flower",
  पौधा: "potted plant",
  पादपः: "plant",
  वृक्षः: "tree",
  पेड़: "tree",
  पर्वत: "mountain",
  पर्वतः: "mountain",
  पहाड़: "mountain",
  सूर्यः: "sun",
  सूरज: "sun",
  चन्द्रः: "moon",
  चाँद: "moon",
  मेघः: "cloud",
  बादल: "cloud",

  // Objects & People
  लड़का: "school boy",
  बालकः: "boy",
  लड़की: "school girl",
  बालिका: "girl",
  किताब: "book",
  पुस्तकम्: "book",
  कलम: "pen",
  लेखनी: "pen",
  पहिया: "wheel",
  चक्रम्: "wheel",
  आँख: "eye",
  नेत्रम्: "eye",
  घड़ी: "clock",
  घटिका: "clock",
  घर: "house",
  गृहम्: "house",
  भारवाहक: "porter luggage",
};

/**
 * Searches for outline / line-art / coloring images.
 * Tries Google Custom Search if configured, and falls back to DuckDuckGo clipart.
 */
export async function searchOutlineImageUrl(query: string): Promise<string | null> {
  const clean = query.trim();
  if (!clean) return null;

  // 1. Try Google Custom Search if configured
  const googleKey = process.env.GOOGLE_CUSTOM_API;
  const googleCx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
  if (googleKey && googleCx) {
    try {
      const gUrl = `https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${googleCx}&q=${encodeURIComponent(
        clean + " outline"
      )}&searchType=image&imgType=lineart&imgColorType=mono&num=3`;

      const gRes = await fetch(gUrl, {
        headers: { Referer: "https://papergen.online/" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (gRes.ok) {
        const data = await gRes.json();
        const first = data.items?.[0];
        const link = first?.image?.thumbnailLink || first?.link;
        if (link) return link;
      }
    } catch {
      // Ignore and fallback to DuckDuckGo
    }
  }

  // 2. High-quality outline clipart search via DuckDuckGo
  try {
    const q = clean + " outline";
    const res = await fetch(
      "https://duckduckgo.com/?q=" +
        encodeURIComponent(q) +
        "&t=h_&iar=images&iax=images&ia=images",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );
    const html = await res.text();
    const vqdMatch =
      html.match(/vqd=([0-9-]+)/) || html.match(/vqd=["']([^"']+)["']/);
    if (!vqdMatch) return null;

    const imgRes = await fetch(
      "https://duckduckgo.com/i.js?l=us-en&o=json&q=" +
        encodeURIComponent(q) +
        "&vqd=" +
        vqdMatch[1] +
        "&f=type:clipart,,",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
          Referer: "https://duckduckgo.com/",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );
    const imgData = await imgRes.json();
    const first = imgData.results?.[0];
    return first?.thumbnail || first?.image || null;
  } catch {
    return null;
  }
}

/**
 * Downloads an image URL and converts it to a base64 data URL.
 */
export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return null;
    return `data:${contentType};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Translates a non-English subject keyword to English if needed.
 */
function toEnglishSubject(raw: string): string {
  const clean = raw.trim();
  if (DICTIONARY[clean]) return DICTIONARY[clean];

  // If already ASCII letters, return as is
  if (/^[a-zA-Z0-9\s\-]+$/.test(clean)) return clean;

  // Stripped Hindi/Sanskrit punctuation/halant
  for (const [k, v] of Object.entries(DICTIONARY)) {
    if (clean.includes(k) || k.includes(clean)) return v;
  }

  return clean;
}

/**
 * Detects whether an item has an image placeholder.
 * Supports:
 * - [picture: parrot], (Image of an apple), [diagram: cell]
 * - चित्र 1: आम, चित्र: तोते, (चित्र: मोर)
 */
export function detectItemImageSubject(
  content: string,
  questionTitle?: string
): { subject: string; cleanContent: string } | null {
  if (!content) return null;

  // 1. Bracket style: [picture: apple] or (image of apple)
  const bracketMatch =
    /[\(\[]\s*(?:image|picture|photo|pic|diagram|drawing|चित्र)\s*(?:of\s+)?(?:\d+)?\s*[:\-]?\s*(?:an?\s+|the\s+)?([^)\]]+?)\s*[\)\]]/i.exec(
      content
    );
  if (bracketMatch) {
    const subject = bracketMatch[1].trim();
    const cleanContent = content.replace(bracketMatch[0], "").trim();
    return { subject, cleanContent };
  }

  // 2. Prefix style: चित्र 1: आम or Picture 1: Mango
  const prefixMatch =
    /^(?:चित्र|picture|image|diagram|pic)\s*(?:\d+)?\s*[:\-]\s*(.+)$/i.exec(
      content.trim()
    );
  if (prefixMatch) {
    const subject = prefixMatch[1].trim();
    return { subject, cleanContent: "" };
  }

  // 3. Question title indicates pictures and item content is a single subject word/phrase
  const isImageQuestion =
    questionTitle &&
    /(?:चित्र|चित्राणि|picture|image|diagram|drawing|look at the picture)/i.test(
      questionTitle
    );
  if (isImageQuestion) {
    const trimmed = content.trim();
    // If short word (less than 20 chars) and no question mark or long sentence
    if (trimmed.length > 0 && trimmed.length < 25 && !trimmed.includes("?")) {
      return { subject: trimmed, cleanContent: "" };
    }
  }

  return null;
}

/**
 * Automatically inspects questions, resolves image placeholders to real outline images,
 * and attaches them directly as base64 data URLs.
 */
export async function autoPopulateOutlineImages(
  questions: Question[]
): Promise<Question[]> {
  if (!Array.isArray(questions) || questions.length === 0) return questions;

  const tasks: Promise<void>[] = [];

  for (const q of questions) {
    if (!q.items || !Array.isArray(q.items)) continue;

    for (const item of q.items) {
      // If item already has an image, don't overwrite
      if (item.image) continue;

      const detected = detectItemImageSubject(item.content, q.title);
      if (!detected || !detected.subject) continue;

      const englishQuery = toEnglishSubject(detected.subject);
      if (!englishQuery) continue;

      tasks.push(
        (async () => {
          try {
            const imgUrl = await searchOutlineImageUrl(englishQuery);
            if (!imgUrl) return;
            const dataUrl = await fetchImageAsDataUrl(imgUrl);
            if (!dataUrl) return;

            item.image = dataUrl;
            item.imageWidth = 90;
            if (detected.cleanContent !== undefined) {
              item.content = detected.cleanContent;
            }
          } catch {
            // Non-critical, continue
          }
        })()
      );
    }
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }

  return questions;
}
