create table if not exists public.echo_forms_config (
  id text primary key check (id = 'global'),
  config jsonb not null default '{"admins":[],"departments":[],"mappings":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.echo_forms_config enable row level security;

-- The server uses the service key for this singleton. No client-side policy is granted.
