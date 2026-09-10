-- Provision a profile in the same transaction as the auth account. A failure
-- rolls back signup instead of leaving an account that cannot enter Olio.
create or replace function public.create_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email, role)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(new.email, '@', 1), ''), 'Olio user'),
    new.email,
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_auth_user_profile() from public, anon, authenticated;

drop trigger if exists olio_create_auth_user_profile on auth.users;
create trigger olio_create_auth_user_profile
after insert on auth.users
for each row execute function public.create_auth_user_profile();

-- Repair earlier incomplete signups without changing existing profiles or roles.
insert into public.profiles (id, display_name, email, role)
select u.id,
  coalesce(nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(u.email, '@', 1), ''), 'Olio user'),
  u.email,
  'member'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
