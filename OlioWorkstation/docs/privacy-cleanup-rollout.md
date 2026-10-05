# Privacy cleanup rollout

Apply these Supabase migrations before deploying the app/API changes:

1. `20261004120000_private_utilities.sql`
2. `20261004121000_admin_background_access.sql`
3. `20261004122000_owner_record_access.sql`

Short links default to personal. Creators can change them to organization-shared or public. Redirects enforce the chosen visibility and increment clicks through a restricted database function.

Secret records are personal. The secret URL remains a bearer capability: someone who receives it can explicitly reveal the secret once. A signed-in creator can preview without consuming it. Recipient consumption clears the stored content atomically. Admin screens expose only secret status metadata.

Legacy short links and secrets lack creator IDs. The migration does not invent ownership: these records remain inaccessible until a trusted operator assigns the verified `user_id`. For secrets also clear the legacy `org_id`. Existing short links become personal; make specific links public only after an intentional review. Keep a database backup and verify ownership before assigning legacy records.

Admins can open a non-owner account's **Custom background — view or edit** section to load, crop, replace, or remove its image. Other browsers refresh cached backgrounds within five minutes. App-owner profiles and their personal records are redacted and locked for non-owner admins in the API and UI. Verified app owners can browse and edit owner accounts, related records, and backgrounds. Existing owner-account deletion and required-admin safeguards remain in place.

Validation: focused Vitest utility/admin tests, API TypeScript check, production Vite build, and `test/utilityPrivacy.sql.mjs` against PGlite. The SQL test uses the existing local PGlite runtime by default; set `PGLITE_MODULE` to a module URL for another installation. Full frontend typechecking has existing errors in unrelated components.
