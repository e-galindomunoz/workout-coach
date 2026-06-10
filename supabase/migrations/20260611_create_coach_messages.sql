create table if not exists public.coach_messages (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  role        text        not null check (role in ('user', 'assistant', 'system')),
  content     text        not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- Index for efficient per-user chronological fetch
create index if not exists coach_messages_user_created_idx
  on public.coach_messages (user_id, created_at desc);

-- Row-level security
alter table public.coach_messages enable row level security;

create policy "Users can view own coach messages"
  on public.coach_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own coach messages"
  on public.coach_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own coach messages"
  on public.coach_messages for delete
  using (auth.uid() = user_id);
