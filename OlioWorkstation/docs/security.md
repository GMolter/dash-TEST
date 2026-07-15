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
