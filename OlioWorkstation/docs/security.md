# Olio Workstation security

## Quick Paste ownership

`public.quick_pastes.user_id` is required and references `auth.users(id)` with cascading
deletion. Row-level security is enabled and there are four operation-specific policies:

- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id` in `WITH CHECK`
- UPDATE: owner match in both `USING` and `WITH CHECK`
- DELETE: `auth.uid() = user_id`

The UPDATE `WITH CHECK` prevents an authenticated user from changing ownership. INSERT
prevents assigning a row to another user. The anon role has no table permissions. The
authenticated reorder function runs as the caller (`SECURITY INVOKER`) and requires the
complete owned ID set, so foreign, missing, duplicate, and anonymous reorder attempts fail.

Client filters do not replace these database controls. There is no public policy,
organization policy, anonymous policy, cross-user query, discovery query, share link, or
service-role key in Quick Paste client code.

## Schema constraints and indexes

- `id`: generated UUID primary key
- `title`: trimmed nonblank value, at most 120 characters
- `content`: nonblank text, at most 20,000 characters
- `category`: null or a nonblank value of at most 60 characters
- `sort_order`: nonnegative integer, default 0
- `is_favorite`: required Boolean, default false
- `created_at` and `updated_at`: required timestamps defaulting to `now()`
- a before-update trigger refreshes `updated_at`

Indexes cover `(user_id, sort_order, created_at, id)`, owner/category filtering, and a
partial owner/favorite lookup. Search is performed only across rows already returned by
the signed-in owner's RLS-scoped query; no content is placed in a URL or external search
service.

## Content handling

Quick Paste content is held only in React memory while the utility is open and in the
owner's Supabase row. The feature does not use `localStorage`, `sessionStorage`, IndexedDB,
Cache Storage, analytics, error reporting, request/response logging, URLs, or test result
files. Repository errors are converted to content-free recovery messages. Test fixtures
are synthetic and contain no real user data.

The existing Supabase authentication client persists the signed-in session token under
its existing `olio-auth` key; Quick Paste rows and content are never added to that storage.

Do not use passwords, access tokens, private messages, financial data, or other sensitive
information during manual testing. Quick Pastes is private by authorization, but it is not
a password manager or encrypted secret-sharing system.

## Secure launcher connection

Pairing requests expire in 10 minutes. The display code is a 10-character value from an
unambiguous alphabet and is unique among live requests; it is insufficient to poll or
exchange a request. The launcher separately supplies a CNG-generated 256-bit pairing
secret and stable device UUID in HTTPS bodies. SHA-256 hashes, never raw values, are
stored in `launcher_pairing_requests`. Atomic row locks allow only `waiting → approved`
or `waiting → denied`, then one `approved → exchanged` transition. Replay, wrong-secret,
wrong-device, denied, expired, cancelled, malformed, and unknown operations return
content-free states.

The final credential is another 256-bit random value generated in server memory. Its hash
is inserted atomically with the device row; only the winning exchange receives the raw
value, once. `launcher_devices` constrains credential hashes and active stable identifiers
to uniqueness, limits scope to `connection:status`, and timestamps approval, last use,
revocation, and updates. Every device-authenticated operation binds credential hash and
stable identifier and requires `revoked_at is null`.

RLS is enabled on device, pairing, and rate tables. Authenticated users can directly
select only safe columns from their own device rows. `list_launcher_devices()` and
`revoke_launcher_device(uuid)` derive `auth.uid()` and cannot accept ownership. Pairing
and device protocol functions are executable only by `service_role`; every security-
definer function fixes `search_path = ''` and uses schema-qualified objects. The service
role exists only in server deployment configuration. Approval ownership comes from
`auth.getUser` on the presented browser session, never a request body.

Creation, inspection, decisions, polling, exchange, and device status have separate
database rate limits. Source and user rate actors are HMAC-SHA-256 values keyed by a
server-only secret, so database disclosure does not reveal source addresses or stable
user IDs. Stale active requests are marked expired during access; the documented cleanup
function removes request history after 24 hours and stale rate buckets when invoked by an
approved server schedule.

Application code does not log request/response bodies, headers, codes, credentials,
hashes, account IDs, or emails. The browser stores no launcher request or account data.
The approval URL contains only the request UUID and insufficient display code; testers
must still avoid sharing it or screenshots. The launcher credential is protected by
Windows Credential Manager and is deleted after confirmed server disconnect or detected
revocation.

Milestone 5 explicitly has no Quick Paste device scope or endpoint. Authorization alone
does not permit Quick Paste reads, synchronization, caching, display, copy, or paste.
