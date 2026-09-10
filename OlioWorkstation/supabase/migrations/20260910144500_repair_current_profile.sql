-- Apply before deploying the login-loop fix. Existing profiles are preserved.
begin;

-- Repair legacy incomplete signups without resetting an existing membership.
create or replace function public.ensure_current_profile()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  member public.profiles%rowtype;
begin
  if caller is null or not public.current_account_is_allowed() then
    raise exception 'Please sign in with an active account.' using errcode = '42501';
  end if;
  select * into member from public.profiles where id = caller;
  if not found then
    insert into public.profiles(id, display_name, email, role)
    select u.id, coalesce(nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(u.email, '@', 1), ''), 'Olio user'), u.email, 'member'
    from auth.users u where u.id = caller
    on conflict (id) do nothing;
    select * into member from public.profiles where id = caller;
  end if;
  if member.id is null then
    raise exception 'Your account profile could not be loaded. Please try again.';
  end if;
  return to_jsonb(member);
end;
$$;
revoke all on function public.ensure_current_profile() from public, anon, authenticated;
grant execute on function public.ensure_current_profile() to authenticated;

commit;
