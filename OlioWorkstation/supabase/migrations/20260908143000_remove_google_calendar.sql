/* Remove the retired Google Calendar integration and its launcher scope. */

begin;

drop trigger if exists apply_launcher_calendar_scope_before_insert
  on public.launcher_devices;

drop function if exists public.fetch_launcher_calendar_credentials(uuid, bytea, bytea, bytea);
drop function if exists public.grant_launcher_calendar_scope(uuid);
drop function if exists public.revoke_launcher_calendar_scope(uuid);
drop function if exists public.apply_launcher_calendar_scope();

alter table public.launcher_devices
  drop constraint if exists launcher_devices_scopes_calendar;

alter table public.launcher_devices
  drop constraint if exists launcher_devices_scopes_milestone6;

update public.launcher_devices
set scopes = array['connection:status', 'quick-pastes:read']::text[]
where scopes @> array['calendar:read']::text[];

alter table public.launcher_devices
  add constraint launcher_devices_scopes_milestone6
  check (
    scopes = array['connection:status']::text[]
    or scopes = array['connection:status', 'quick-pastes:read']::text[]
  );

drop table if exists public.google_calendar_connections;

commit;
