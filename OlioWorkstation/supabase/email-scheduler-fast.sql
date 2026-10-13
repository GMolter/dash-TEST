-- Run in Supabase SQL Editor after installing the existing email scheduler.
-- Preserves its active/disabled state and uses the existing Vault secrets.
do $$
declare existing bigint;
begin
  select jobid into existing from cron.job where jobname='olio-email-dispatch';
  if existing is null then raise exception 'Install email-scheduler.sql first.'; end if;
  perform cron.alter_job(existing, schedule := '10 seconds', command := $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name='email_dispatch_url'),
      headers := jsonb_build_object('Content-Type','application/json','Authorization',
        'Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='email_dispatch_secret')),
      body := '{}'::jsonb, timeout_milliseconds := 60000
    )
    where (
      exists(select 1 from public.email_health where id and not paused and (worker_until is null or worker_until<now()))
      and (
        exists(select 1 from public.email_events where expanded_at is null)
        or exists(select 1 from public.email_jobs where status in ('queued','scheduled','retry') and available_at<=now())
      )
    ) or (extract(minute from now())::integer % 5=0 and extract(second from now())<10);
  $job$);
end $$;
