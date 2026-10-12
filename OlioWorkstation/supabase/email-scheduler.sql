-- Run after the migration, with pg_cron and pg_net enabled in Supabase.
-- Add email_dispatch_url and email_dispatch_secret in Vault using the dashboard.
-- URL: https://olio.one/api/email?action=dispatch
-- Secret: matches EMAIL_DISPATCH_SECRET in Vercel; never store SMTP credentials here.
do $$
declare existing bigint;
begin
 select jobid into existing from cron.job where jobname='olio-email-dispatch';
 if existing is not null then perform cron.unschedule(existing); end if;
end $$;
select cron.schedule('olio-email-dispatch','* * * * *', $job$
 select net.http_post(
   url := (select decrypted_secret from vault.decrypted_secrets where name='email_dispatch_url'),
   headers := jsonb_build_object('Content-Type','application/json','Authorization',
     'Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='email_dispatch_secret')),
   body := '{}'::jsonb, timeout_milliseconds := 60000
 );
$job$);
-- Intentionally disabled until deployment configuration and approved test recipients are verified.
select cron.alter_job((select jobid from cron.job where jobname='olio-email-dispatch'),active:=false);
-- Activate after verification:
-- select cron.alter_job((select jobid from cron.job where jobname='olio-email-dispatch'),active:=true);
