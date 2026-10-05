-- Legacy records have no reliable creator: keep them inaccessible until assigned.
alter table public.short_urls add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.short_urls add column visibility text not null default 'personal' check (visibility in ('personal','shared','public'));
alter table public.secrets add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
do $$ declare p record; begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('short_urls','secrets') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;
create policy short_read on public.short_urls for select to authenticated using (
  public.current_account_is_allowed() and (user_id = auth.uid() or visibility = 'public' or (visibility = 'shared' and org_id = public.current_user_org_id())));
create policy short_public on public.short_urls for select to anon using (visibility = 'public');
create policy short_create on public.short_urls for insert to authenticated with check (
  public.current_account_is_allowed() and user_id = auth.uid() and (visibility <> 'shared' or org_id = public.current_user_org_id()));
create policy short_edit on public.short_urls for update to authenticated using (public.current_account_is_allowed() and user_id = auth.uid()) with check (user_id = auth.uid() and (visibility <> 'shared' or org_id = public.current_user_org_id()));
create policy short_delete on public.short_urls for delete to authenticated using (public.current_account_is_allowed() and user_id = auth.uid());
create policy secret_read on public.secrets for select to authenticated using (public.current_account_is_allowed() and user_id = auth.uid());
create policy secret_create on public.secrets for insert to authenticated with check (public.current_account_is_allowed() and user_id = auth.uid() and org_id is null and not viewed);
create policy secret_delete on public.secrets for delete to authenticated using (public.current_account_is_allowed() and user_id = auth.uid());
-- A link is a bearer capability, never a public listing. Consume atomically.
create function public.reveal_secret(p_code text) returns text language plpgsql security definer set search_path = public as $$
declare result text; s public.secrets;
begin
  select * into s from public.secrets where secret_code = p_code and user_id is not null and not viewed and expires_at > now() for update;
  if not found then return null; end if;
  result := s.content;
  if s.user_id is distinct from auth.uid() then
    update public.secrets set viewed = true, content = '' where id = s.id;
  end if;
  return result;
end $$;
revoke all on function public.reveal_secret(text) from public;
grant execute on function public.reveal_secret(text) to anon, authenticated;
create function public.resolve_short_url(p_code text) returns text language plpgsql security definer set search_path = public as $$
declare result text;
begin
  update public.short_urls set clicks = clicks + 1 where short_code = p_code and
    (visibility = 'public' or (public.current_account_is_allowed() and (user_id = auth.uid() or (visibility = 'shared' and org_id = public.current_user_org_id())))) returning target_url into result;
  return result;
end $$;
revoke all on function public.resolve_short_url(text) from public;
grant execute on function public.resolve_short_url(text) to anon, authenticated;
