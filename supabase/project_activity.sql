-- Append-only audit feed for Project Echo project workspaces.
-- API access uses the server-side Supabase service role; no client policies are granted.
create table if not exists public.project_activity (
  id uuid primary key default gen_random_uuid(),
  folder_id text not null,
  list_id text not null,
  list_name text not null,
  task_id text,
  task_name text,
  event_type text not null,
  summary text not null,
  actor_id text,
  actor_name text not null default 'Project member',
  task_url text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists project_activity_folder_created_idx
  on public.project_activity (folder_id, created_at desc);
create index if not exists project_activity_list_created_idx
  on public.project_activity (folder_id, list_id, created_at desc);

alter table public.project_activity enable row level security;
