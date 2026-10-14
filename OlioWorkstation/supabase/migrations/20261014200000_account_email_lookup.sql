-- The sign-in flow intentionally distinguishes an unknown email from a wrong
-- password. Expose only existence, never account IDs, metadata, or credentials.
create or replace function public.account_email_exists(address text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(btrim(address))
      and deleted_at is null
  );
$$;

revoke all on function public.account_email_exists(text) from public;
grant execute on function public.account_email_exists(text) to anon, authenticated;
