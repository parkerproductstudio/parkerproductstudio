-- AI-extracted job summary and supplies list for embed intake sessions.

alter table public.home_services_sessions
  add column if not exists job_summary text,
  add column if not exists supplies jsonb not null default '[]'::jsonb;
