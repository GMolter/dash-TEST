# Olio Workstation

The Olio Workstation web application is built with Vite, React, TypeScript, Tailwind CSS,
Supabase, and Vercel serverless functions.

Quick Pastes is a private, authenticated utility for reusable personal text. It uses the
dedicated `quick_pastes` table and never creates share URLs, public records, expiry
settings, or view counts. Pastebin remains a separate sharing utility backed by `pastes`.

Secure Launcher Connection lets an authenticated user approve a named Windows launcher
without entering an Olio password into AutoHotkey. Profile Settings lists safe device
metadata and provides confirmed per-device revocation. Milestone 6 adds a separately
reviewed `quick-pastes:read` scope for newly approved devices and read-only, owner-bound
synchronization through the existing `/api/launcher` function. Existing devices are not
silently upgraded.

## Commands

The Vercel Hobby deployment is intentionally limited to 12 production files under
`api/`. Shared server helpers belong under `api/_utils`, and the automated function-budget
test prevents an accidental thirteenth function. Admin help CRUD uses the consolidated
`/api/admin/help-articles` route.

```powershell
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
npm run test:quick-pastes
npm run test:launcher-connection
npm run test:launcher-quick-pastes
npm test
```

The Vercel project Root Directory should be configured as `OlioWorkstation`.

## Admin operations console

The server-side admin console requires `ADMIN_PASSWORD`, `ADMIN_COOKIE_SECRET`, and a
separate random `ADMIN_OPERATION_SECRET` in Vercel. Apply every Supabase migration through
`20260909170000_assign_application_owners.sql` before using admin mutations in a deployed
environment. This assigns protected ownership to `gavin@olio.one` and
`gmolter8@gmail.com`; both profiles must already exist. Owners are also app admins.
Regular admins cannot change owner accounts. Admin promotion requires a reason and
approval in an owner's Pending reviews tab; access flags are not ordinary editable fields.
Dashboard installation changes refresh in active user sessions within 30 seconds,
and when the user returns to the tab.

Client configuration requires `VITE_SUPABASE_URL` and the public Supabase anon key in
`VITE_SUPABASE_ANON_KEY`. Never place `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_` variable
or client bundle. See [setup.md](docs/setup.md), [security.md](docs/security.md), and
[milestone4-results.md](docs/milestone4-results.md) for local database validation,
privacy boundaries, and the Quick Pastes manual checklist. Secure Launcher Connection
evidence and limitations are in [milestone5-results.md](docs/milestone5-results.md).
Launcher Quick Paste authorization and validation evidence is in
[the Milestone 6 results](../OlioLauncher/docs/milestone6-results.md).
