-- Mosaic ClickUp cache and durable synchronization queue.
-- Apply with the Supabase service-role deployment process. Never expose service credentials to clients.
create table if not exists public.echo_clickup_http_cache (
  scope_key text not null,
  cache_key text not null,
  url_hash text not null,
  resource_path text not null,
  status integer not null,
  status_text text not null default '',
  headers jsonb not null default '[]'::jsonb,
  body jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (scope_key, cache_key)
);
create index if not exists echo_clickup_http_cache_expiry on public.echo_clickup_http_cache (expires_at);
create index if not exists echo_clickup_http_cache_resource on public.echo_clickup_http_cache (scope_key, resource_path);
create table if not exists public.echo_clickup_rate_limits (
  scope_key text primary key,
  next_allowed_at timestamptz not null default now()
);

create table if not exists public.echo_clickup_connections (
  scope_key text primary key,
  user_id text not null,
  encrypted_token text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.echo_clickup_task_records (
  scope_key text not null,
  list_id text not null,
  record_id text not null,
  payload jsonb not null,
  synced_at timestamptz not null default now(),
  primary key (scope_key, list_id, record_id)
);
create index if not exists echo_clickup_task_records_list on public.echo_clickup_task_records (scope_key, list_id, synced_at desc);

create table if not exists public.echo_clickup_sync_jobs (
  id bigint generated always as identity primary key,
  scope_key text not null references public.echo_clickup_connections(scope_key) on delete cascade,
  user_id text not null,
  list_id text not null,
  state text not null default 'queued' check (state in ('queued','running','retry','ready','failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  last_error text,
  last_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (scope_key, list_id)
);
create index if not exists echo_clickup_sync_jobs_due on public.echo_clickup_sync_jobs (state, next_attempt_at);

create table if not exists public.echo_clickup_webhooks (
  webhook_id text primary key,
  scope_key text not null references public.echo_clickup_connections(scope_key) on delete cascade,
  list_id text not null,
  encrypted_secret text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists echo_clickup_webhooks_list_scope on public.echo_clickup_webhooks (scope_key, list_id) where active;
create table if not exists public.echo_clickup_webhook_events (
  webhook_id text not null references public.echo_clickup_webhooks(webhook_id) on delete cascade,
  event_key text not null,
  created_at timestamptz not null default now(),
  primary key (webhook_id, event_key)
);
create index if not exists echo_clickup_webhook_events_created on public.echo_clickup_webhook_events (created_at);

alter table public.echo_clickup_http_cache enable row level security;
alter table public.echo_clickup_rate_limits enable row level security;
alter table public.echo_clickup_connections enable row level security;
alter table public.echo_clickup_task_records enable row level security;
alter table public.echo_clickup_sync_jobs enable row level security;
alter table public.echo_clickup_webhooks enable row level security;
alter table public.echo_clickup_webhook_events enable row level security;
revoke all on public.echo_clickup_http_cache, public.echo_clickup_rate_limits, public.echo_clickup_connections, public.echo_clickup_task_records, public.echo_clickup_sync_jobs, public.echo_clickup_webhooks, public.echo_clickup_webhook_events from anon, authenticated;
grant all on public.echo_clickup_http_cache, public.echo_clickup_rate_limits, public.echo_clickup_connections, public.echo_clickup_task_records, public.echo_clickup_sync_jobs, public.echo_clickup_webhooks, public.echo_clickup_webhook_events to service_role;
grant usage, select on sequence public.echo_clickup_sync_jobs_id_seq to service_role;

create or replace function public.echo_claim_clickup_sync_jobs(p_limit integer default 2)
returns table(id bigint, scope_key text, user_id text, list_id text, encrypted_token text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select j.id from public.echo_clickup_sync_jobs j
    where (j.state in ('queued','retry') and j.next_attempt_at <= now())
       or (j.state = 'ready' and j.last_synced_at < now()-interval '24 hours')
       or (j.state = 'running' and j.lease_until < now())
    order by j.next_attempt_at, j.id
    for update skip locked limit least(greatest(p_limit,1),5)
  ), claimed as (
    update public.echo_clickup_sync_jobs j set state='running', attempts=j.attempts+1,
      lease_until=now()+interval '2 minutes', updated_at=now()
    from due where j.id=due.id
    returning j.id,j.scope_key,j.user_id,j.list_id
  )
  select c.id,c.scope_key,c.user_id,c.list_id,conn.encrypted_token
  from claimed c join public.echo_clickup_connections conn using(scope_key);
end $$;

create or replace function public.echo_publish_clickup_task_snapshot(p_job_id bigint,p_scope_key text,p_list_id text,p_tasks jsonb,p_synced_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.echo_clickup_sync_jobs where id=p_job_id and scope_key=p_scope_key and list_id=p_list_id and state='running') then
    raise exception 'sync lease is no longer valid';
  end if;
  delete from public.echo_clickup_task_records where scope_key=p_scope_key and list_id=p_list_id;
  insert into public.echo_clickup_task_records(scope_key,list_id,record_id,payload,synced_at)
  select p_scope_key,p_list_id,item->>'id',item,p_synced_at
  from jsonb_array_elements(coalesce(p_tasks,'[]'::jsonb)) item where coalesce(item->>'id','') <> '';
  update public.echo_clickup_sync_jobs set state='ready',last_synced_at=p_synced_at,last_error=null,lease_until=null,updated_at=now()
  where id=p_job_id and scope_key=p_scope_key and list_id=p_list_id;
end $$;

create or replace function public.echo_fail_clickup_sync_job(p_job_id bigint,p_error text)
returns void language sql security definer set search_path = public as $$
  update public.echo_clickup_sync_jobs set state=case when attempts >= 5 then 'failed' else 'retry' end,
    next_attempt_at=now()+make_interval(secs => least(900, 15 * (2 ^ least(attempts,6))::integer)),
    last_error=p_error,lease_until=null,updated_at=now()
  where id=p_job_id and state='running';
$$;

create or replace function public.echo_invalidate_clickup_sync(p_scope_key text,p_list_id text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.echo_clickup_http_cache
    where scope_key=p_scope_key and (p_list_id is null or resource_path like '/list/' || p_list_id || '/task%');
  update public.echo_clickup_sync_jobs set state='queued',next_attempt_at=now(),updated_at=now()
    where scope_key=p_scope_key and (p_list_id is null or list_id=p_list_id);
end $$;

create or replace function public.echo_reserve_clickup_request(p_scope_key text,p_interval_ms integer default 667)
returns integer language plpgsql security definer set search_path = public as $$
declare now_at timestamptz := clock_timestamp(); next_at timestamptz; wait_ms integer;
begin
  insert into public.echo_clickup_rate_limits(scope_key,next_allowed_at)
    values(p_scope_key,now_at) on conflict(scope_key) do nothing;
  select next_allowed_at into next_at from public.echo_clickup_rate_limits where scope_key=p_scope_key for update;
  wait_ms := greatest(0,ceil(extract(epoch from (next_at-now_at))*1000)::integer);
  update public.echo_clickup_rate_limits set next_allowed_at=greatest(next_at,now_at)+make_interval(secs => greatest(100,p_interval_ms)::double precision/1000)
    where scope_key=p_scope_key;
  return wait_ms;
end $$;

revoke all on function public.echo_claim_clickup_sync_jobs(integer) from public,anon,authenticated;
revoke all on function public.echo_publish_clickup_task_snapshot(bigint,text,text,jsonb,timestamptz) from public,anon,authenticated;
revoke all on function public.echo_fail_clickup_sync_job(bigint,text) from public,anon,authenticated;
revoke all on function public.echo_invalidate_clickup_sync(text,text) from public,anon,authenticated;
revoke all on function public.echo_reserve_clickup_request(text,integer) from public,anon,authenticated;
grant execute on function public.echo_claim_clickup_sync_jobs(integer) to service_role;
grant execute on function public.echo_publish_clickup_task_snapshot(bigint,text,text,jsonb,timestamptz) to service_role;
grant execute on function public.echo_fail_clickup_sync_job(bigint,text) to service_role;
grant execute on function public.echo_invalidate_clickup_sync(text,text) to service_role;
grant execute on function public.echo_reserve_clickup_request(text,integer) to service_role;

-- frontend/vercel.json runs GET /api/cron/clickup-sync daily; authenticated reads and webhooks also drain the queue.
