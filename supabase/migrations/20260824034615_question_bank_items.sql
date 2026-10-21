-- The curated question bank.
--
-- Two jobs, one table:
--
--   Classes 1-8   fills the skills the templates cannot generate — anything
--                 whose answer is not arithmetic. Rows carry skill_id and no
--                 chapter, so they join the skill graph like any template.
--
--   Classes 9-12  is the whole engine. At that level the textbook is
--                 prescribed (NCERT for CBSE, Balbharati for Maharashtra), so
--                 chapter names are finally a reliable index and rows are
--                 anchored on chapter instead of on a skill.
--
-- board is nullable on purpose. A question testing "find the mean" is the same
-- question for every board, and storing it per board would multiply the
-- authoring cost by the number of boards — the mistake the skill graph exists
-- to avoid. Only genuinely board-specific rows (a prescribed chapter, a past
-- paper) carry a board.

create extension if not exists pgcrypto;

create table if not exists public.bank_items (
  id            uuid primary key default gen_random_uuid(),

  -- Placement. skill_id for 1-8, chapter for 9-12; at least one is required.
  board         text,                       -- null = works for any board
  class         int  not null check (class between 1 and 12),
  subject       text not null default 'maths',
  skill_id      text,                       -- graph id, e.g. "MUL.2D1D.REG"
  chapter       text,                       -- e.g. "Real Numbers"
  topic         text,

  question_type text not null,              -- matches lib/types QuestionType
  difficulty    text not null default 'medium'
                 check (difficulty in ('easy','medium','hard')),
  marks         int  not null default 1 check (marks between 1 and 20),

  -- Renders straight into the builder's SubItem shape.
  body          jsonb not null,             -- { text, options?, num1?, num2? }
  answer        text not null,
  explanation   text,

  language      text not null default 'english',

  -- Where it came from, and never a guess. 'pyq' rows MUST carry source_ref.
  provenance    text not null default 'llm'
                 check (provenance in ('llm','authored','pyq','teacher')),
  source_ref    text,                       -- "CBSE 2023 Set 1 Q5"

  review_state  text not null default 'machine-checked'
                 check (review_state in ('draft','machine-checked','human-approved','rejected')),

  usage_count   int not null default 0,
  reported_count int not null default 0,

  created_at    timestamptz not null default now(),

  -- A row has to be findable by one index or the other.
  constraint bank_items_placed check (skill_id is not null or chapter is not null),
  -- Claiming to be a past paper without saying which one is how a bank quietly
  -- fills up with invented "previous year questions".
  constraint bank_items_pyq_sourced check (provenance <> 'pyq' or source_ref is not null)
);

create index if not exists bank_items_skill_idx
  on public.bank_items (subject, class, skill_id)
  where skill_id is not null;

create index if not exists bank_items_chapter_idx
  on public.bank_items (subject, class, chapter)
  where chapter is not null;

create index if not exists bank_items_board_idx
  on public.bank_items (board, subject, class);

-- Stops the same question being seeded twice across runs.
create unique index if not exists bank_items_dedupe
  on public.bank_items (subject, class, question_type, md5(body->>'text'))
  where body->>'text' is not null and body->>'text' <> '';

-- ------------------------------------------------------------------- RLS

alter table public.bank_items enable row level security;

-- Shared content: any signed-in teacher may read it, nobody may write it from
-- the browser. Seeding and moderation go through the service role.
drop policy if exists "bank_items_read_signed_in" on public.bank_items;
create policy "bank_items_read_signed_in" on public.bank_items
  for select
  to authenticated
  using (review_state in ('machine-checked','human-approved'));
