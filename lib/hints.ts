/**
 * Splits a question title into the instruction line and any hints/help-box words.
 *
 * Example:
 *   "Complete the following essay using the words from the bracket: (sweets, diyas, lights)"
 * -> title: "Complete the following essay using the words from the bracket:"
 *    hints: "(sweets, diyas, lights)"
 */
export function splitTitleAndHints(rawTitle: string): { title: string; hints?: string } {
  if (!rawTitle) return { title: rawTitle ?? "" };
  const str = rawTitle.trim();

  // Pattern 1: Title with a newline where the second line is in parentheses/brackets or starts with Hints/Help
  const newlineMatch = str.match(/^([\s\S]+?)\n+([(A-Z][\s\S]+)$/);
  if (newlineMatch) {
    const candidateHint = newlineMatch[2].trim();
    if (
      (candidateHint.startsWith("(") && candidateHint.endsWith(")")) ||
      (candidateHint.startsWith("[") && candidateHint.endsWith("]")) ||
      /^(?:hints?|help\s*box|words?|clues?)\s*:/i.test(candidateHint) ||
      candidateHint.includes(",")
    ) {
      return { title: newlineMatch[1].trim(), hints: candidateHint };
    }
  }

  // Pattern 2: Title ending with bracketed list containing commas (e.g. "(word1, word2, word3)" or "[w1, w2]:")
  // Must have at least one comma inside the brackets, and length >= 8 so symbols like "(✓)" or "(a)" are never treated as hints.
  const bracketMatch = str.match(/^([\s\S]+?[:\s]?)\s*([(][^()]{8,}[)]|[\[][^\[\]]{8,}[\]])[:\s]*$/);
  if (bracketMatch) {
    const candidateHint = bracketMatch[2].trim();
    if (candidateHint.includes(",")) {
      let cleanTitle = bracketMatch[1].trim();
      // Ensure cleanTitle ends nicely with a colon if it makes sense or trim dangling colons
      return { title: cleanTitle, hints: candidateHint };
    }
  }

  // Pattern 3: Explicit "Hints: ..." or "Help box: ..." at the end
  const explicitMatch = str.match(/^([\s\S]+?[:\s])\s*((?:hints?|help\s*box|words?|clues?)\s*:\s*[\s\S]+)$/i);
  if (explicitMatch) {
    return { title: explicitMatch[1].trim(), hints: explicitMatch[2].trim() };
  }

  return { title: str };
}
