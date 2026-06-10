create extension if not exists pgcrypto;

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight numeric not null,
  waist numeric,
  notes text,
  logged_at timestamptz not null default now()
);

alter table public.body_metrics enable row level security;

drop policy if exists "Users can read their own body metrics" on public.body_metrics;
create policy "Users can read their own body metrics"
on public.body_metrics
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own body metrics" on public.body_metrics;
create policy "Users can insert their own body metrics"
on public.body_metrics
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own body metrics" on public.body_metrics;
create policy "Users can update their own body metrics"
on public.body_metrics
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own body metrics" on public.body_metrics;
create policy "Users can delete their own body metrics"
on public.body_metrics
for delete
using (auth.uid() = user_id);
