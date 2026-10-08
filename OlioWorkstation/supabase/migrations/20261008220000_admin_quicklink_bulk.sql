-- Called only by the authenticated admin API, after signed review and audit insertion.
-- All writes and snapshot checks run in one transaction; no partial copies/moves.
CREATE OR REPLACE FUNCTION public.admin_bulk_quicklinks(p_plan jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item jsonb;
  current_row jsonb;
  expected jsonb := p_plan->'expected';
  affected integer := 0;
  order_offset bigint := 0;
  target_user uuid;
BEGIN
  IF p_plan->>'mode' NOT IN ('copy','move','edit','import')
     OR jsonb_array_length(p_plan->'folders') + jsonb_array_length(p_plan->'links') NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'INVALID_BULK_PLAN';
  END IF;
  -- Protect snapshots, folder membership, and ownership until the commit.
  LOCK TABLE public.profiles, public.quicklink_folders, public.quicklinks IN SHARE ROW EXCLUSIVE MODE;
  FOR item IN SELECT value FROM jsonb_array_elements(expected->'profiles') LOOP
    SELECT jsonb_build_object('id',id,'org_id',org_id,'app_owner',app_owner) INTO current_row FROM profiles WHERE id = (item->>'id')::uuid;
    IF current_row IS DISTINCT FROM item THEN RAISE EXCEPTION 'Account changed. Review the operation again.'; END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements((expected->'folders') || (expected->'destination')) LOOP
    SELECT to_jsonb(f) INTO current_row FROM quicklink_folders f WHERE id = (item->>'id')::uuid;
    IF current_row IS DISTINCT FROM item THEN RAISE EXCEPTION 'Folder changed. Review the operation again.'; END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(expected->'links') LOOP
    SELECT to_jsonb(l) INTO current_row FROM quicklinks l WHERE id = (item->>'id')::uuid;
    IF current_row IS DISTINCT FROM item THEN RAISE EXCEPTION 'Link changed. Review the operation again.'; END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM quicklinks l WHERE l.folder_id IN (SELECT (value->>'id')::uuid FROM jsonb_array_elements(expected->'folders'))
    AND l.id NOT IN (SELECT (value->>'id')::uuid FROM jsonb_array_elements(expected->'links'))
  ) THEN RAISE EXCEPTION 'Folder contents changed. Review the operation again.'; END IF;

  IF p_plan->>'mode' <> 'edit' THEN
    target_user := coalesce(p_plan->'folders'->0->>'user_id', p_plan->'links'->0->>'user_id')::uuid;
    SELECT coalesce(max(n)::bigint, -1) + 1 INTO order_offset FROM (
      SELECT order_index AS n FROM quicklink_folders WHERE user_id = target_user
      UNION ALL SELECT order_index AS n FROM quicklinks WHERE user_id = target_user
    ) positions;
    order_offset := order_offset - (SELECT min((value->>'order_index')::bigint) FROM jsonb_array_elements((p_plan->'folders') || (p_plan->'links')));
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_plan->'folders') LOOP
    IF p_plan->>'mode' <> 'edit' THEN item := jsonb_set(item, '{order_index}', to_jsonb(order_offset + (item->>'order_index')::integer)); END IF;
    IF p_plan->>'mode' IN ('move','edit') THEN
      UPDATE quicklink_folders SET name = item->>'name', icon = item->>'icon',
        order_index = (item->>'order_index')::integer, scope = item->>'scope',
        user_id = (item->>'user_id')::uuid, org_id = (item->>'org_id')::uuid
        WHERE id = (item->>'id')::uuid;
    ELSE
      INSERT INTO quicklink_folders(id,name,icon,order_index,scope,user_id,org_id)
        VALUES ((item->>'id')::uuid,item->>'name',item->>'icon',(item->>'order_index')::integer,item->>'scope',(item->>'user_id')::uuid,(item->>'org_id')::uuid);
    END IF;
    affected := affected + 1;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(p_plan->'links') LOOP
    IF p_plan->>'mode' <> 'edit' THEN item := jsonb_set(item, '{order_index}', to_jsonb(order_offset + (item->>'order_index')::integer)); END IF;
    IF p_plan->>'mode' IN ('move','edit') THEN
      UPDATE quicklinks SET title = item->>'title', url = item->>'url', icon = item->>'icon',
        order_index = (item->>'order_index')::integer, scope = item->>'scope',
        user_id = (item->>'user_id')::uuid, org_id = (item->>'org_id')::uuid, folder_id = (item->>'folder_id')::uuid
        WHERE id = (item->>'id')::uuid;
    ELSE
      INSERT INTO quicklinks(id,title,url,icon,order_index,scope,user_id,org_id,folder_id)
        VALUES ((item->>'id')::uuid,item->>'title',item->>'url',item->>'icon',(item->>'order_index')::integer,item->>'scope',(item->>'user_id')::uuid,(item->>'org_id')::uuid,(item->>'folder_id')::uuid);
    END IF;
    affected := affected + 1;
  END LOOP;
  RETURN jsonb_build_object('count',affected,'mode',p_plan->>'mode', 'ids',
    (SELECT jsonb_agg(value->>'id') FROM jsonb_array_elements((p_plan->'folders') || (p_plan->'links'))));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_bulk_quicklinks(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_quicklinks(jsonb) TO service_role;
