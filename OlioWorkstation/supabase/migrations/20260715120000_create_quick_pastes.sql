/*
  # Milestone 4: private Quick Pastes

  Quick Pastes are reusable personal snippets. They intentionally have no
  organization, public, URL, expiry, or view-count fields and are independent
  from the shareable `pastes` table used by Pastebin.
*/

create table public.quick_pastes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  category text,
  sort_order integer not null default 0,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quick_pastes_title_length
    check (char_length(btrim(title)) between 1 and 120),
  constraint quick_pastes_content_length
    check (char_length(btrim(content)) between 1 and 20000),
  constraint quick_pastes_category_length
    check (category is null or char_length(btrim(category)) between 1 and 60),
  constraint quick_pastes_sort_order_nonnegative
    check (sort_order >= 0)
);

create index quick_pastes_owner_order_idx
  on public.quick_pastes (user_id, sort_order, created_at, id);

create index quick_pastes_owner_category_idx
  on public.quick_pastes (user_id, category)
  where category is not null;

create index quick_pastes_owner_favorites_idx
  on public.quick_pastes (user_id, sort_order)
  where is_favorite = true;

create or replace function public.set_quick_paste_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger quick_pastes_set_updated_at
before update on public.quick_pastes
for each row
execute function public.set_quick_paste_updated_at();

alter table public.quick_pastes enable row level security;

create policy "quick_pastes_select_own"
  on public.quick_pastes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "quick_pastes_insert_own"
  on public.quick_pastes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "quick_pastes_update_own"
  on public.quick_pastes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "quick_pastes_delete_own"
  on public.quick_pastes for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.quick_pastes from anon;
grant select, insert, update, delete on table public.quick_pastes to authenticated;

/*
  Reordering is atomic and must name the caller's complete collection. This
  prevents filtered lists, missing IDs, duplicate IDs, or another owner's ID
  from producing ambiguous or partial ordering.
*/
create or replace function public.reorder_quick_pastes(ordered_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  owned_count integer;
  supplied_count integer;
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required.';
  end if;

  if ordered_ids is null then
    raise exception using
      errcode = '22023',
      message = 'A complete Quick Paste order is required.';
  end if;

  supplied_count := cardinality(ordered_ids);

  if exists (select 1 from unnest(ordered_ids) as item(id) where item.id is null)
     or (select count(distinct item.id) from unnest(ordered_ids) as item(id)) <> supplied_count then
    raise exception using
      errcode = '22023',
      message = 'Quick Paste order contains invalid or duplicate IDs.';
  end if;

  select count(*)
  into owned_count
  from public.quick_pastes
  where user_id = caller_id;

  if supplied_count <> owned_count
     or exists (
       select 1
       from unnest(ordered_ids) as item(id)
       left join public.quick_pastes as quick_paste
         on quick_paste.id = item.id
        and quick_paste.user_id = caller_id
       where quick_paste.id is null
     ) then
    raise exception using
      errcode = '22023',
      message = 'Quick Paste order must contain only the complete owned collection.';
  end if;

  update public.quick_pastes as quick_paste
  set sort_order = (ordered.position - 1)::integer
  from unnest(ordered_ids) with ordinality as ordered(id, position)
  where quick_paste.id = ordered.id
    and quick_paste.user_id = caller_id;
end;
$$;

revoke all on function public.reorder_quick_pastes(uuid[]) from public;
revoke all on function public.reorder_quick_pastes(uuid[]) from anon;
grant execute on function public.reorder_quick_pastes(uuid[]) to authenticated;
