-- AROS 1.5 Communications & Collaboration
-- Additive migration. Existing VROS/AROS records are preserved.

-- Microsoft 365 delegated connection storage (server-only)
create table if not exists public.microsoft_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  microsoft_email text,
  encrypted_refresh_token text not null,
  scopes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.microsoft_connections enable row level security;

create table if not exists public.microsoft_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.microsoft_oauth_states enable row level security;

create table if not exists public.google_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text,
  encrypted_refresh_token text not null,
  scopes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deliberately no authenticated grants on google_connections or microsoft_connections.
alter table public.google_connections enable row level security;

create table if not exists public.google_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.google_oauth_states enable row level security;

create table if not exists public.email_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gmail_message_id text not null,
  gmail_thread_id text,
  sender text,
  sender_email text,
  subject text,
  received_at timestamptz,
  snippet text,
  body_text text,
  triage_category text not null default 'Unreviewed',
  priority text not null default 'Medium',
  project_id uuid references public.projects(id) on delete set null,
  why_it_matters text,
  suggested_action text,
  draft_response text,
  waiting_on boolean not null default false,
  commitment_detected text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, gmail_message_id)
);

create table if not exists public.proposal_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  source_type text not null default 'Google Doc',
  source_url text not null,
  google_file_id text,
  last_modified_time timestamptz,
  last_content_hash text,
  last_snapshot text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposal_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  watch_id uuid not null references public.proposal_watches(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  detected_at timestamptz not null default now(),
  modified_time timestamptz,
  summary text,
  significance text,
  requires_attention boolean not null default false,
  previous_hash text,
  current_hash text
);

create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  source_type text not null default 'Email',
  source_id text,
  description text not null,
  due_date date,
  direction text not null default 'Mine' check (direction in ('Mine','Theirs')),
  status text not null default 'Open' check (status in ('Open','Done','Dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_items_user_idx on public.email_items(user_id, status, received_at desc);
create index if not exists proposal_watches_user_idx on public.proposal_watches(user_id, enabled);
create index if not exists proposal_changes_user_idx on public.proposal_changes(user_id, detected_at desc);
create index if not exists commitments_user_idx on public.commitments(user_id, status, direction);

alter table public.email_items enable row level security;
alter table public.proposal_watches enable row level security;
alter table public.proposal_changes enable row level security;
alter table public.commitments enable row level security;

grant select,insert,update,delete on public.email_items to authenticated;
grant select,insert,update,delete on public.proposal_watches to authenticated;
grant select,insert,update,delete on public.proposal_changes to authenticated;
grant select,insert,update,delete on public.commitments to authenticated;

drop policy if exists "Users manage own email items" on public.email_items;
create policy "Users manage own email items" on public.email_items for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop policy if exists "Users manage own proposal watches" on public.proposal_watches;
create policy "Users manage own proposal watches" on public.proposal_watches for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop policy if exists "Users manage own proposal changes" on public.proposal_changes;
create policy "Users manage own proposal changes" on public.proposal_changes for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop policy if exists "Users manage own commitments" on public.commitments;
create policy "Users manage own commitments" on public.commitments for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

drop trigger if exists google_connections_set_updated_at on public.google_connections;
create trigger google_connections_set_updated_at before update on public.google_connections
for each row execute function public.set_updated_at();

drop trigger if exists email_items_set_updated_at on public.email_items;
create trigger email_items_set_updated_at before update on public.email_items
for each row execute function public.set_updated_at();

drop trigger if exists proposal_watches_set_updated_at on public.proposal_watches;
create trigger proposal_watches_set_updated_at before update on public.proposal_watches
for each row execute function public.set_updated_at();

drop trigger if exists commitments_set_updated_at on public.commitments;
create trigger commitments_set_updated_at before update on public.commitments
for each row execute function public.set_updated_at();

NOTIFY pgrst, 'reload schema';
