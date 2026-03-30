-- Multi-tenant embed: companies, intake sessions, messages. Accessed only via backend (service role).
-- Parker Electric is seeded as the first company; rotate embed_public_key in production if this file is public.

create table if not exists public.home_services_companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  embed_public_key uuid not null unique default gen_random_uuid(),
  allowed_origins text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.home_services_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.home_services_companies (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists home_services_sessions_company_id_idx
  on public.home_services_sessions (company_id);

create table if not exists public.home_services_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.home_services_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  image_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists home_services_messages_session_id_idx
  on public.home_services_messages (session_id);

create or replace function public.home_services_touch_session_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists home_services_sessions_touch on public.home_services_sessions;
create trigger home_services_sessions_touch
  before update on public.home_services_sessions
  for each row
  execute procedure public.home_services_touch_session_updated_at();

alter table public.home_services_companies enable row level security;
alter table public.home_services_sessions enable row level security;
alter table public.home_services_messages enable row level security;

-- Intentionally no policies: only Supabase service role (Express backend) reads/writes.

insert into storage.buckets (id, name, public)
values ('home-services-embed', 'home-services-embed', false)
on conflict (id) do nothing;

-- Service role bypasses RLS; no anon policies on objects (uploads go through API only).

insert into public.home_services_companies (slug, name, embed_public_key, allowed_origins)
values (
  'parker-electric',
  'Parker Electric',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  array['http://localhost:5173', 'http://127.0.0.1:5173']::text[]
)
on conflict (slug) do nothing;
