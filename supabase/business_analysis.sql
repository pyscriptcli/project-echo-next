create table if not exists public.mosaic_ba_workspaces (
  owner_user_id text primary key,
  owner_email text not null,
  state jsonb not null default '{"projects":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.mosaic_ba_workspaces enable row level security;
revoke all on public.mosaic_ba_workspaces from anon, authenticated;
grant all on public.mosaic_ba_workspaces to service_role;
