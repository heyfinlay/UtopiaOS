create extension if not exists pgcrypto;

create type public.lead_status as enum (
  'new',
  'researching',
  'qualified',
  'proposal',
  'won',
  'lost'
);

create type public.lead_priority as enum (
  'critical',
  'high',
  'normal'
);

create type public.agent_run_status as enum (
  'queued',
  'running',
  'completed',
  'failed',
  'approval_required'
);

create type public.agent_actor as enum (
  'human',
  'agent',
  'system'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  company text not null,
  website text,
  source text,
  priority public.lead_priority not null default 'normal',
  status public.lead_status not null default 'new',
  notes text,
  next_action text,
  research_payload jsonb not null default '{}'::jsonb,
  last_researched_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  company text not null,
  status text not null default 'active',
  audit_notes jsonb not null default '[]'::jsonb,
  delivery_roadmap jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null,
  stat_key text not null,
  xp_reward integer not null default 0,
  status text not null default 'active',
  progress_label text,
  due_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  status public.agent_run_status not null default 'queued',
  target_type text not null,
  target_id uuid not null,
  mode text not null default 'openclaw-cli',
  requires_approval boolean not null default false,
  prompt text not null,
  summary text,
  error text,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  kind text not null,
  actor public.agent_actor not null default 'system',
  message text not null,
  xp_awards jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.progression_stats (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  sales integer not null default 0,
  delivery integer not null default 0,
  content integer not null default 0,
  systems integer not null default 0,
  relationships integer not null default 0,
  revenue integer not null default 0,
  discipline integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists leads_owner_status_idx on public.leads (owner_id, status, priority);
create index if not exists leads_updated_at_idx on public.leads (updated_at desc);
create index if not exists agent_runs_owner_started_idx on public.agent_runs (owner_id, started_at desc);
create index if not exists activities_owner_created_idx on public.activities (owner_id, created_at desc);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row
execute function public.set_updated_at();

drop trigger if exists missions_set_updated_at on public.missions;
create trigger missions_set_updated_at
before update on public.missions
for each row
execute function public.set_updated_at();

drop trigger if exists templates_set_updated_at on public.templates;
create trigger templates_set_updated_at
before update on public.templates
for each row
execute function public.set_updated_at();

alter table public.leads enable row level security;
alter table public.clients enable row level security;
alter table public.missions enable row level security;
alter table public.templates enable row level security;
alter table public.agent_runs enable row level security;
alter table public.activities enable row level security;
alter table public.progression_stats enable row level security;

create policy "owners_manage_leads"
on public.leads
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "owners_manage_clients"
on public.clients
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "owners_manage_missions"
on public.missions
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "owners_manage_templates"
on public.templates
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "owners_manage_agent_runs"
on public.agent_runs
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "owners_manage_activities"
on public.activities
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "owners_manage_progression_stats"
on public.progression_stats
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
