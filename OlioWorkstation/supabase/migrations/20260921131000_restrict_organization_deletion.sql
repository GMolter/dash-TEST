BEGIN;

-- Restrictive policy keeps any broader existing policy from allowing non-owners.
CREATE POLICY "organization_delete_requires_owner"
  ON public.organizations AS RESTRICTIVE FOR DELETE TO public
  USING (owner_id = auth.uid());

CREATE POLICY "organization_owner_can_delete"
  ON public.organizations FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

COMMIT;
