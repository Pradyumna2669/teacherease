import type { QuestionType } from "@/lib/types";
import type { Band } from "./types";

// Bank items as the generator sees them.
//
// Kept free of any server SDK so the panel can import it in the browser — the
// same split as lib/answers.ts and lib/scan.ts. Fetching is one request for the
// whole paper, so generation itself stays a pure function.

export interface BankItem {
  id: string;
  skill_id: string | null;
  chapter: string | null;
  question_type: QuestionType;
  difficulty: Band;
  marks: number;
  body: { text: string; options?: string[] };
  answer: string;
}

export interface BankQuery {
  board: string;
  class: number;
  subject: string;
  /** Classes 1-8: the skills she has taught. */
  skills?: string[];
  /** Classes 9-12: the chapters she has covered. */
  chapters?: string[];
}

/**
 * Everything the bank can offer for this request, in one round trip.
 *
 * Deliberately over-fetches rather than asking per skill: a paper needs at most
 * a few hundred candidates, and one request keeps the generator synchronous
 * once it has them.
 */
export async function fetchBankItems(query: BankQuery): Promise<BankItem[]> {
  const res = await fetch("/api/curriculum/bank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!res.ok) {
    // A paper built from templates alone is still a paper. Failing the whole
    // generation because the bank is unreachable would be worse than a
    // thinner one.
    return [];
  }
  const data = (await res.json()) as { items?: BankItem[] };
  return data.items ?? [];
}
