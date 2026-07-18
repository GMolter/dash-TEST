# Olio Workstation architecture

## Quick Pastes (Milestone 4)

Quick Pastes is a first-class Workstation utility implemented with the existing React,
TypeScript, Tailwind, Supabase client, and authenticated-user context. It does not add a
serverless API, background worker, browser database, cache, or runtime dependency.

The feature is divided into four small layers:

- `src/components/QuickPastes.tsx` owns responsive, accessible presentation and dialogs.
- `src/hooks/useQuickPastes.ts` coordinates authenticated loading and mutations without
  browser persistence.
- `src/features/quickPastes/model.ts` owns validation, search, filtering, and stable order.
- `src/features/quickPastes/repository.ts` is the only Quick Paste Supabase data-access
  module. It accepts the authenticated user ID, selects explicit columns, and never logs
  request bodies, response bodies, content, or backend error details.

The browser uses the existing Supabase anon client and session. Authorization does not
depend on client filtering: row-level security on `public.quick_pastes` independently
requires `auth.uid() = user_id` for SELECT, INSERT, UPDATE, and DELETE. Client-side
`user_id` filters are defense in depth and reduce ambiguous zero-row mutations.

## Stable ordering

`sort_order` is a nonnegative integer controlled by the owner. New and duplicated rows
append after the highest current value. Editing and favoriting never change position.
Deletion may leave a harmless numeric gap. Reordering normalizes the complete collection
to positions 0 through N-1 in one authenticated `reorder_quick_pastes(uuid[])` call. The
database function rejects null IDs, duplicates, incomplete lists, foreign IDs, and
unauthenticated callers. Search and category filters disable reorder controls so a
filtered subset can never accidentally overwrite the full order.

For deterministic rendering if legacy or concurrent rows share a `sort_order`, ties use
`created_at` and then `id`. Refreshing therefore preserves a predictable order.

## Pastebin separation

Quick Pastes and Pastebin share no data model or route:

| Concern | Quick Pastes | Pastebin |
| --- | --- | --- |
| Table | `quick_pastes` | `pastes` |
| Audience | Authenticated owner only | Personal, organization, or public scope |
| URL | None | `/p/:paste_code` |
| Expiry/views | None | Supported |
| Organization sharing | None | Supported |
| Browser persistence | None | No change in Milestone 4 |

Milestone 4 introduces no launcher pairing, device approval, credentials, synchronization,
polling, offline cache, Send to Phone, Network Analyzer, packaging, or launcher runtime
change.

## Secure Launcher Connection (Milestone 5)

The browser route `/launcher/authorize` preserves its opaque request UUID and short-lived
display code while signed-out users pass through the existing `Onboarding` sign-in flow.
After sign-in, `LauncherAuthorization` sends the existing in-memory Supabase access token
only as an Authorization header to `/api/launcher`. Request values are never copied to
browser storage. The page shows only validated device name, display code, and expiry and
requires explicit Approve or Deny.

The Vercel server endpoint owns protocol validation, CSPRNG token/code generation,
SHA-256 hashing, HMAC-protected rate-limit actors, content-free responses, and Supabase
service access. It validates the browser session with Supabase Auth and derives `owner_id`
from that result; no client ownership field is accepted. Public launcher calls carry
their pairing secret or device credential only in an HTTPS request body. No request or
response body is logged by application code.

PostgreSQL owns the atomic state machine. `launcher_pairing_requests` stores short-lived
hash-only requests; `launcher_devices` stores individually revocable hash-only device
credentials; `launcher_rate_limits` stores HMAC actor hashes and fixed windows. Security-
definer functions use `search_path = ''`, explicit roles, row locks, and one transition
per transaction. Authenticated device-list/revoke RPCs derive `auth.uid()`. The
owner-facing list returns only safe metadata for active devices. Removal deletes the
owned device row and cascades its completed pairing record, so the credential becomes
invalid while the card and stored device history disappear. Milestone 6 preserves this
baseline and adds the boundary below.

## Launcher Quick Paste reads (Milestone 6)

The reviewed device scope is exactly `quick-pastes:read`, alongside
`connection:status`. The migration changes the scope constraint to allow only the legacy
or new exact sets and does not update existing device rows. A legacy device must be
disconnected and approved again; this prevents a silent authorization expansion.

The existing `/api/launcher` entrypoint adds one `quick-pastes` action, preserving the
12-function Hobby budget. It accepts only stable device UUID and credential in an HTTPS
POST body. The server hashes the credential and calls the service-only
`fetch_launcher_quick_pastes` RPC with HMAC source/device rate actors. The RPC matches one
unrevoked device, checks the new scope, derives its owner, and then reads only that
owner's Quick Paste rows. No `user_id`, `owner_id`, email, or account identifier is
accepted from the launcher.

The RPC is `SECURITY DEFINER` with an empty search path, schema-qualified objects, an
explicit `service_role` grant, atomic `last_used_at` update, and stable
`sort_order, created_at, id` ordering. It reuses
`quick_pastes_owner_order_idx`; no new index or direct table grant is required. RLS and
Workstation CRUD ownership policies are unchanged. Only id, title, content, category,
sort order, and favorite state leave the database.

Source access is limited to 60 requests per 10 minutes and device access to 30 per 10
minutes. The RPC/API enforce 100 items, title/category/content model limits, 500,000
aggregate content characters, and a 1 MiB UTF-8 JSON response. Wrong credentials,
unknown devices, revoked devices, and cross-device attempts receive the same
content-free invalid response.

The browser authorization page discloses read-only private Quick Paste access. It does
not expose launcher credentials or add Quick Paste data to browser persistence. Editing,
deleting, reordering, favoriting, and sharing remain Workstation-only.
