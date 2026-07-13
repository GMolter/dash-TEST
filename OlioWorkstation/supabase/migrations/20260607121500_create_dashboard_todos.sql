create table if not exists public.dashboard_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  note text,
  completed boolean not null default false,
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dashboard_todos_title_not_blank check (char_length(btrim(title)) > 0)
);

alter table public.dashboard_todos enable row level security;

create policy "dashboard_todos_select_own"
  on public.dashboard_todos for select
  to authenticated
  using (auth.uid() = user_id);

create policy "dashboard_todos_insert_own"
  on public.dashboard_todos for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "dashboard_todos_update_own"
  on public.dashboard_todos for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "dashboard_todos_delete_own"
  on public.dashboard_todos for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_dashboard_todos_user_id on public.dashboard_todos(user_id);
create index if not exists idx_dashboard_todos_open_order on public.dashboard_todos(user_id, completed, sort_order);
