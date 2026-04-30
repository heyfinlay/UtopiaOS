create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  status text not null default 'pending',
  target_type text not null,
  target_id uuid not null,
  title text not null,
  summary text not null,
  requested_by public.agent_actor not null default 'human',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create index if not exists approvals_owner_status_idx
on public.approvals (owner_id, status, created_at desc);

alter table public.approvals enable row level security;

create policy "owners_manage_approvals"
on public.approvals
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
