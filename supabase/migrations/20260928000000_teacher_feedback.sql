-- Teacher Feedback table for post-generation feedback
create table if not exists public.teacher_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  paper_id uuid references public.papers(id) on delete set null,
  generation_method text, -- 'ai_generated' | 'scanned' | 'ai_textbook'
  rating integer, -- 1 to 5
  expected_features text[] default '{}',
  feedback_text text,
  status text not null default 'pending', -- 'pending' | 'verified' | 'rewarded' | 'rejected'
  credits_rewarded integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_feedback_created_idx
  on public.teacher_feedback (created_at desc);
create index if not exists teacher_feedback_user_idx
  on public.teacher_feedback (user_id, created_at desc);

alter table public.teacher_feedback enable row level security;

-- Authenticated teachers can insert their own feedback
create policy "Users can insert feedback"
  on public.teacher_feedback for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);

-- Users can view their own feedback
create policy "Users can view own feedback"
  on public.teacher_feedback for select
  to authenticated
  using (auth.uid() = user_id);
