-- Database-owned cleanup runs even when nobody has the application open.
-- Reveal already rejects expires_at <= now(); this removes the stored row too.
create extension if not exists pg_cron with schema pg_catalog;

create index if not exists idx_secrets_expires on public.secrets(expires_at);

delete from public.secrets where expires_at <= now();

select cron.schedule(
  'delete-expired-secrets',
  '* * * * *',
  $$delete from public.secrets where expires_at <= now();$$
);
