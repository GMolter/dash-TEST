-- Private account backgrounds, limited to raster images of at most 5 MiB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dashboard-backgrounds', 'dashboard-backgrounds', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "Own dashboard backgrounds" on storage.objects for all to authenticated
using (bucket_id = 'dashboard-backgrounds' and name = auth.uid()::text || '/background' and public.current_account_is_allowed())
with check (bucket_id = 'dashboard-backgrounds' and name = auth.uid()::text || '/background' and public.current_account_is_allowed());

-- Writes are server-only and use the existing audited application-admin API.
create table public.dashboard_alerts (
  id uuid primary key default gen_random_uuid(),
  message text not null check (length(trim(message)) between 1 and 5000),
  enabled boolean not null default true,
  user_ids uuid[] not null default '{}',
  org_ids uuid[] not null default '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (cardinality(user_ids) + cardinality(org_ids) > 0),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
alter table public.dashboard_alerts enable row level security;
revoke all on public.dashboard_alerts from public, anon, authenticated;
-- Recipients can read the content, but cannot enumerate the other recipients.
grant select (id, message, created_at) on public.dashboard_alerts to authenticated;
grant all on public.dashboard_alerts to service_role;
create policy "Recipients read active dashboard alerts" on public.dashboard_alerts for select to authenticated
using (
  public.current_account_is_allowed() and enabled
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
  and (auth.uid() = any(user_ids) or exists (
    select 1 from public.profiles where id = auth.uid() and org_id = any(dashboard_alerts.org_ids)
  ))
);
