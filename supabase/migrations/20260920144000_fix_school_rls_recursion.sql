-- Fix infinite recursion in RLS policies for schools, school_members, and papers
-- Using SECURITY DEFINER helper functions prevents circular policy evaluation.

create or replace function public.is_school_admin(p_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.schools
    where id = p_school_id and admin_user_id = (select auth.uid())
  );
$$;

create or replace function public.is_school_member(p_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.school_members
    where school_id = p_school_id and user_id = (select auth.uid())
  );
$$;

grant execute on function public.is_school_admin(uuid) to authenticated, anon;
grant execute on function public.is_school_member(uuid) to authenticated, anon;

-- Rebuild schools SELECT policy using helper function
drop policy if exists "schools_select_member_or_admin" on public.schools;
create policy "schools_select_member_or_admin" on public.schools
  for select using (
    (select auth.uid()) = admin_user_id
    or public.is_school_member(id)
  );

-- Rebuild school_members SELECT policy using helper function
drop policy if exists "school_members_select" on public.school_members;
create policy "school_members_select" on public.school_members
  for select using (
    (select auth.uid()) = user_id
    or public.is_school_admin(school_id)
  );

-- Rebuild papers SELECT and UPDATE policies
drop policy if exists "papers_select_own" on public.papers;
drop policy if exists "papers_select_school_admin" on public.papers;
create policy "papers_select_own" on public.papers
  for select using (
    (select auth.uid()) = user_id
    or (school_id is not null and public.is_school_admin(school_id))
  );

drop policy if exists "papers_update_own" on public.papers;
drop policy if exists "papers_update_school_admin" on public.papers;
create policy "papers_update_own" on public.papers
  for update using (
    (select auth.uid()) = user_id
    or (school_id is not null and public.is_school_admin(school_id))
  );

-- Rebuild school_templates policies
drop policy if exists "school_templates_select" on public.school_templates;
create policy "school_templates_select" on public.school_templates
  for select using (
    public.is_school_member(school_id)
    or public.is_school_admin(school_id)
  );

drop policy if exists "school_templates_insert" on public.school_templates;
create policy "school_templates_insert" on public.school_templates
  for insert with check (
    (select auth.uid()) = created_by and (
      public.is_school_member(school_id)
      or public.is_school_admin(school_id)
    )
  );

drop policy if exists "school_templates_update" on public.school_templates;
create policy "school_templates_update" on public.school_templates
  for update using (
    (select auth.uid()) = created_by
    or public.is_school_admin(school_id)
  );

drop policy if exists "school_templates_delete" on public.school_templates;
create policy "school_templates_delete" on public.school_templates
  for delete using (
    (select auth.uid()) = created_by
    or public.is_school_admin(school_id)
  );
