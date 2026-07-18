# Milestone 6 device Quick Paste authorization

Status: **Approved implementation design for Milestone 6 only.**

This document defines the device access boundary before Quick Paste synchronization is
implemented. It does not authorize Quick Paste management, offline caching, organization
sharing, Send to Phone, Network Analyzer, settings/polish, packaging, or a later
milestone.

## Minimum scope

Milestone 6 adds exactly one device scope:

```text
quick-pastes:read
```

The existing `connection:status` scope remains required. `quick-pastes:read` permits an
authenticated launcher device to retrieve the approved device owner's bounded private
Quick Paste collection. Copy and explicit paste happen locally through existing launcher
clipboard and input utilities, so they require no server-side `use`, write, mutation,
analytics, or management permission.

Existing Milestone 5 device records are not broadened. The migration changes the allowed
scope constraint but does not update existing rows. A device approved before Milestone 6
must reconnect through the updated authorization page to receive
`quick-pastes:read`. The page must disclose private Quick Paste read access before the
owner approves the new credential.

## Authentication and owner derivation

The launcher sends only its stable device identifier and protected random credential in
an HTTPS request body to the existing `/api/launcher` function. The server hashes the
credential before invoking one narrowly scoped database function.

The database function:

1. Applies source and device rate limits using server-HMAC actor hashes.
2. Matches one unrevoked `launcher_devices` row by both stable device identifier and
   credential hash.
3. Requires both `connection:status` and `quick-pastes:read`.
4. Derives the owner exclusively from that validated device row.
5. Reads `public.quick_pastes` only where `user_id` equals the derived owner.
6. Returns a bounded array containing only `id`, `title`, `content`, `category`,
   `sort_order`, and `is_favorite`.
7. Preserves Workstation ordering by `sort_order`, `created_at`, and `id`.
8. Updates `last_used_at` in the same transaction after successful validation.

No launcher-supplied `user_id`, `owner_id`, email, account identifier, or device-record
identifier is accepted. Invalid device identifiers, credentials, revoked devices, and
unknown records share the same content-free failure. A correctly authenticated legacy
Milestone 5 device may receive only `scope_required`, which enables reapproval without
exposing another owner or device. A compromised or mismatched credential therefore
cannot enumerate owners, users, devices, or foreign records.

## Database privilege boundary

The new function is `SECURITY DEFINER`, fixes `search_path = ''`, schema-qualifies every
object, and is executable only by `service_role`. Browser and launcher code receive no
service-role key and no direct table grant. Existing Quick Paste RLS policies and
authenticated Workstation ownership behavior remain unchanged.

The existing owner-order index supports the derived-owner query. No device-to-Quick-Paste
foreign key or ownership column is added, and no direct device grant on
`public.quick_pastes` is introduced.

## Limits and failure behavior

- At most 100 Quick Pastes per synchronization response
- At most 20,000 Unicode characters per content value
- At most 120 characters per title and 60 per category
- At most 500,000 aggregate content characters
- At most 1 MiB of UTF-8 JSON from the API
- Bounded launcher DNS, connect, send, receive, and overall HTTPS timeouts
- One launcher synchronization request in flight at a time
- Content-free invalid, revoked, rate-limited, oversized, malformed, and offline errors

The server and launcher validate every returned field. Titles, categories, and content
are untrusted text. Display previews replace unsafe control characters without modifying
the exact content copied to the clipboard.

## In-memory lifecycle and privacy

Quick Paste rows, search results, categories, and selected content exist only in launcher
process memory. A successful refresh atomically replaces the prior in-memory collection.
A temporary network failure may leave that collection visible only with an explicit stale
or offline label. Revocation, confirmed disconnect, credential invalidation, and launcher
exit clear it immediately.

The last successful synchronization timestamp is memory-only. No Quick Paste payload or
derived cache is written to settings, logs, URLs, command-line arguments, browser
storage, analytics, diagnostics, screenshots, test results, or coverage artifacts.
Milestone 6 explicitly does not add plaintext or encrypted offline caching. A future
cache requires separate product-owner approval and a new retention, encryption, and
clearing design.
