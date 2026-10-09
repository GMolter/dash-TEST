# Specific Admin Privileges — implementation plan

Status: proposed; no application or live permission changes made.

## Goal and source

The New features page at https://olio.one/admin?section=features describes this idea as: “Different admin privileges like, read-only, specific write permissions, full access, etc”.

Allow application owners to delegate administrative work without granting every administrative action. Application permissions remain separate from organization membership roles.

## Recommended product behavior

| Access level | Behavior |
| --- | --- |
| Standard account | No application-admin access. |
| Read-only admin | View ordinary admin records; cannot change records, reveal protected content, or manage permissions. Owner-only records and protected owner data remain restricted. |
| Custom admin | Configure Hidden, View-only, or Full control for each section, resource, subpanel, field, and supported action. |
| Full admin | All supported operational admin permissions, subject to existing owner protections and owner-only review requirements. |
| App owner | Existing protected authority; manages permission assignments and reviews. Not an assignable admin preset. |

Read-only is an explicit grant of ordinary administrative visibility, including account details; it is not a privacy-limited role. Use Custom when an administrator should see only certain areas.

### Permission editor

Add an owner-only **Admin access** panel to People → selected account. Show current access, who last changed it, and the available presets. Selecting Custom opens a permission matrix.

Group the matrix by People, Organizations, Workspace data, Integrations, Banners, Help Center, New features, and Activity. Expand each group into resources, subpanels, fields, and supported actions so the owner can control every exposed administrative capability. Field-level visibility and editing are part of version one.

| Setting | Result |
| --- | --- |
| Hidden | No navigation, value, control, or administrative API access for that item. Hidden values are omitted from responses, not merely concealed with CSS. |
| View-only | Can view the permitted item/value but cannot change it or execute its actions. |
| Full control | Can view and use all supported operations for that item, within parent restrictions and existing owner/immutable-data protections. |

Use the same three choices wherever meaningful. For an immutable field or history view, offer only Hidden and View-only. For an action such as resetting a password, View-only may show a disabled control/explanation, but never permits execution; Hidden removes it and Full control enables it. Protected-content reveals require explicit field visibility and reveal authority; View-only can permit an audited read/reveal without granting edits. The Read-only preset keeps these protected fields Hidden by default.

Sections and resources define maximum access; child permissions can narrow it. A Hidden parent hides everything beneath it, and a View-only parent prevents child writes. Group controls explicitly apply a selected level to current descendants, with a change summary; custom child overrides display a Mixed summary. New catalog items default to Hidden until explicitly assigned. Do not silently grant access to newly added fields or operations through a parent Full control setting.

Expose Create, Edit, Delete, Reveal protected content, ban/unban, reset passwords, transfer organization ownership, manage members, regenerate join codes, revoke launcher devices, and bulk quick-link operations as separately configurable capabilities. Full control at a resource sets its supported descendants; owners can then restrict individual fields/actions. For example: allow viewing People, editing display names, viewing emails without editing them, hiding organization membership, and hiding password-reset/delete actions. The parent must allow writes before display-name editing can be enabled.

Display a before/after summary and require a reason when saving. Use the existing operation preview/confirmation flow. Owners can remove administrative access from non-owner accounts. Explain permission dependencies inline rather than silently expanding a parent's permissions.

New administrators default to Read-only in the request editor; the approving owner explicitly confirms that choice. Custom starts with no grants. Future permissions are not automatically added to existing assignments, including Full admin assignments; owners can explicitly apply an updated preset.

Only owners can grant, change, or revoke application-admin permissions in this proposal. This intentionally narrows any existing non-owner revocation ability. Full admin does not grant access to owner records or permission management. Keep the existing owner-assignment mechanism and ownership limits.

## Implementation design

### 1. Define a permission catalog and close existing access paths

Create an explicit catalog of section, resource, subpanel, field, and action keys, for example `users.read`, `users.update`, `users.fields.display_name.read`, `users.fields.display_name.update`, `users.ban`, and `features.update`. Compile the three-state editor into effective read/write/action grants, honoring parent limits. Map every supported operation and returned field to its required keys; unknown items deny by default. Presets expand into explicit grants and have a catalog version.

Inventory all API handlers, direct Supabase calls, RLS policies, storage policies, and callable database functions that currently use `app_admin` or equivalent admin helpers. Classify privileged fields separately so generic Update cannot bypass a specialized action (for example ownership transfers, membership changes, or access flags).

The current resource registry in `api/_utils/adminResources.ts` is a useful starting point, but its static actions are not user authorization.

### 2. Store assignments and preserve owner rules

Keep `profiles.app_admin` as the admin-entry eligibility flag and `app_owner` as the protected owner flag. Add server-managed assignment metadata (preset, preset version, permission revision, updater, timestamps) and a grants table keyed by user and catalog permission. Missing assignment/grant denies; do not infer Full admin from a bare boolean after cutover.

Use a transaction for assignment replacement, eligibility changes, revision increment, and audit entry. Require the current revision when saving to prevent concurrent owners overwriting each other. Revocation clears eligibility and grants together. Browser clients cannot write either table or protected profile flags.

Extend access requests to carry the exact proposed grants and preset version. An owner reviews that snapshot; approval atomically applies it. Revalidate the catalog, target eligibility, and current owner authority at approval time. Existing pending requests need an explicit permission choice before approval.

### 3. Enforce authorization on the server and in Supabase

Extend `api/_utils/adminAccess.ts` to return effective permissions from current database state. Apply checks to every read, operation preview, and execution in `api/admin/data.ts`. A previously issued confirmation token does not preserve revoked authority: re-check grants on execution. Permission changes take effect on subsequent requests without requiring sign-out.

Filter overview totals, catalogs, account subpanels, related-record labels, searches, and activity responses by accessible resources and fields. Prevent hidden-field inference through search, filtering, sorting, exports, validation messages, references, and audit payloads. Reject writes to Hidden or View-only fields, including create and bulk payloads; do not silently ignore unauthorized fields. If required create fields are unavailable, disable Create and explain the dependency to the assigning owner. Keep owner protection and account-ban checks in addition to permission checks.

Enforce field visibility in direct database paths too: RLS alone restricts rows, not which column values a permitted row returns. Use permission-aware API/RPC response projection or suitably restricted views/column grants; remove broad admin reads that would bypass projection. Preserve legitimate normal-account access separately from administrative access.

Replace the separate broad admin check in `api/admin/help-articles.ts`. Update New features' direct Supabase RLS policies: `features.read` for reads, `features.create` for inserts, and `features.update` for edits/status changes. No delete capability is needed for its current UI. Apply equivalent checks to all other browser-to-database/storage admin paths found during the inventory; normal user/organization access must continue working independently.

For bulk operations, require every permission implied by the plan, including source reads and destination writes, before preview or execution. Reject the whole operation if any required capability is missing.

### 4. Adapt the admin interface

Return permitted sections, resources, and actions in the existing overview contract. Drive navigation, record drawers, account actions, banners, help editing, and feature controls from that contract. Read-only users get a visible access label and no mutation controls. A denied deep link shows an access message with a path to an allowed section.

Refresh capability state after permission errors and discard stale previews or pending edits that are no longer authorized. UI restrictions supplement server checks.

### 5. Silent permission and account-status check every 20 seconds

Add a lightweight authenticated `GET /api/admin/access-state` endpoint and one polling controller at the admin-shell level. On entry, verify access before displaying admin data and cache the returned effective permissions and account status in memory, scoped to the authenticated user/session. Do not persist sensitive admin data in local storage.

The endpoint checks current authentication, account existence/allowed status (including bans and deletion), admin eligibility, owner status, and effective permissions against the database. It returns a minimal access snapshot: `canAccessAdmin`, normalized account status, effective permissions, and a stable `accessVersion`. Its version is derived from all access-relevant state, including field grants and effective ban expiry, so direct database changes are detected even if they bypass the assignment UI. Unrelated profile changes or a new check timestamp must not change this version. Use private, no-store HTTP responses; the in-memory cache is for comparison/UI rendering, not an authorization authority.

Run a background check every **20 seconds** while the admin shell is mounted. Only one check can be in flight; skip overlapping ticks, cancel on unmount/sign-out, and ignore late responses from an older session. Do not fetch page datasets, show loading spinners, reset scroll, or overwrite edits for routine checks.

1. **Unchanged snapshot:** leave the permission/account cache and rendered page untouched. Update only internal check-health metadata. No overview reload, page data refetch, navigation, remount, or browser reload.
2. **Permissions/status changed and admin access remains:** atomically replace the cached snapshot, invalidate the admin page's data, discard old operation previews, and refresh the current admin view once under the new permissions. Clear revoked data and newly forbidden edits before rendering or accepting old network responses. Preserve the current route when allowed; otherwise move to an allowed landing section. Show a short access-updated notice and retain still-authorized draft values where practical.
3. **Admin access removed or account disallowed/deleted:** immediately clear cached admin data, previews, and drafts, stop polling, and exit the admin panel. An otherwise active account can return to the regular app; a banned/deleted account follows the existing blocked-account flow. An invalid session returns to sign-in. Do not reload protected data first.

“Refresh the actual page” means refreshing/remounting the admin view and its authorized data on a detected change, without requiring a full browser reload. The 20-second background timer itself never refreshes page content. Explicit user refreshes and normal post-edit data updates remain available.

On a transient network/server failure, do not treat it as a permission change, log the user out, or refresh the page. Retain the last snapshot, show a small verification-unavailable notice, and temporarily disable privileged actions until verification succeeds. Retry on the next tick. Authentication failure or explicit access denial is handled immediately, not as a transient error. Recheck immediately on tab focus, reconnect, or an authorization error; browsers can throttle background-tab timers, so 20 seconds is the requested cadence, not a guaranteed revocation deadline. Server/database authorization still applies to every action independently of the timer.

### 6. Roll out without changing existing admins accidentally

First deploy the schema and inventory/backfill existing non-owner admins with explicit grants matching their current supported operational permissions. Preserve owners and existing protected-data exclusions. Record the migration in the audit trail; list any deliberate behavior changes, including owner-only revocation, for review.

Deploy permission-aware APIs, database policies, and UI before enabling Custom/Read-only assignments. During a mixed-version deployment, keep assignment editing disabled and gate admin writes as needed so older handlers cannot bypass reduced grants. Activate the feature only after all entry points enforce it. Permission storage failures must fail closed, not fall back to broad access.

Rollback must disable affected administrative routes or the assignment feature while retaining enforcement; never restore broad boolean authorization after reduced grants exist.

## Acceptance criteria

- A standard account cannot enter admin or self-assign permissions through API, profile updates, database calls, or storage paths.
- A Read-only preset admin can view allowed records but cannot create, edit, delete, reveal protected content hidden by the preset, or perform specialized mutations, including direct Supabase writes to feature ideas.
- Every exposed section, resource, subpanel, field, and action appears in the permission catalog/editor with appropriate Hidden, View-only, and Full control choices. Immutable and owner-only restrictions remain enforced.
- A Custom admin can edit display names while viewing emails without editing them and seeing no membership fields or password-reset/delete controls. Forged requests cannot bypass any of those restrictions.
- Hidden values cannot be retrieved through direct database reads, exports, related labels, searches, sort/filter inference, or audit responses. Generic create/update and bulk operations reject unauthorized fields.
- Parent restrictions cap child permissions; new catalog items remain Hidden until assigned.
- A Custom admin with only Help Center grants can do only the selected help actions; people details, unrelated counts, references, and audit payloads are not exposed.
- Edit permission cannot be used to change privileged fields or invoke delete, reveal, ban, or permission management actions.
- Full admin retains supported operational access while owner-only reviews and owner data remain protected.
- A revoked/downgraded administrator cannot execute an earlier preview token; banned accounts remain denied.
- Bulk actions require all source/destination permissions and fail without partial changes when authorization fails.
- Concurrent permission edits produce a conflict; failed audit/assignment transactions apply no grants.
- Access request approval uses the reviewed permission snapshot; legacy pending requests cannot silently produce Full admin.
- Migration preserves intended existing access; schema errors never produce a broad-access fallback.
- With fake timers, checks run every 20 seconds without overlapping requests. Repeated unchanged responses cause zero page-data refetches, remounts, scroll resets, or lost drafts.
- Permission or relevant status changes update the cache and cause exactly one admin-view refresh per changed snapshot; unrelated database changes do not refresh the view.
- Removed admin access, bans, deletion, or invalid sessions clear protected state and exit the panel on the next successful check; the API blocks unauthorized actions immediately even before that check.
- Focus/reconnect checks recover from throttled timers, and late responses cannot restore data from a previous user or permission revision.
- Temporary check failures preserve page content without reload/logout, disable privileged actions, and recover on a successful check without refreshing an unchanged page.

Add focused authorization/API tests, SQL policy/projection tests using authenticated roles, UI tests covering the four administrative states, and fake-timer polling tests. Include negative-path tests for direct requests rather than relying only on hidden buttons.

## Scope boundary

Version one includes granular section/resource/subpanel/field/action permissions and the silent 20-second permission/account-status check. Organization-specific row scopes, reusable named role templates, temporary grants, and notification subscriptions can follow later. Email integration and dashboard-layout editing remain separate features and must add explicit catalog permissions when implemented.
