-- Add method column to track how each paper was created.
-- typed       = blank paper, manually typed questions (default)
-- scanned     = created via photo scan
-- ai_generated = AI generated from syllabus/topic (no textbook photos)
-- ai_textbook  = AI generated from textbook page photos

ALTER TABLE public.papers
  ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'typed'
    CHECK (method IN ('typed', 'scanned', 'ai_generated', 'ai_textbook'));

CREATE INDEX IF NOT EXISTS papers_method_idx ON public.papers (method);

-- Backfill existing scanned papers from the credit ledger.
UPDATE public.papers p
SET method = 'scanned'
WHERE EXISTS (
  SELECT 1 FROM public.credit_ledger cl
  WHERE cl.ref = p.id::text AND cl.reason = 'scan'
);
