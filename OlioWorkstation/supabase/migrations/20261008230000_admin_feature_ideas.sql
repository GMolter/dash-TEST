create table public.admin_feature_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  notes text not null default '' check (char_length(notes) <= 2000),
  status text not null default 'idea' check (status in ('idea', 'in_progress', 'completed')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index admin_feature_ideas_created on public.admin_feature_ideas(created_at desc, id desc);
alter table public.admin_feature_ideas enable row level security;
revoke all on public.admin_feature_ideas from anon, authenticated;
grant select on public.admin_feature_ideas to authenticated;
grant insert (title, notes, status), update (title, notes, status) on public.admin_feature_ideas to authenticated;
grant all on public.admin_feature_ideas to service_role;
create policy admin_feature_ideas_read on public.admin_feature_ideas for select to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and app_admin = true));
create policy admin_feature_ideas_add on public.admin_feature_ideas for insert to authenticated
  with check (created_by = (select auth.uid()) and exists (select 1 from public.profiles where id = (select auth.uid()) and app_admin = true));
create policy admin_feature_ideas_edit on public.admin_feature_ideas for update to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and app_admin = true))
  with check (exists (select 1 from public.profiles where id = (select auth.uid()) and app_admin = true));
create policy account_ban_guard on public.admin_feature_ideas as restrictive for all to authenticated
  using ((select public.current_account_is_allowed())) with check ((select public.current_account_is_allowed()));
