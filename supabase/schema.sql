-- VROS 2.0 schema
-- Paste this entire file into Supabase SQL Editor and click Run.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  area text not null default 'General',
  status text not null default 'Active',
  progress integer not null default 0 check (progress between 0 and 100),
  summary text,
  next_action text,
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  priority text not null default 'Medium',
  due_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.manuscripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  journal text,
  status text not null default 'Planning',
  next_action text,
  doi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_project_id_idx on public.tasks(project_id);
create index if not exists manuscripts_user_id_idx on public.manuscripts(user_id);
create index if not exists manuscripts_project_id_idx on public.manuscripts(project_id);

alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.manuscripts enable row level security;

grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.manuscripts to authenticated;

drop policy if exists "Users manage own projects" on public.projects;
create policy "Users manage own projects"
on public.projects for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own tasks" on public.tasks;
create policy "Users manage own tasks"
on public.tasks for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own manuscripts" on public.manuscripts;
create policy "Users manage own manuscripts"
on public.manuscripts for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists manuscripts_set_updated_at on public.manuscripts;
create trigger manuscripts_set_updated_at before update on public.manuscripts
for each row execute function public.set_updated_at();
