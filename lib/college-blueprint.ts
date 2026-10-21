import { createClient } from "@/lib/supabase/client";
import type { Question, QuestionType } from "@/lib/types";
import type { BankItem } from "./question-bank";

export interface BlueprintSlot {
  unit_no: number;
  marks: number;
  count: number;
}

export interface SlotReadiness {
  unit: number;
  marks: number;
  needed: number;
  available: number;
  ok: boolean;
}

export interface BlueprintReadinessReport {
  isSufficient: boolean;
  totalActive: number;
  slots: SlotReadiness[];
}

export interface CollegeFormat {
  id: string;
  name: string;
  total_marks: number;
  blueprint: {
    slots?: BlueprintSlot[];
    groups?: {
      q_no: number;
      title: string;
      A: { unit_no: number; marks: number; count: number }[];
      B: { unit_no: number; marks: number; count: number }[];
    }[];
  };
}

export function extractBlueprintRequirements(blueprint: any): BlueprintSlot[] {
  if (!blueprint) return [];
  const rawSlots: { unit_no: number; marks: number; count: number }[] = [];

  if (Array.isArray(blueprint)) {
    blueprint.forEach((s) => {
      rawSlots.push({
        unit_no: s.unit_no ?? s.unit ?? 1,
        marks: s.marks ?? s.mark ?? 2,
        count: s.count ?? s.needed ?? 1,
      });
    });
  } else if (Array.isArray(blueprint.slots)) {
    blueprint.slots.forEach((s: any) => {
      rawSlots.push({
        unit_no: s.unit_no ?? s.unit ?? 1,
        marks: s.marks ?? s.mark ?? 2,
        count: s.count ?? s.needed ?? 1,
      });
    });
  } else if (Array.isArray(blueprint.groups)) {
    blueprint.groups.forEach((g: any) => {
      ["A", "B", "questions", "items"].forEach((key) => {
        if (Array.isArray(g[key])) {
          g[key].forEach((sub: any) => {
            rawSlots.push({
              unit_no: sub.unit_no ?? sub.unit ?? g.unit ?? 1,
              marks: sub.marks ?? sub.mark ?? 2,
              count: sub.count ?? 1,
            });
          });
        }
      });
    });
  }

  // Aggregate by unit_no and marks
  const aggregated: Record<string, BlueprintSlot> = {};
  rawSlots.forEach((slot) => {
    const key = `U${slot.unit_no}_${slot.marks}m`;
    if (!aggregated[key]) {
      aggregated[key] = { unit_no: slot.unit_no, marks: slot.marks, count: 0 };
    }
    aggregated[key].count += slot.count;
  });

  return Object.values(aggregated);
}

/** Check if bank has enough questions for this format and variant */
export function evaluateBlueprintReadiness(
  blueprint: any,
  bankQuestions: BankItem[],
  alreadyIssuedIds: Set<string> = new Set(),
  variant: "normal" | "backlog" = "normal"
): BlueprintReadinessReport {
  const reqs = extractBlueprintRequirements(blueprint);
  if (reqs.length === 0) {
    return {
      isSufficient: bankQuestions.length >= 10,
      totalActive: bankQuestions.length,
      slots: [],
    };
  }

  // Backlog variant excludes all questions already used in the same cycle!
  const eligiblePool = bankQuestions.filter((q) => {
    if (!q.enabled) return false;
    if (variant === "backlog" && alreadyIssuedIds.has(q.id)) return false;
    return true;
  });

  const slots: SlotReadiness[] = reqs.map((req) => {
    const available = eligiblePool.filter((q) => {
      const u = q.unit_no ?? q.payload?.unit_no ?? 1;
      const m = q.marks ?? q.payload?.marks ?? 1;
      return u === req.unit_no && m === req.marks;
    }).length;

    return {
      unit: req.unit_no,
      marks: req.marks,
      needed: req.count,
      available,
      ok: available >= req.count,
    };
  });

  const isSufficient = slots.every((s) => s.ok);

  return {
    isSufficient,
    totalActive: eligiblePool.length,
    slots,
  };
}

/** Synthesize structured exam paper questions conforming to blueprint */
export function synthesizeCollegePaper(
  blueprint: any,
  bankQuestions: BankItem[],
  alreadyIssuedIds: Set<string> = new Set(),
  variant: "normal" | "backlog" = "normal"
): Question[] {
  // Pool of available candidate questions
  let pool = bankQuestions.filter((q) => {
    if (!q.enabled) return false;
    if (variant === "backlog" && alreadyIssuedIds.has(q.id)) return false;
    return true;
  });

  const pickedIds = new Set<string>();

  function takeRandom(unit: number, marks: number, count: number): BankItem[] {
    const matching = pool.filter(
      (q) =>
        !pickedIds.has(q.id) &&
        (q.unit_no ?? q.payload?.unit_no ?? 1) === unit &&
        (q.marks ?? q.payload?.marks ?? 1) === marks
    );

    if (matching.length < count) {
      throw new Error(
        `Insufficient questions for Unit ${unit} (${marks} marks). Need ${count}, but only ${matching.length} available.`
      );
    }

    // Shuffle
    const shuffled = [...matching].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, count);
    chosen.forEach((c) => pickedIds.add(c.id));
    return chosen;
  }

  const generatedQuestions: Question[] = [];

  if (blueprint.groups && Array.isArray(blueprint.groups)) {
    // Structured college group format: Q1 A) Compulsory, Q1 B) Elective
    blueprint.groups.forEach((grp: any, gIdx: number) => {
      const qNo = grp.q_no ?? gIdx + 1;

      // Part A: Compulsory
      if (grp.A && Array.isArray(grp.A)) {
        const subItems: any[] = [];
        let aMarksTotal = 0;
        grp.A.forEach((slot: any) => {
          const items = takeRandom(slot.unit_no ?? grp.unit ?? 1, slot.marks, slot.count ?? 1);
          items.forEach((item) => {
            aMarksTotal += item.marks;
            subItems.push({
              id: item.id,
              content: item.title || item.payload?.title || "",
              marks: item.marks,
              co_no: item.co_no ?? item.unit_no,
              bt_level: item.bt_level,
              image_url: item.image_url,
            });
          });
        });

        generatedQuestions.push({
          id: `q_${qNo}_A`,
          type: "short-answer",
          title: `Solve the following questions (Compulsory)`,
          marks: aMarksTotal,
          items: subItems,
          part: "A",
          q_no: qNo,
        });
      }

      // Part B: Solve any two of the following
      if (grp.B && Array.isArray(grp.B)) {
        const subItems: any[] = [];
        let bMarks = 4;
        grp.B.forEach((slot: any) => {
          const items = takeRandom(slot.unit_no ?? grp.unit ?? 1, slot.marks, slot.count ?? 1);
          items.forEach((item) => {
            bMarks = item.marks;
            subItems.push({
              id: item.id,
              content: item.title || item.payload?.title || "",
              marks: item.marks,
              co_no: item.co_no ?? item.unit_no,
              bt_level: item.bt_level,
              image_url: item.image_url,
            });
          });
        });

        generatedQuestions.push({
          id: `q_${qNo}_B`,
          type: "long-answer",
          title: `Solve any two of the following`,
          marks: bMarks * 2, // e.g. 2 x 4m = 8 marks
          items: subItems,
          part: "B",
          q_no: qNo,
        });
      }
    });
  } else {
    // Flat slot synthesis
    const reqs = extractBlueprintRequirements(blueprint);
    let qCounter = 1;
    reqs.forEach((slot) => {
      const items = takeRandom(slot.unit_no, slot.marks, slot.count);
      items.forEach((item) => {
        generatedQuestions.push({
          id: `q_${qCounter}`,
          type: slot.marks <= 2 ? "short-answer" : "long-answer",
          title: item.title || item.payload?.title || "",
          marks: slot.marks,
          unit_no: slot.unit_no,
          co_no: item.co_no ?? slot.unit_no,
          bt_level: item.bt_level ?? undefined,
          image_url: item.image_url ?? undefined,
          q_no: qCounter,
          items: [{ id: "item_1", content: item.title || item.payload?.title || "" }],
        });
        qCounter++;
      });
    });
  }

  return generatedQuestions;
}
