# Olio Workstation setup

## Application

Use Node.js and install the committed dependencies from `OlioWorkstation`:

```powershell
npm ci
```

Create a local environment file using only the public project URL and anon key:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Never put a Supabase service-role key in a `VITE_` variable. Vite variables are included
in client code. Server-only administrative functions use non-`VITE_` variables through
their existing server configuration; Quick Pastes does not use those functions.

The Milestone 5 `/api/launcher` server function additionally requires the existing
server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Never prefix the service-role
key with `VITE_`, expose it to browser code, put it in launcher configuration, include it
in an example value, or log it. Deployment request/response body logging must remain
disabled for this endpoint.

Start the application with `npm run dev`.

## Local database migration and ownership tests

Do not apply this migration to production or a shared remote database without explicit
product-owner authorization. With the Supabase CLI and Docker installed, use an isolated
local stack:

```powershell
supabase init
supabase start
supabase db reset
supabase test db supabase/tests/quick_pastes_rls.test.sql
supabase test db supabase/tests/launcher_connection_rls.test.sql
```

The repository did not previously include `supabase/config.toml`; run `supabase init`
once to create local-only CLI configuration. Do not link that local configuration to a
remote project for this validation. `supabase db reset` rebuilds only the configured
local Supabase database. The pgTAP test
creates two isolated test identities inside a transaction, exercises owner and attacker
operations, tests anonymous denial, and rolls everything back. Test strings are synthetic
and harmless. The test reporter does not write Quick Paste content to result files.

The launcher connection pgTAP suite also creates two users and two device identities in a
transaction. It covers wrong-secret and cross-device rejection, one-time exchange,
replay, expiry, denial, rate limiting, credential/device binding, cross-user list/revoke,
ownership spoofing and changes, revocation, grants, fixed search paths, RLS, and absence
of raw-secret columns. Do not link this local configuration to a remote project.

## Workstation verification

```powershell
npm run test:quick-pastes
npm run test:launcher-connection
npm test
npm run typecheck
npm run lint
npm run build
```

See [troubleshooting.md](troubleshooting.md) if local Supabase tooling is unavailable or
the UI reports a recoverable load/mutation failure.
