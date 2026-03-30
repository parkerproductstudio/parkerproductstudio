-- Profiles linked to auth.users. Project/API admin access uses user_profiles.admin.
-- Run in Supabase SQL Editor after 001_home_services_app.sql (or fresh project).

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_admin_idx
  on public.user_profiles (admin)
  where admin = true;

alter table public.user_profiles enable row level security;

create policy "user_profiles_select_own"
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- No insert/update/delete for authenticated: rows are created by trigger; only
-- service role (dashboard or backend) should set admin = true.

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, admin)
  values (new.id, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user_profile();

-- Existing users (before this migration): create profiles with admin = false.
insert into public.user_profiles (id, admin)
select id, false
from auth.users
on conflict (id) do nothing;

-- Default studio admin (adjust or remove if you clone this repo).
update public.user_profiles p
set admin = true, updated_at = now()
from auth.users u
where p.id = u.id and lower(u.email) = lower('eric.jason.parker@gmail.com');
