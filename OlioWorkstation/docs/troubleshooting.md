# Olio Workstation troubleshooting

## Quick Pastes will not load

Confirm that the account is signed in, the browser is online, the public Supabase URL and
anon key are configured, and the Milestone 4 migration exists in the target environment.
Choose **Try again** in the error notice after correcting the problem. Existing rows remain
unchanged when loading fails.

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

## A launcher device will not revoke

Refresh **Profile Settings → Olio Launcher devices** and retry. A recoverable error leaves
the device unchanged. Do not send database output, authorization headers, request bodies,
credentials, codes, account screenshots, or Supabase sessions to support. If revocation
succeeds, every subsequent device-authenticated request is rejected immediately.
