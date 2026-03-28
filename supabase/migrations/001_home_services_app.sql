-- Run in Supabase SQL Editor (or via CLI) after creating the project.
-- Keeps experiment data private: each row is scoped to auth.uid().

create table if not exists public.home_services_app_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists home_services_app_notes_user_id_idx
  on public.home_services_app_notes (user_id);

alter table public.home_services_app_notes enable row level security;

create policy "home_services_app_notes_select_own"
  on public.home_services_app_notes
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "home_services_app_notes_insert_own"
  on public.home_services_app_notes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "home_services_app_notes_update_own"
  on public.home_services_app_notes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "home_services_app_notes_delete_own"
  on public.home_services_app_notes
  for delete
  to authenticated
  using (auth.uid() = user_id);
