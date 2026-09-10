-- Read-only diagnostic for the failed deletion of gavintest@olio.one.
-- No accounts, profiles, organizations, constraints, or triggers are changed.
select u.id as auth_user_id, u.email,
       p.id as profile_id, p.org_id, p.role,
       o.id as owned_organization_id, o.name as owned_organization_name
from auth.users u
left join public.profiles p on p.id = u.id
left join public.organizations o on o.owner_id = u.id
where lower(u.email) = 'gavintest@olio.one';

-- Foreign keys with NO ACTION / RESTRICT can block auth/profile deletion.
-- The database log names the exact constraint when this is the cause.
select c.conname as constraint_name,
       c.conrelid::regclass::text as referencing_table,
       c.confrelid::regclass::text as referenced_table,
       pg_get_constraintdef(c.oid) as definition,
       case c.confdeltype when 'a' then 'NO ACTION' when 'r' then 'RESTRICT'
         when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' end as on_delete
from pg_constraint c
where c.contype = 'f'
  and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
order by c.confdeltype in ('a','r') desc, referencing_table, constraint_name;

-- A delete/update trigger can also reject the cascading deletion.
select t.tgrelid::regclass::text as table_name, t.tgname as trigger_name,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t
where not t.tgisinternal
  and t.tgrelid in ('auth.users'::regclass, 'public.profiles'::regclass, 'public.organizations'::regclass)
order by table_name, trigger_name;
