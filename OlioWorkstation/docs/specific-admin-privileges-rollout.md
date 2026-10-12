# Specific admin privileges: rollout and verification

The implementation adds explicit version-1 grants, field projection, owner-managed assignments, reviewed promotion snapshots, and one silent access check every 20 seconds. Ordinary organization permissions continue to operate independently.

## Deployment order

1. Keep `ADMIN_PERMISSION_ASSIGNMENTS_ENABLED` unset/false. Apply `20261012010000_specific_admin_privileges.sql`. Existing non-owner admins receive explicit Full operational grants and a migration audit entry. Missing permission storage fails closed in the new API.
2. Apply `20261012020000_approve_admin_permissions.sql`, then deploy the permission-aware API and frontend together. This follow-up migration enables permission selection in pending approvals. If the first migration is already applied, run only the follow-up. Verify all traffic is served by the new version, including Help Center, feature ideas, and background storage policies.
3. Run `supabase/tests/specific_admin_privileges.sql` against a disposable migrated database, plus the focused API/UI tests. Verify owner promotion, downgrade and revocation with test accounts.
4. Set `ADMIN_PERMISSION_ASSIGNMENTS_ENABLED=true` only after the deployment and authenticated database tests pass. The owner panel is intentionally disabled until then.

Never roll back to boolean-only API authorization after assigning reduced permissions. Disable assignment changes or affected admin routes while retaining the database policies and projection checks.

## Behavior changes to review

- Only application owners can request, assign or revoke application-admin access. Full admins retain operational actions but cannot manage grants.
- Pending promotion approvals include a permissions box with Read-only, Full, and Custom choices. Legacy requests default to Read-only and can be approved after the owner reviews the choice. The selected snapshot and approval commit together, with stale assignment revisions rejected. Account deletion approvals do not display this box.
- Unstructured admin audit payloads, reasons, target lists and actor emails remain owner-only, because they can contain values from hidden fields or protected owner records. Delegated admins receive permitted audit metadata. Other ordinary record fields are explicitly configurable.
- Direct feature-table reads require visibility of every feature column; the API projects partial grants. Direct feature writes additionally require all writable feature fields. This prevents a browser from bypassing field projection through Supabase.
- Bulk quick-link operations conservatively require source reads and all destination create/update/delete and writable-field capabilities before planning. They fail as a whole when any capability is absent.
- Permission changes discard the current admin view and pending confirmations. Unchanged checks preserve drafts and do not refetch datasets. Transient checks disable controls until verification recovers. Account/session denial exits through the regular application's existing auth/account guards.

## Local validation

Use the repository's Node runtime to run the API compiler, Vite build, and focused Vitest suites. Exclude `**/.startup-lock.local/**` from Vitest discovery; it is an unrelated local backup checkout with its own React installation.

The authenticated SQL test is transactional and rolls back its fixtures. Do not run it on production. No live database migrations or environment changes are performed by this implementation task.
