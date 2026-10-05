-- Verified app owners may manage other owners' backgrounds. Ordinary admins
-- retain access only to non-owner backgrounds through the existing policy.
create or replace function public.can_admin_background(object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_account_is_allowed()
    and exists (
      select 1 from public.profiles actor
      join public.profiles target on object_name = target.id::text || '/background'
      where actor.id = auth.uid() and actor.app_admin
        and (actor.app_owner or not coalesce(target.app_owner, false))
    );
$$;
revoke all on function public.can_admin_background(text) from public;
grant execute on function public.can_admin_background(text) to authenticated;
