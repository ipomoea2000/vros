-- VROS 2.2 migration
-- Safe to run after migrations 2.0 and 2.1.

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  activity_type text not null default 'Update',
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists activity_user_idx on public.activity_log(user_id);
create index if not exists activity_project_idx on public.activity_log(project_id);

alter table public.activity_log enable row level security;
grant select,insert,update,delete on public.activity_log to authenticated;

drop policy if exists "Users manage own activity" on public.activity_log;
create policy "Users manage own activity" on public.activity_log for all to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);
