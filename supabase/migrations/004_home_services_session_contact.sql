-- Customer contact for embed intake (service role / backend only; no new RLS on sessions).

alter table public.home_services_sessions
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_email text,
  add column if not exists customer_address text,
  add column if not exists contact_collected_at timestamptz;
