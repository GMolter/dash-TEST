# Olio Workstation troubleshooting

## Quick Pastes will not load

Confirm that the account is signed in, the browser is online, the public Supabase URL and
anon key are configured, and the Milestone 4 migration exists in the target environment.
Choose **Try again** in the error notice after correcting the problem. Existing rows remain
unchanged when loading fails.

## Launcher Quick Pastes says new approval is required

The launcher has a valid Milestone 5 `connection:status` credential but lacks the
separate `quick-pastes:read` scope. This is intentional: the Milestone 6 migration does
not silently broaden existing device access. Disconnect that controlled launcher and
approve it again.

## Launcher Quick Paste synchronization fails

Apply migrations in timestamp order, including
`20260716053000_fix_launcher_pairing_expiry.sql` and then
`20260717090000_add_launcher_quick_paste_read_scope.sql`, through the approved deployment
workflow. Confirm `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and the existing launcher
rate-limit HMAC secret remain server-only, then redeploy the existing `/api/launcher`
function. Do not add a thirteenth serverless entrypoint.

Unknown, wrong, cross-device, and revoked credentials intentionally return the same
content-free failure. A rate-limited client must wait for the fixed window and retry.
Never collect request/response bodies, Quick Paste values, credentials, hashes, owner
IDs, sessions, or authorization headers while troubleshooting.

## A create or edit will not save

Title and content are required. The limits are 120 characters for title, 20,000 for
content, and 60 for an optional category. The form keeps the draft open after a recoverable
save failure so it can be retried. Do not paste the content into bug reports or logs.

## Reorder controls are disabled

Clear the search box and choose **All categories**. Reorder requires the complete private
collection so a filtered list cannot overwrite positions for hidden rows. The first item
cannot move up and the last item cannot move down.

## Local database tests cannot start

The database suite needs the Supabase CLI, Docker, and an isolated local stack. Install
those tools using your approved development process, then run the commands in
[setup.md](setup.md). Do not substitute a production or shared remote project merely to
make the test run.

## Reporting a problem safely

Record the action, generic error message, browser version, and whether retry succeeded.
Never include Quick Paste content, database response bodies, authentication tokens, or
screenshots showing sensitive snippets.

## Launcher authorization page is unavailable

Confirm the URL uses `/launcher/authorize` on the expected Workstation origin and that the
request has not exceeded 10 minutes. Signed-out users must use the normal Workstation sign-
in form and then return automatically to the authorization request. Unknown, malformed,
expired, cancelled, denied, or already-used requests intentionally reveal no device or
account metadata.

## Launcher devices reports an RPC 404

A `404` for `rest/v1/rpc/list_launcher_devices` means the Milestone 5 database migration
has not been applied to the Supabase project used by this Workstation deployment. Apply
`supabase/migrations/20260715190000_secure_launcher_connection.sql` through the approved
database deployment workflow, followed by later launcher migrations in timestamp order,
then redeploy or refresh Workstation. A `launcher_pairing_expiry_valid` error from an
already-applied base migration is corrected by
`20260716053000_fix_launcher_pairing_expiry.sql`. The migrations reload the PostgREST
schema cache. Do not place a service-role key in browser code and do not send database
credentials, sessions, or SQL-editor screenshots to support.

## A launcher device will not remove

Refresh **Profile Settings → Olio Launcher devices** and retry. A recoverable error leaves
the device visible and connected. Do not send database output, authorization headers,
request bodies, credentials, codes, account screenshots, or Supabase sessions to support.
After removal succeeds, the card disappears and every subsequent device-authenticated
request is rejected immediately. The device row, stored credential hash, and completed
pairing record are deleted together.

If Supabase reports `launcher_pairing_device_state` while deleting a device row, apply
`20260718193000_hard_delete_removed_launcher_devices.sql`. The original foreign key tried
to set an exchanged pairing request's `device_id` to null, which contradicted its state
constraint. The later migration changes that relationship to an atomic cascade.
