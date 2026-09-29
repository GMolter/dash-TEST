alter table public.dashboard_alerts
  add column title text not null default 'Announcement' check (length(title) <= 80),
  add column color text not null default '#fbbf24' check (color ~ '^#[0-9A-Fa-f]{6}$');

grant select (title, color) on public.dashboard_alerts to authenticated;
