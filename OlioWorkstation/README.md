# Olio Workstation

The Olio Workstation web application is built with Vite, React, TypeScript, Tailwind CSS,
Supabase, and Vercel serverless functions.

Quick Pastes is a private, authenticated utility for reusable personal text. It uses the
dedicated `quick_pastes` table and never creates share URLs, public records, expiry
settings, or view counts. Pastebin remains a separate sharing utility backed by `pastes`.

Secure Launcher Connection lets an authenticated user approve a named Windows launcher
without entering an Olio password into AutoHotkey. Profile Settings lists safe device
metadata and provides confirmed per-device revocation. Milestone 5 grants connection
status only; it does not synchronize Quick Pastes to the launcher.

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
npm test
```

The Vercel project Root Directory should be configured as `OlioWorkstation`.

Client configuration requires `VITE_SUPABASE_URL` and the public Supabase anon key in
`VITE_SUPABASE_ANON_KEY`. Never place `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_` variable
or client bundle. See [setup.md](docs/setup.md), [security.md](docs/security.md), and
[milestone4-results.md](docs/milestone4-results.md) for local database validation,
privacy boundaries, and the Quick Pastes manual checklist. Secure Launcher Connection
evidence and limitations are in [milestone5-results.md](docs/milestone5-results.md).
