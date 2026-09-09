begin;

-- Auth remains authoritative. Only the affected user may read their ban notice.
create table if not exists public.account_ban_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  banned_until timestamptz,
  reason text,
  updated_at timestamptz not null default now()
);
alter table public.account_ban_state enable row level security;
revoke all on public.account_ban_state from public, anon, authenticated;
grant select on public.account_ban_state to authenticated;
grant all on public.account_ban_state to service_role;
create policy "Read own ban notice" on public.account_ban_state
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.sync_account_ban_state()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.account_ban_state(user_id, banned_until, reason, updated_at)
  values (new.id, new.banned_until,
    case when new.banned_until > now() then coalesce(nullif(new.raw_app_meta_data->>'ban_reason', ''), 'Account access has been suspended.') else null end,
    now())
  on conflict (user_id) do update set banned_until = excluded.banned_until,
    reason = excluded.reason, updated_at = excluded.updated_at;
  if new.banned_until > now() then
    -- Revoke refreshable sessions and independently authenticated launcher devices.
    delete from auth.sessions where user_id = new.id;
    update public.launcher_devices set revoked_at = now()
      where owner_id = new.id and revoked_at is null;
    update public.launcher_pairing_requests set status = 'cancelled', updated_at = now()
      where owner_id = new.id and status in ('waiting', 'approved');
  end if;
  return new;
end;
$$;
revoke all on function public.sync_account_ban_state() from public, anon, authenticated;
create trigger sync_account_ban_state
after insert or update of banned_until, raw_app_meta_data on auth.users
for each row execute function public.sync_account_ban_state();

insert into public.account_ban_state(user_id, banned_until, reason)
select id, banned_until,
  case when banned_until > now() then coalesce(nullif(raw_app_meta_data->>'ban_reason', ''), 'Account access has been suspended.') else null end
from auth.users on conflict (user_id) do nothing;

delete from auth.sessions where user_id in (select id from auth.users where banned_until > now());
update public.launcher_devices set revoked_at = now()
  where revoked_at is null and owner_id in (select id from auth.users where banned_until > now());
update public.launcher_pairing_requests set status = 'cancelled', updated_at = now()
  where status in ('waiting', 'approved') and owner_id in (select id from auth.users where banned_until > now());

-- Check live state, not the still-valid JWT. This function reads Auth directly
-- as its owner, avoiding recursive RLS and preventing forged client state.
create or replace function public.current_account_is_allowed()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users where id = auth.uid()
    and (banned_until is null or banned_until <= now()));
$$;
revoke all on function public.current_account_is_allowed() from public, anon;
grant execute on function public.current_account_is_allowed() to authenticated;

-- Add a restrictive guard without replacing any existing ownership policies.
-- Keep the notice readable so banned users receive their own realtime event.
do $$
declare target record;
begin
  for target in select n.nspname, c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p') and c.relrowsecurity
      and ((n.nspname = 'public' and c.relname <> 'account_ban_state')
        or (n.nspname = 'storage' and c.relname = 'objects'))
  loop
    execute format('create policy account_ban_guard on %I.%I as restrictive for all to authenticated using ((select public.current_account_is_allowed())) with check ((select public.current_account_is_allowed()))', target.nspname, target.relname);
  end loop;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'account_ban_state') then
    alter publication supabase_realtime add table public.account_ban_state;
  end if;
end;
$$;
commit;
