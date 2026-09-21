-- App usage is independent of auth sign-in and token refresh timestamps.
-- Leave historical activity unknown: sign-in dates are not app-visit dates.
create table public.user_app_activity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_active_at timestamptz not null default now()
);

alter table public.user_app_activity enable row level security;
revoke all on public.user_app_activity from anon, authenticated;
grant select on public.user_app_activity to service_role;

-- No user ID or timestamp is accepted from the client.
create or replace function public.record_app_activity()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  insert into public.user_app_activity (user_id, last_active_at)
  values (current_user_id, now())
  on conflict (user_id) do update set last_active_at = excluded.last_active_at
  where public.user_app_activity.last_active_at < now() - interval '1 minute';
end;
$$;

revoke all on function public.record_app_activity() from public, anon;
grant execute on function public.record_app_activity() to authenticated;
