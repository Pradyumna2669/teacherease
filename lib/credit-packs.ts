// TeacherEase Paper Packs & Pricing.
// Simplified "Paper Count" model:
// 1 Paper = 20 credits under the hood.
// Every paper includes unlimited handwriting page scans, AI questions, answer keys, and Word/PDF export.

export const PAPER_CREDIT_COST = 20;

export const CREDIT_COSTS = {
  scan: 20, // 1 Paper (unlimited scanned pages!)
  generate: 0, // Manual paper creation is free
  aiQuestions: 20, // 1 Paper (unlimited textbook photos attached!)
  aiQuestionsPage: 0, // No per-photo fee
  answers: 0, // Answer keys included
  regenerateQuestion: 0, // Question regenerations included
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// Converts credit balance to remaining complete AI papers.
export function getPapersRemaining(balance: number | null): number | null {
  if (balance === null) return null;
  return Math.max(0, Math.floor(balance / PAPER_CREDIT_COST));
}

export interface CreditPack {
  id: string; // stable id used in Razorpay order notes
  name: string;
  papers: number;
  credits: number;
  amountInr: number;
  originalPriceInr?: number;
  badge?: string;
  highlight?: boolean;
  oneTimeOnly?: boolean;
  description: string;
  features: string[];
}

// Transparent, simple paper packs:
export const TOPUP_PACKS: CreditPack[] = [
  {
    id: "pack_trial_29",
    name: "Starter Trial",
    papers: 5,
    credits: 100, // 5 papers * 20
    amountInr: 29,
    originalPriceInr: 99,
    badge: "1st Purchase Special",
    oneTimeOnly: true,
    description: "Try TeacherEase on real classroom exam papers.",
    features: [
      "5 Full Papers",
      "Unlimited scan pages per paper",
      "No Watermark & No Ads",
      "Instant PDF & Word download",
      "Credits never expire",
    ],
  },
  {
    id: "pack_monthly_79",
    name: "Monthly Pack",
    papers: 15,
    credits: 300, // 15 papers * 20
    amountInr: 79,
    originalPriceInr: 149,
    badge: "Most Popular",
    highlight: true,
    description: "Best for monthly unit tests & weekly tuition classes.",
    features: [
      "15 Full Papers",
      "Unlimited scan pages per paper",
      "No Watermark & No Ads",
      "All question types & Set B",
      "Credits never expire",
    ],
  },
  {
    id: "pack_exam_149",
    name: "Exam Season Pack",
    papers: 35,
    credits: 700, // 35 papers * 20
    amountInr: 149,
    originalPriceInr: 299,
    badge: "Best Value",
    description: "For mid-term, terminal, and semester exams.",
    features: [
      "35 Full Papers",
      "Unlimited scan pages per paper",
      "No Watermark & No Ads",
      "Answer keys & Set B parallel papers",
      "Editable Word (.docx) export",
      "Credits never expire",
    ],
  },
  {
    id: "pack_annual_499",
    name: "Annual Teacher Pro",
    papers: 100,
    credits: 2000, // 100 papers * 20
    amountInr: 499,
    originalPriceInr: 999,
    badge: "Academic Year Pass",
    description: "Complete year-round exam creator for school teachers.",
    features: [
      "100 Full Papers",
      "Unlimited scan pages per paper",
      "No Watermark & No Ads",
      "Priority AI processing",
      "VIP teacher support",
      "Credits never expire",
    ],
  },
];

// Fallback legacy pack mapping so old IDs/webhooks don't fail
const LEGACY_PACKS: Record<string, CreditPack> = {
  pack_60: {
    id: "pack_60",
    name: "Starter",
    papers: 3,
    credits: 60,
    amountInr: 59,
    description: "3 papers",
    features: ["3 papers", "No watermark"],
  },
  pack_180: {
    id: "pack_180",
    name: "Popular",
    papers: 9,
    credits: 180,
    amountInr: 159,
    description: "9 papers",
    features: ["9 papers", "No watermark"],
  },
  pack_400: {
    id: "pack_400",
    name: "Pro",
    papers: 20,
    credits: 400,
    amountInr: 329,
    description: "20 papers",
    features: ["20 papers", "No watermark"],
  },
  pack_1000: {
    id: "pack_1000",
    name: "Mega",
    papers: 50,
    credits: 1000,
    amountInr: 749,
    description: "50 papers",
    features: ["50 papers", "No watermark"],
  },
};

export const TEACHERS_DAY_OFFER = {
  discountPercent: 30,
  start: "2026-09-05",
  end: "2026-09-11",
} as const;

export function isTeachersDayOfferActive(now = new Date()): boolean {
  const indiaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(now);
  return indiaDate >= TEACHERS_DAY_OFFER.start && indiaDate <= TEACHERS_DAY_OFFER.end;
}

export function packPriceInr(pack: CreditPack, now = new Date()): number {
  if (!isTeachersDayOfferActive(now)) return pack.amountInr;
  return Math.round(pack.amountInr * (1 - TEACHERS_DAY_OFFER.discountPercent / 100));
}

export function getPack(id: string): CreditPack | null {
  return TOPUP_PACKS.find((p) => p.id === id) ?? LEGACY_PACKS[id] ?? null;
}

// Subscription plans that grant credits on every successful charge.
export interface CreditPlan {
  id: "teacher_monthly" | "teacher_annual";
  name: string;
  papers: number;
  credits: number; // granted per successful charge
  period: "month" | "year";
  amountInr: number;
  razorpayPlanEnv: string;
  highlight?: boolean;
}

export const CREDIT_PLANS: CreditPlan[] = [
  {
    id: "teacher_monthly",
    name: "Teacher Monthly",
    papers: 25,
    credits: 500,
    period: "month",
    amountInr: 99,
    razorpayPlanEnv: "RAZORPAY_PLAN_TEACHER_MONTHLY",
    highlight: true,
  },
  {
    id: "teacher_annual",
    name: "Teacher Annual",
    papers: 150,
    credits: 3000,
    period: "year",
    amountInr: 499,
    razorpayPlanEnv: "RAZORPAY_PLAN_TEACHER_ANNUAL",
  },
];

export function planCredits(planId: string): number {
  return CREDIT_PLANS.find((p) => p.id === planId)?.credits ?? 0;
}

export function razorpayRef(id: string): string {
  return `rzp:${id}`;
}

// School bulk pricing
export const SCHOOL_CREDIT_LIST_INR = 0.8;
export const SCHOOL_DISCOUNT_BPS = 1500;

export function schoolCreditCostInr(credits: number): number {
  const gross = credits * SCHOOL_CREDIT_LIST_INR;
  const net = gross * (1 - SCHOOL_DISCOUNT_BPS / 10000);
  return Math.round(net * 100) / 100;
}
