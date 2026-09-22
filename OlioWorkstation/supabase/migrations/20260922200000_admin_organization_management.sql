BEGIN;

-- Administrative edits use the server's service role, never a browser role.
CREATE OR REPLACE FUNCTION public.stamp_org_content()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Record IDs cannot be changed.' USING ERRCODE = '42501';
  END IF;
  IF current_user = 'service_role' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.org_id IS DISTINCT FROM OLD.org_id
    OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    IF NOT (pg_trigger_depth() > 1 AND NEW.created_by IS NULL AND NEW.org_id = OLD.org_id AND NEW.created_at = OLD.created_at) THEN
      RAISE EXCEPTION 'The author and organization cannot be changed.' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN NEW.created_at := now(); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_announcements, public.org_resources, public.org_activity TO service_role;

CREATE OR REPLACE FUNCTION public.admin_manage_organization_member(
  p_actor_id uuid, p_org_id uuid, p_member_id uuid, p_action text,
  p_role text DEFAULT NULL, p_previous_owner_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE member_org uuid; previous_owner uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_actor_id AND app_admin = true) THEN
    RAISE EXCEPTION 'Application administrator access is required.';
  END IF;
  -- Serialize membership edits using the same organization lock as owner guards.
  PERFORM id FROM public.organizations WHERE id = p_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organization not found.'; END IF;
  SELECT org_id INTO member_org FROM public.profiles WHERE id = p_member_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found.'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id IN (p_member_id, p_previous_owner_id) AND app_owner = true)
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_actor_id AND app_owner = true) THEN
    RAISE EXCEPTION 'Only an application owner can change another application owner account.';
  END IF;
  IF member_org IS NOT NULL AND member_org <> p_org_id THEN
    RAISE EXCEPTION 'Remove this person from their current organization before adding them here.';
  END IF;
  IF p_action = 'set-member' THEN
    IF p_role IS NULL OR p_role NOT IN ('member','admin','owner') THEN RAISE EXCEPTION 'Choose a valid role.'; END IF;
    UPDATE public.profiles SET org_id = p_org_id, role = p_role WHERE id = p_member_id;
  ELSIF p_action = 'remove-member' THEN
    IF member_org IS DISTINCT FROM p_org_id THEN RAISE EXCEPTION 'This person is not a member of this organization.'; END IF;
    UPDATE public.profiles SET org_id = NULL, role = 'member' WHERE id = p_member_id;
  ELSIF p_action = 'transfer-owner' THEN
    IF member_org IS DISTINCT FROM p_org_id THEN RAISE EXCEPTION 'The new owner must be an organization member.'; END IF;
    SELECT COALESCE(p_previous_owner_id, owner_id) INTO previous_owner FROM public.organizations WHERE id = p_org_id;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = previous_owner AND app_owner = true)
      AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_actor_id AND app_owner = true) THEN
      RAISE EXCEPTION 'Only an application owner can change another application owner account.';
    END IF;
    IF previous_owner = p_member_id THEN RAISE EXCEPTION 'Choose a different new owner.'; END IF;
    PERFORM id FROM public.profiles WHERE id = previous_owner AND org_id = p_org_id AND role = 'owner' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'The previous owner is no longer an owner of this organization.'; END IF;
    UPDATE public.profiles SET role = 'owner' WHERE id = p_member_id;
    UPDATE public.organizations SET owner_id = p_member_id WHERE id = p_org_id AND owner_id = previous_owner;
    UPDATE public.profiles SET role = 'admin' WHERE id = previous_owner;
  ELSE RAISE EXCEPTION 'Unknown membership action.';
  END IF;
  RETURN jsonb_build_object('id',p_org_id,'member_id',p_member_id,'action',p_action,'role',p_role,'previous_owner_id',previous_owner);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_manage_organization_member(uuid,uuid,uuid,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_organization_member(uuid,uuid,uuid,text,text,uuid) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
