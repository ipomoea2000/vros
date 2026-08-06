-- VROS 3.0 Research Memory Engine
-- Run after VROS 2.0, 2.1, and 2.2 migrations.

alter table public.projects add column if not exists purpose text;
alter table public.projects add column if not exists hypothesis text;
alter table public.projects add column if not exists last_decision text;
alter table public.projects add column if not exists open_questions text;
alter table public.projects add column if not exists blockers text;
alter table public.projects add column if not exists resume_summary text;

alter table public.tasks add column if not exists workflow_state text not null default 'Next';

create table if not exists public.project_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  session_date date not null default current_date,
  title text not null,
  summary text,
  decisions text,
  evidence text,
  open_questions text,
  next_actions text,
  chat_url text,
  source_type text not null default 'ChatGPT session',
  created_at timestamptz not null default now()
);

create table if not exists public.project_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_project_id uuid not null references public.projects(id) on delete cascade,
  target_project_id uuid not null references public.projects(id) on delete cascade,
  relation_type text not null default 'Related',
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, source_project_id, target_project_id, relation_type)
);

create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  item_type text not null default 'Idea',
  processed boolean not null default false,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_project_idx on public.project_sessions(project_id);
create index if not exists relations_source_idx on public.project_relations(source_project_id);
create index if not exists relations_target_idx on public.project_relations(target_project_id);
create index if not exists inbox_user_idx on public.inbox_items(user_id);

alter table public.project_sessions enable row level security;
alter table public.project_relations enable row level security;
alter table public.inbox_items enable row level security;

grant select,insert,update,delete on public.project_sessions to authenticated;
grant select,insert,update,delete on public.project_relations to authenticated;
grant select,insert,update,delete on public.inbox_items to authenticated;

drop policy if exists "Users manage own sessions" on public.project_sessions;
create policy "Users manage own sessions" on public.project_sessions for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop policy if exists "Users manage own relations" on public.project_relations;
create policy "Users manage own relations" on public.project_relations for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop policy if exists "Users manage own inbox" on public.inbox_items;
create policy "Users manage own inbox" on public.inbox_items for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
