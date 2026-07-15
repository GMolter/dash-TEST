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
