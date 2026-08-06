-- VROS 3.1 Knowledge Capture
-- Run after VROS 3.0.

alter table public.project_sessions add column if not exists session_type text not null default 'Research';
alter table public.project_sessions add column if not exists keywords text;
alter table public.project_sessions add column if not exists raw_capture text;
alter table public.project_sessions add column if not exists ai_generated boolean not null default false;

create table if not exists public.session_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.project_sessions(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, session_id, project_id)
);

create index if not exists session_projects_session_idx on public.session_projects(session_id);
create index if not exists session_projects_project_idx on public.session_projects(project_id);

alter table public.session_projects enable row level security;
grant select,insert,update,delete on public.session_projects to authenticated;

drop policy if exists "Users manage own session project links" on public.session_projects;
create policy "Users manage own session project links" on public.session_projects for all to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);

NOTIFY pgrst, 'reload schema';
