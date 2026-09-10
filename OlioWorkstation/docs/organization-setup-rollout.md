# Organization setup repair

Apply `supabase/migrations/20260910140000_atomic_organization_setup.sql` in the Supabase SQL editor **before deploying these frontend changes**. This uses the existing `current_account_is_allowed()` function from the account-ban migration.

The screenshot's failing `PATCH /profiles` path is replaced with two authenticated RPCs:

- `join_organization_by_code(p_code)` validates the code and updates only the caller's membership. Repeated joins preserve an existing owner's/admin's role. Members cannot switch organizations through this function.
- `create_organization_with_owner(p_name)` creates an organization and assigns its owner in the same transaction. A failed profile update rolls back the organization insert.

Both functions lock the caller's profile, reject banned/anonymous accounts, fix their search path, and accept no user ID or role from the browser. Existing RLS policies remain enabled. The app consumes the committed profile and organization immediately and preserves PostgREST error messages.

The migration was tested in an isolated in-memory PostgreSQL runtime with representative schema and restrictive RLS, not against production. It has not been applied remotely. This test does not model every production trigger or policy.

For a repeatable local SQL check, install `@electric-sql/pglite` in a disposable directory and pass its entry module:

```sh
node test/organizationSetup.database.mjs /path/to/node_modules/@electric-sql/pglite/dist/index.js
```

The test uses only synthetic in-memory data, executes the exact migration, and checks successful join/create, leading-zero codes, invalid inputs, existing memberships, roles, anonymous and banned access, missing profiles, and rollback after a forced profile failure.

After applying the migration, verify with a test account that has a profile and no organization: join an existing code; use a separate unassigned account to create an organization; confirm the resulting profile has the correct org_id and member/owner role. No second profile-creation migration is required.
