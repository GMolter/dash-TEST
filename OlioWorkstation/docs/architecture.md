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
per transaction. Authenticated device-list/revoke RPCs derive `auth.uid()` and return only
safe metadata. Device scope is constrained to `connection:status`; Milestone 6 must add a
new reviewed authorization boundary before any Quick Paste access exists.
