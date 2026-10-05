create function public.can_admin_background(object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_account_is_allowed()
    and exists (select 1 from public.profiles where id = auth.uid() and app_admin)
    and exists (select 1 from public.profiles where object_name = id::text || '/background' and not coalesce(app_owner, false));
$$;
revoke all on function public.can_admin_background(text) from public;
grant execute on function public.can_admin_background(text) to authenticated;
create policy "Admins manage non-owner backgrounds" on storage.objects for all to authenticated
using (bucket_id = 'dashboard-backgrounds' and public.can_admin_background(name))
with check (bucket_id = 'dashboard-backgrounds' and public.can_admin_background(name));
