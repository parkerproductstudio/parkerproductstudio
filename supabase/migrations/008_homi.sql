-- Homi POC: provider-data cache + per-user search history.
-- Cache is indefinite for the POC (rows are written once and re-used forever).

create table if not exists public.homi_provider_lookups (
  id              uuid primary key default gen_random_uuid(),
  provider        text not null,
  address_key     text not null,
  street          text not null,
  city            text not null,
  state           text not null,
  zip             text not null,
  status          text not null,
  normalized      jsonb,
  raw             jsonb,
  error_message   text,
  fetched_at      timestamptz not null default now(),
  unique (provider, address_key)
);

create table if not exists public.homi_searches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  street          text not null,
  city            text not null,
  state           text not null,
  zip             text not null,
  address_key     text not null,
  providers_used  text[] not null,
  created_at      timestamptz not null default now()
);

create index if not exists homi_searches_user_created_idx
  on public.homi_searches (user_id, created_at desc);

alter table public.homi_provider_lookups enable row level security;
alter table public.homi_searches         enable row level security;

create policy "homi_lookups_read"
  on public.homi_provider_lookups
  for select
  to authenticated
  using (true);

create policy "homi_searches_select_own"
  on public.homi_searches
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "homi_searches_insert_own"
  on public.homi_searches
  for insert
  to authenticated
  with check (auth.uid() = user_id);
