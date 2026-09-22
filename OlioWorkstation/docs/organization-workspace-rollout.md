# Organization workspace rollout

Apply `supabase/migrations/20260921200000_organization_workspace.sql` before deploying the organization workspace. It creates announcements, resources, activity, and the membership RPC in one transaction, then refreshes the API schema cache. It also replaces the single-owner deletion policy with profile-based ownership. Existing membership roles and content are preserved.

Apply `supabase/migrations/20260922150000_organization_workspace_help.sql` for the corresponding help articles.

Both were applied to OlioDashboard through its SQL editor on September 22, 2026. The live Organization page was refreshed and verified to load announcements, resources, and activity without missing-table errors. These manually applied scripts are not recorded automatically in Supabase CLI migration history; reconcile the history before a future CLI push. The workspace script is safe to rerun: it retains existing tables, rows, and indexes and replaces only its own policies, triggers, and functions. Use the complete updated file, including BEGIN and COMMIT, rather than individual selected statements. A failed run rolls back that transaction; it does not undo an earlier successful installation.

The header join-code UI is a frontend change and must be deployed separately.

Validation:

```sh
node test/organizationWorkspace.database.mjs /path/to/@electric-sql/pglite/dist/index.js
node node_modules/vitest/vitest.mjs run src/pages/OrganizationPage.test.tsx test/helpCenterContent.test.ts
```

Database checks use synthetic data in memory and cover content permissions, cross-organization isolation, banned users, direct membership escalation, co-owner transfer, last-owner protection, private-content exclusion from activity, and organization deletion. They do not create or delete production team data.
