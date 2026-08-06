-- AROS 1.0 advisory-agent migration
-- Additive only. Existing VROS projects, links, sessions, tasks, manuscripts,
-- grants, notes, and resources are not changed or deleted.

create table if not exists public.agent_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  autonomy_mode text not null default 'advisory'
    check (autonomy_mode in ('advisory','approved_actions')),
  daily_brief_enabled boolean not null default false,
  stale_project_days integer not null default 30 check (stale_project_days between 7 and 365),
  deadline_window_days integer not null default 21 check (deadline_window_days between 1 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_type text not null,
  status text not null default 'running'
    check (status in ('running','completed','failed')),
  summary text,
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.agent_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  agent_type text not null,
  title text not null,
  rationale text,
  priority text not null default 'Medium'
    check (priority in ('High','Medium','Low')),
  status text not null default 'pending'
    check (status in ('pending','approved','dismissed','completed')),
  proposed_action jsonb not null default '{"type":"none"}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists agent_runs_user_idx
  on public.agent_runs(user_id, started_at desc);
create index if not exists agent_recommendations_user_idx
  on public.agent_recommendations(user_id, status, created_at desc);
create index if not exists agent_recommendations_project_idx
  on public.agent_recommendations(project_id);

alter table public.agent_settings enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_recommendations enable row level security;

grant select,insert,update,delete on public.agent_settings to authenticated;
grant select,insert,update,delete on public.agent_runs to authenticated;
grant select,insert,update,delete on public.agent_recommendations to authenticated;

drop policy if exists "Users manage own agent settings" on public.agent_settings;
create policy "Users manage own agent settings"
on public.agent_settings for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own agent runs" on public.agent_runs;
create policy "Users manage own agent runs"
on public.agent_runs for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own recommendations" on public.agent_recommendations;
create policy "Users manage own recommendations"
on public.agent_recommendations for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop trigger if exists agent_settings_set_updated_at on public.agent_settings;
create trigger agent_settings_set_updated_at
before update on public.agent_settings
for each row execute function public.set_updated_at();

NOTIFY pgrst, 'reload schema';
