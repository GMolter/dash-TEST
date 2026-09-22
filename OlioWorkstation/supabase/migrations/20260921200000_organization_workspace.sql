-- Safe to rerun: retain existing tables and rows, and replace only this migration's policies and triggers.
BEGIN;

-- Profile roles are authoritative; owner_id remains a compatible reference to one owner.
CREATE OR REPLACE FUNCTION public.org_has_role(p_org_id uuid, p_roles text[] DEFAULT ARRAY['member','admin','owner'])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_account_is_allowed() AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND org_id = p_org_id AND role = ANY(p_roles)
  );
$$;
REVOKE ALL ON FUNCTION public.org_has_role(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_has_role(uuid, text[]) TO authenticated;

DROP POLICY IF EXISTS organization_delete_requires_owner ON public.organizations;
CREATE POLICY organization_delete_requires_owner ON public.organizations AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.org_has_role(id, ARRAY['owner']));
DROP POLICY IF EXISTS organization_owner_can_delete ON public.organizations;
CREATE POLICY organization_owner_can_delete ON public.organizations FOR DELETE TO authenticated
  USING (public.org_has_role(id, ARRAY['owner']));
DROP POLICY IF EXISTS organization_workspace_read ON public.organizations;
CREATE POLICY organization_workspace_read ON public.organizations FOR SELECT TO authenticated
  USING (public.org_has_role(id));
DROP POLICY IF EXISTS organization_workspace_update_guard ON public.organizations;
CREATE POLICY organization_workspace_update_guard ON public.organizations AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.org_has_role(id, ARRAY['owner','admin'])) WITH CHECK (public.org_has_role(id, ARRAY['owner','admin']));
DROP POLICY IF EXISTS organization_workspace_update ON public.organizations;
CREATE POLICY organization_workspace_update ON public.organizations FOR UPDATE TO authenticated
  USING (public.org_has_role(id, ARRAY['owner','admin'])) WITH CHECK (public.org_has_role(id, ARRAY['owner','admin']));

CREATE OR REPLACE FUNCTION public.guard_org_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE replacement uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.org_id IS NOT DISTINCT FROM OLD.org_id AND NEW.role IS NOT DISTINCT FROM OLD.role THEN RETURN NEW; END IF;
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP <> 'INSERT' OR NEW.org_id IS NOT NULL OR NEW.role <> 'member' THEN
      RAISE EXCEPTION 'Use organization member actions to change membership.' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF TG_OP <> 'INSERT' AND OLD.role = 'owner' AND OLD.org_id IS NOT NULL THEN
    IF TG_OP = 'DELETE' OR NEW.role <> 'owner' OR NEW.org_id IS DISTINCT FROM OLD.org_id THEN
      PERFORM 1 FROM public.organizations WHERE id = OLD.org_id FOR UPDATE;
      IF FOUND THEN
        SELECT id INTO replacement FROM public.profiles
          WHERE org_id = OLD.org_id AND role = 'owner' AND id <> OLD.id ORDER BY id LIMIT 1;
        IF replacement IS NULL THEN
          RAISE EXCEPTION 'Add or transfer ownership before removing the last owner.' USING ERRCODE = '23514';
        END IF;
        UPDATE public.organizations SET owner_id = replacement WHERE id = OLD.org_id AND owner_id = OLD.id;
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_org_membership ON public.profiles;
CREATE TRIGGER guard_org_membership BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_org_membership();

CREATE OR REPLACE FUNCTION public.guard_org_owner_reference()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id AND current_user IN ('authenticated','anon') THEN
    RAISE EXCEPTION 'Use organization ownership actions.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_org_owner_reference ON public.organizations;
CREATE TRIGGER guard_org_owner_reference BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.guard_org_owner_reference();

CREATE OR REPLACE FUNCTION public.manage_organization_member(p_org_id uuid, p_member_id uuid, p_action text, p_role text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles; target public.profiles;
BEGIN
  -- Serialize all ownership changes, including two owners stepping down together.
  PERFORM 1 FROM public.organizations WHERE id = p_org_id FOR UPDATE;
  IF NOT FOUND OR NOT public.org_has_role(p_org_id) THEN RAISE EXCEPTION 'Organization access denied.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid();
  SELECT * INTO target FROM public.profiles WHERE id = p_member_id AND org_id = p_org_id FOR UPDATE;
  IF target.id IS NULL THEN RAISE EXCEPTION 'Member no longer belongs to this organization.'; END IF;
  IF p_action = 'leave' THEN
    IF target.id <> actor.id THEN RAISE EXCEPTION 'You can only leave for yourself.' USING ERRCODE = '42501'; END IF;
    UPDATE public.profiles SET org_id = NULL, role = 'member' WHERE id = actor.id;
  ELSIF p_action = 'transfer' THEN
    IF actor.role <> 'owner' OR target.id = actor.id THEN RAISE EXCEPTION 'Only an owner can transfer ownership to another member.' USING ERRCODE = '42501'; END IF;
    UPDATE public.profiles SET role = 'owner' WHERE id = target.id;
    UPDATE public.profiles SET role = 'admin' WHERE id = actor.id;
  ELSIF p_action = 'role' THEN
    IF p_role IS NULL OR p_role NOT IN ('owner','admin','member') THEN RAISE EXCEPTION 'Invalid role.'; END IF;
    IF actor.role <> 'owner' AND NOT (actor.role = 'admin' AND target.role = 'member' AND p_role = 'admin' AND target.id <> actor.id) THEN
      RAISE EXCEPTION 'Only owners can manage owners and admins.' USING ERRCODE = '42501';
    END IF;
    UPDATE public.profiles SET role = p_role WHERE id = target.id;
  ELSIF p_action = 'remove' THEN
    IF target.id = actor.id THEN RAISE EXCEPTION 'Use Leave Organization to leave.'; END IF;
    IF actor.role <> 'owner' AND NOT (actor.role = 'admin' AND target.role = 'member') THEN
      RAISE EXCEPTION 'You cannot remove this member.' USING ERRCODE = '42501';
    END IF;
    UPDATE public.profiles SET org_id = NULL, role = 'member' WHERE id = target.id;
  ELSE RAISE EXCEPTION 'Invalid member action.';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.manage_organization_member(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_organization_member(uuid, uuid, text, text) TO authenticated;

-- Keep the application-admin handoff compatible with multiple owners.
CREATE OR REPLACE FUNCTION public.admin_transfer_organization_owner(p_organization_id uuid, p_new_owner_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE previous_owner uuid;
BEGIN
  SELECT owner_id INTO previous_owner FROM public.organizations WHERE id = p_organization_id FOR UPDATE;
  IF previous_owner IS NULL THEN RAISE EXCEPTION 'Organization not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_new_owner_id AND org_id = p_organization_id) THEN
    RAISE EXCEPTION 'New owner must be an organization member';
  END IF;
  UPDATE public.profiles SET role = 'owner' WHERE id = p_new_owner_id;
  UPDATE public.organizations SET owner_id = p_new_owner_id WHERE id = p_organization_id;
  UPDATE public.profiles SET role = 'admin' WHERE id = previous_owner AND id <> p_new_owner_id AND org_id = p_organization_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_transfer_organization_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_transfer_organization_owner(uuid, uuid) TO service_role;

CREATE TABLE IF NOT EXISTS public.org_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 10000),
  pinned boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.org_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  category text NOT NULL DEFAULT 'General' CHECK (category IN ('General','Guides','Templates','Reference','Tools')),
  kind text NOT NULL CHECK (kind IN ('link','note')),
  url text,
  content text NOT NULL DEFAULT '' CHECK (char_length(content) <= 20000),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'link' AND url IS NOT NULL AND url ~* '^https?://[^[:space:]]+$' AND char_length(url) <= 2048)
      OR (kind = 'note' AND url IS NULL AND char_length(btrim(content)) > 0))
);
CREATE TABLE IF NOT EXISTS public.org_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('announcements','resources','people','settings','links','projects')),
  action text NOT NULL,
  subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS org_announcements_list ON public.org_announcements(org_id, pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS org_resources_list ON public.org_resources(org_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS org_activity_list ON public.org_activity(org_id, created_at DESC, id DESC);
ALTER TABLE public.org_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_activity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.org_announcements, public.org_resources, public.org_activity FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_announcements, public.org_resources TO authenticated;
GRANT SELECT ON public.org_activity TO authenticated;
DROP POLICY IF EXISTS announcements_read ON public.org_announcements;
CREATE POLICY announcements_read ON public.org_announcements FOR SELECT TO authenticated USING (public.org_has_role(org_id));
DROP POLICY IF EXISTS announcements_insert ON public.org_announcements;
CREATE POLICY announcements_insert ON public.org_announcements FOR INSERT TO authenticated
  WITH CHECK (public.org_has_role(org_id, ARRAY['owner','admin']) AND created_by = auth.uid());
DROP POLICY IF EXISTS announcements_update ON public.org_announcements;
CREATE POLICY announcements_update ON public.org_announcements FOR UPDATE TO authenticated
  USING (public.org_has_role(org_id, ARRAY['owner','admin'])) WITH CHECK (public.org_has_role(org_id, ARRAY['owner','admin']));
DROP POLICY IF EXISTS announcements_delete ON public.org_announcements;
CREATE POLICY announcements_delete ON public.org_announcements FOR DELETE TO authenticated USING (public.org_has_role(org_id, ARRAY['owner','admin']));
DROP POLICY IF EXISTS resources_read ON public.org_resources;
CREATE POLICY resources_read ON public.org_resources FOR SELECT TO authenticated USING (public.org_has_role(org_id));
DROP POLICY IF EXISTS resources_insert ON public.org_resources;
CREATE POLICY resources_insert ON public.org_resources FOR INSERT TO authenticated WITH CHECK (public.org_has_role(org_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS resources_update ON public.org_resources;
CREATE POLICY resources_update ON public.org_resources FOR UPDATE TO authenticated
  USING (public.org_has_role(org_id) AND (created_by = auth.uid() OR public.org_has_role(org_id, ARRAY['owner','admin'])))
  WITH CHECK (public.org_has_role(org_id) AND (created_by = auth.uid() OR public.org_has_role(org_id, ARRAY['owner','admin'])));
DROP POLICY IF EXISTS resources_delete ON public.org_resources;
CREATE POLICY resources_delete ON public.org_resources FOR DELETE TO authenticated
  USING (public.org_has_role(org_id) AND (created_by = auth.uid() OR public.org_has_role(org_id, ARRAY['owner','admin'])));
DROP POLICY IF EXISTS activity_read ON public.org_activity;
CREATE POLICY activity_read ON public.org_activity FOR SELECT TO authenticated USING (public.org_has_role(org_id));

CREATE OR REPLACE FUNCTION public.stamp_org_content()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.org_id IS DISTINCT FROM OLD.org_id OR NEW.id IS DISTINCT FROM OLD.id
    OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    -- Allow the author FK to be cleared when their account is deleted.
    IF NOT (pg_trigger_depth() > 1 AND NEW.created_by IS NULL AND NEW.org_id = OLD.org_id AND NEW.id = OLD.id AND NEW.created_at = OLD.created_at) THEN
      RAISE EXCEPTION 'The author and organization cannot be changed.' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN NEW.created_at := now(); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS stamp_org_announcements ON public.org_announcements;
CREATE TRIGGER stamp_org_announcements BEFORE INSERT OR UPDATE ON public.org_announcements FOR EACH ROW EXECUTE FUNCTION public.stamp_org_content();
DROP TRIGGER IF EXISTS stamp_org_resources ON public.org_resources;
CREATE TRIGGER stamp_org_resources BEFORE INSERT OR UPDATE ON public.org_resources FOR EACH ROW EXECUTE FUNCTION public.stamp_org_content();

-- Write only concise, shared facts; never copy invite codes, private content, URLs or email addresses.
CREATE OR REPLACE FUNCTION public.record_org_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE before_row jsonb := '{}'::jsonb; after_row jsonb := '{}'::jsonb; row_data jsonb;
  org uuid; event_category text; event_action text; event_subject text; actor_label text;
BEGIN
  IF TG_OP <> 'INSERT' THEN before_row := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN after_row := to_jsonb(NEW); END IF;
  row_data := CASE WHEN TG_OP = 'DELETE' THEN before_row ELSE after_row END;
  org := (row_data->>'org_id')::uuid;
  event_action := CASE TG_OP WHEN 'INSERT' THEN 'added' WHEN 'DELETE' THEN 'removed' ELSE 'updated' END;
  event_subject := coalesce(row_data->>'title', row_data->>'name', 'Untitled');
  IF TG_TABLE_NAME = 'profiles' THEN
    event_category := 'people';
    event_subject := coalesce(nullif(row_data->>'display_name',''), 'A teammate');
    IF TG_OP = 'UPDATE' AND before_row->>'org_id' IS DISTINCT FROM after_row->>'org_id' THEN
      IF before_row->>'org_id' IS NOT NULL AND EXISTS (SELECT 1 FROM public.organizations WHERE id = (before_row->>'org_id')::uuid) THEN
        INSERT INTO public.org_activity(org_id, actor_id, actor_name, category, action, subject)
        VALUES ((before_row->>'org_id')::uuid, auth.uid(), coalesce((SELECT nullif(display_name,'') FROM public.profiles WHERE id=auth.uid()), 'A teammate'), 'people', 'left', event_subject);
      END IF;
      event_action := 'joined';
    ELSIF TG_OP = 'UPDATE' AND before_row->>'role' IS DISTINCT FROM after_row->>'role' THEN
      event_action := 'became ' || (after_row->>'role');
    ELSIF TG_OP = 'DELETE' THEN event_action := 'left';
    ELSIF TG_OP = 'INSERT' THEN event_action := 'joined';
    ELSE RETURN NULL;
    END IF;
  ELSIF TG_TABLE_NAME = 'organizations' THEN
    org := (row_data->>'id')::uuid; event_category := 'settings';
    IF TG_OP = 'UPDATE' AND before_row->>'name' IS DISTINCT FROM after_row->>'name' THEN event_action := 'renamed organization';
    ELSIF TG_OP = 'UPDATE' AND before_row->>'code' IS DISTINCT FROM after_row->>'code' THEN event_action := 'regenerated invite code'; event_subject := 'Organization';
    ELSE RETURN NULL;
    END IF;
  ELSIF TG_TABLE_NAME = 'quicklinks' THEN
    event_category := 'links';
    IF row_data->>'scope' NOT IN ('shared','both') THEN
      IF before_row->>'scope' IN ('shared','both') THEN org := (before_row->>'org_id')::uuid; event_subject := before_row->>'title'; event_action := 'unshared';
      ELSE RETURN NULL; END IF;
    END IF;
    IF TG_OP = 'UPDATE' AND before_row->>'title' IS NOT DISTINCT FROM after_row->>'title'
      AND before_row->>'url' IS NOT DISTINCT FROM after_row->>'url' AND before_row->>'scope' IS NOT DISTINCT FROM after_row->>'scope' THEN RETURN NULL; END IF;
  ELSIF TG_TABLE_NAME = 'projects' THEN
    event_category := 'projects';
    IF TG_OP = 'UPDATE' AND before_row->>'name' IS NOT DISTINCT FROM after_row->>'name'
      AND before_row->>'status' IS NOT DISTINCT FROM after_row->>'status' THEN RETURN NULL; END IF;
  ELSIF TG_TABLE_NAME = 'org_announcements' THEN
    event_category := 'announcements';
    IF TG_OP = 'INSERT' THEN event_action := 'published'; END IF;
    IF TG_OP = 'UPDATE' AND before_row->>'pinned' IS DISTINCT FROM after_row->>'pinned' THEN
      event_action := CASE WHEN NEW.pinned THEN 'pinned' ELSE 'unpinned' END;
    END IF;
  ELSE event_category := 'resources';
  END IF;
  IF org IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = org) THEN RETURN NULL; END IF;
  SELECT nullif(display_name,'') INTO actor_label FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.org_activity(org_id, actor_id, actor_name, category, action, subject)
    VALUES (org, auth.uid(), coalesce(actor_label,'A teammate'), event_category, event_action, left(event_subject,160));
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.record_org_activity() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS activity_announcements ON public.org_announcements;
CREATE TRIGGER activity_announcements AFTER INSERT OR UPDATE OR DELETE ON public.org_announcements FOR EACH ROW EXECUTE FUNCTION public.record_org_activity();
DROP TRIGGER IF EXISTS activity_resources ON public.org_resources;
CREATE TRIGGER activity_resources AFTER INSERT OR UPDATE OR DELETE ON public.org_resources FOR EACH ROW EXECUTE FUNCTION public.record_org_activity();
DROP TRIGGER IF EXISTS activity_people ON public.profiles;
CREATE TRIGGER activity_people AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.record_org_activity();
DROP TRIGGER IF EXISTS activity_settings ON public.organizations;
CREATE TRIGGER activity_settings AFTER UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.record_org_activity();
DROP TRIGGER IF EXISTS activity_links ON public.quicklinks;
CREATE TRIGGER activity_links AFTER INSERT OR UPDATE OR DELETE ON public.quicklinks FOR EACH ROW EXECUTE FUNCTION public.record_org_activity();
DROP TRIGGER IF EXISTS activity_projects ON public.projects;
CREATE TRIGGER activity_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.record_org_activity();

COMMIT;

NOTIFY pgrst, 'reload schema';
