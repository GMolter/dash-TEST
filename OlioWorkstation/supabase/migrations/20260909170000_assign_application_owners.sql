-- Explicit owner accounts authorized by the application owner.
-- Fail rather than partially assigning ownership if either account is missing.
begin;

do $$
begin
  perform pg_advisory_xact_lock(hashtextextended('public.profiles.app_owner.maximum_two', 0));
  if (select count(*) from public.profiles
      where lower(email) in ('gavin@olio.one', 'gmolter8@gmail.com')) <> 2 then
    raise exception 'Both designated owner profiles must exist before assigning ownership';
  end if;
  if exists (select 1 from public.profiles where app_owner = true
             and lower(email) not in ('gavin@olio.one', 'gmolter8@gmail.com')) then
    raise exception 'Unexpected existing application owner; review ownership before continuing';
  end if;
  update public.profiles set app_owner = true, app_admin = true
  where lower(email) in ('gavin@olio.one', 'gmolter8@gmail.com');
end;
$$;

commit;
