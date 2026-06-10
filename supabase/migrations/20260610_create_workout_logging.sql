create extension if not exists pgcrypto;

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  workout_type text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_minutes int,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_name text not null,
  muscle_group text,
  set_number int not null,
  weight numeric,
  reps int,
  rpe numeric,
  notes text,
  pain_flag boolean not null default false,
  logged_at timestamptz not null default now()
);

create table if not exists public.exercise_catalog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text,
  equipment text,
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

alter table public.workout_sessions enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.exercise_catalog enable row level security;

drop policy if exists "Users can read their own workout sessions" on public.workout_sessions;
create policy "Users can read their own workout sessions"
on public.workout_sessions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own workout sessions" on public.workout_sessions;
create policy "Users can insert their own workout sessions"
on public.workout_sessions
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own workout sessions" on public.workout_sessions;
create policy "Users can update their own workout sessions"
on public.workout_sessions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own workout sessions" on public.workout_sessions;
create policy "Users can delete their own workout sessions"
on public.workout_sessions
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read their own exercise logs" on public.exercise_logs;
create policy "Users can read their own exercise logs"
on public.exercise_logs
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own exercise logs" on public.exercise_logs;
create policy "Users can insert their own exercise logs"
on public.exercise_logs
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own exercise logs" on public.exercise_logs;
create policy "Users can update their own exercise logs"
on public.exercise_logs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own exercise logs" on public.exercise_logs;
create policy "Users can delete their own exercise logs"
on public.exercise_logs
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read their own exercise catalog" on public.exercise_catalog;
create policy "Users can read their own exercise catalog"
on public.exercise_catalog
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own exercise catalog" on public.exercise_catalog;
create policy "Users can insert their own exercise catalog"
on public.exercise_catalog
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own exercise catalog" on public.exercise_catalog;
create policy "Users can update their own exercise catalog"
on public.exercise_catalog
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own exercise catalog" on public.exercise_catalog;
create policy "Users can delete their own exercise catalog"
on public.exercise_catalog
for delete
using (auth.uid() = user_id);
