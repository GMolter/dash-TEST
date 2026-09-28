alter table public.app_settings
  add column if not exists banner_starts_at timestamptz,
  add column if not exists banner_ends_at timestamptz;

alter table public.app_settings add constraint banner_schedule_order
  check (banner_starts_at is null or banner_ends_at is null or banner_ends_at > banner_starts_at);
