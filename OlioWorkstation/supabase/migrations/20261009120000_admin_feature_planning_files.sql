-- Small text attachments inherit the ideas table's admin-only RLS and ban guard.
-- Keep metadata and content in one row so replacement/removal is atomic.
alter table public.admin_feature_ideas
  add column plan_name text,
  add column plan_content text,
  add constraint admin_feature_plan_valid check (
    (plan_name is null and plan_content is null)
    or (plan_name is not null and plan_content is not null
      and char_length(plan_name) between 4 and 255
      and plan_name ~* '^.+\.(md|txt)$'
      and plan_name !~ '[[:cntrl:]]'
      and position('/' in plan_name) = 0 and position(chr(92) in plan_name) = 0
      and octet_length(plan_content) <= 262144)
  );
grant update (plan_name, plan_content) on public.admin_feature_ideas to authenticated;
