-- Phase 4: School / Team Collaboration Workflow
-- Branding, Shared Templates, and Paper Review/Approval

-- 1. School Branding
alter table public.schools
  add column if not exists logo_url text,
  add column if not exists address text,
  add column if not exists affiliation text,
  add column if not exists default_header jsonb not null default '{}'::jsonb;

-- 2. Papers School Affiliation & Approval Workflow
alter table public.papers
  add column if not exists school_id uuid references public.schools(id) on delete set null,
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'in_review', 'approved', 'changes_requested')),
  add column if not exists review_feedback text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

create index if not exists papers_school_status_idx
  on public.papers (school_id, status, updated_at desc);

-- 3. Shared School Templates
create table if not exists public.school_templates (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  created_by  uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  subject     text,
  class_name  text,
  settings    jsonb not null default '{}'::jsonb,
  sections    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists school_templates_school_idx
  on public.school_templates (school_id, created_at desc);

alter table public.school_templates enable row level security;

-- School members can view their school's templates
drop policy if exists "school_templates_select" on public.school_templates;
create policy "school_templates_select" on public.school_templates
  for select using (
    exists (
      select 1 from public.school_members sm
      where sm.school_id = school_templates.school_id
        and sm.user_id = auth.uid()
    )
  );

-- Teachers/Admins can add templates for their school
drop policy if exists "school_templates_insert" on public.school_templates;
create policy "school_templates_insert" on public.school_templates
  for insert with check (
    auth.uid() = created_by and
    exists (
      select 1 from public.school_members sm
      where sm.school_id = school_templates.school_id
        and sm.user_id = auth.uid()
    )
  );

-- Creators or school admins can delete/update templates
drop policy if exists "school_templates_delete" on public.school_templates;
create policy "school_templates_delete" on public.school_templates
  for delete using (
    auth.uid() = created_by or
    exists (
      select 1 from public.schools s
      where s.id = school_templates.school_id
        and s.admin_user_id = auth.uid()
    )
  );

drop policy if exists "school_templates_update" on public.school_templates;
create policy "school_templates_update" on public.school_templates
  for update using (
    auth.uid() = created_by or
    exists (
      select 1 from public.schools s
      where s.id = school_templates.school_id
        and s.admin_user_id = auth.uid()
    )
  );

-- 4. School Admin review access to papers submitted for review
drop policy if exists "papers_select_school_admin" on public.papers;
create policy "papers_select_school_admin" on public.papers
  for select using (
    auth.uid() = user_id or
    (
      school_id is not null and
      exists (
        select 1 from public.schools s
        where s.id = papers.school_id
          and s.admin_user_id = auth.uid()
      )
    )
  );

-- School admin can update status and feedback on review
drop policy if exists "papers_update_school_admin" on public.papers;
create policy "papers_update_school_admin" on public.papers
  for update using (
    auth.uid() = user_id or
    (
      school_id is not null and
      exists (
        select 1 from public.schools s
        where s.id = papers.school_id
          and s.admin_user_id = auth.uid()
      )
    )
  );
