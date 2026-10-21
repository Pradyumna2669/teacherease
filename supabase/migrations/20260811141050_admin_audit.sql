-- Record every time an admin opens a teacher's paper.
--
-- Reading another person's content is sometimes necessary to fix a rendering or
-- scan bug, but it should never be untraceable. If a teacher ever asks whether
-- anyone looked at their paper, this is the answer.

create table if not exists public.admin_audit (
  id          uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action      text not null,           -- 'view_paper'
  paper_id    uuid,
  owner_id    uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists admin_audit_created_idx on public.admin_audit (created_at desc);
create index if not exists admin_audit_paper_idx   on public.admin_audit (paper_id, created_at desc);

alter table public.admin_audit enable row level security;

-- Service-role only. No client, admin or otherwise, reads or writes this
-- directly; the admin pages go through the server with the service key.
revoke all on public.admin_audit from anon, authenticated;
