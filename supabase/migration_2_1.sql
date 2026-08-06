-- VROS 2.1 migration
-- Safe to run after the VROS 2.0 schema.

alter table public.projects add column if not exists priority text default 'Medium';

create table if not exists public.grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  agency text,
  status text not null default 'Planning',
  deadline date,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  resource_type text not null default 'Document',
  url text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists grants_user_idx on public.grants(user_id);
create index if not exists notes_project_idx on public.project_notes(project_id);
create index if not exists resources_project_idx on public.resources(project_id);

alter table public.grants enable row level security;
alter table public.project_notes enable row level security;
alter table public.resources enable row level security;

grant select,insert,update,delete on public.grants to authenticated;
grant select,insert,update,delete on public.project_notes to authenticated;
grant select,insert,update,delete on public.resources to authenticated;

drop policy if exists "Users manage own grants" on public.grants;
create policy "Users manage own grants" on public.grants for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop policy if exists "Users manage own project notes" on public.project_notes;
create policy "Users manage own project notes" on public.project_notes for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop policy if exists "Users manage own resources" on public.resources;
create policy "Users manage own resources" on public.resources for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop trigger if exists grants_set_updated_at on public.grants;
create trigger grants_set_updated_at before update on public.grants
for each row execute function public.set_updated_at();
