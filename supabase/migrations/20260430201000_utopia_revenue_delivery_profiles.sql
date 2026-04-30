alter table public.leads
add column if not exists commercial_profile jsonb not null default '{}'::jsonb;

alter table public.leads
add column if not exists delivery_profile jsonb not null default '{}'::jsonb;
