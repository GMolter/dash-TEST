# Milestone 5 Secure Launcher Connection results

Status: **Implementation and local automated verification complete. Live PostgreSQL/RLS
execution and real two-account browser authorization remain environmental cases because
Supabase CLI, Docker, and `psql` are unavailable. No remote migration was applied.**

Run date: 2026-07-15 (America/Indianapolis)

## Implementation summary

- Native Settings connection states and keyboard-reachable Connect, Cancel, and confirmed
  Disconnect actions
- Windows CNG 256-bit pairing-secret generation and stable version-4 device identity
- Fixed-origin HTTPS validation, bounded asynchronous requests, one in-flight request,
  3-second polling, 10-minute overall expiry, cancellation, and terminal-state cleanup
- Windows Credential Manager write/read/delete with isolated restart and deletion tests
- Workstation authorization route using the existing sign-in/session flow, safe request
  metadata, explicit Approve/Deny, double-submit prevention, and recoverable states
- Profile Settings device list with safe metadata, refresh/error/empty states, and
  destructive revoke confirmation
- Server-only Vercel endpoint that generates codes/credentials, validates sessions,
  derives ownership, hashes secrets, and returns content-free states
- Supabase migration with hash-only request/device models, atomic transition RPCs,
  per-operation rate limits, safe authenticated RPCs, explicit grants, RLS, indexes, and
  cleanup behavior

No Quick Paste synchronization, content endpoint, cache, offline cache, clipboard bridge,
Send to Phone behavior, Network Analyzer behavior, packaging, helper, service, driver,
elevation, or later-milestone feature was added.

## Authorization protocol

1. The launcher uses its built-in `https://olio.one` Workstation origin, generates a 256-bit
   pairing secret with Windows CNG, and posts it with the stable device UUID and safe name.
2. The server stores SHA-256 hashes only and returns a request UUID, 10-character display
   code, and 10-minute expiry. The launcher constructs the fixed-origin approval URL; the
   pairing secret is absent.
3. A signed-out browser stays on the authorization route through normal Workstation sign-
   in. The page validates request UUID plus code before showing device name and expiry.
4. Approve or Deny calls the server with the browser session in an Authorization header.
   The server resolves the user through Supabase Auth and ignores client ownership values.
5. The launcher polls every 3 seconds with request UUID, stable device UUID, and pairing
   secret. Approval reveals only a state transition.
6. Exchange generates a fresh 256-bit credential in server memory. One row-locked database
   transition consumes the approved request and stores the credential hash. Only that
   winning response receives the raw credential.
7. The launcher writes the credential to Windows Credential Manager and clears all pairing
   material. Device status requires the credential/device pair and an unrevoked row.

The full threat model and trust boundaries are in
[milestone5-threat-model.md](milestone5-threat-model.md).

## Database migration, indexes, grants, and RLS

`20260715190000_secure_launcher_connection.sql` adds:

- `launcher_pairing_requests`: stable device UUID, safe name, pairing/code hashes, status,
  optional authenticated owner/device references, creation/expiry/approval/exchange/poll/
  update timestamps, and poll count
- `launcher_devices`: owner, stable identifier, safe name, unique credential hash,
  constrained `connection:status` scope, approval/last-used/revocation/update timestamps
- `launcher_rate_limits`: operation scope, HMAC actor hash, fixed window, and count
- Unique active-code, active-request-per-device, active-credential-per-device, and
  credential-hash indexes; owner/status, expiry, owner-request, and cleanup indexes
- Update triggers, active expiry handling, 24-hour pairing cleanup, and stale rate-bucket
  cleanup

RLS is enabled on all three tables. Pairing/rate tables have no client grants. Device
SELECT is owner-only and column-limited to safe metadata. Pairing/device protocol RPCs are
service-role only. Device list/revoke RPCs are authenticated only and derive `auth.uid()`.
Every security-definer function fixes `search_path = ''`; object references are schema-
qualified and grants are explicit.

## Credential generation and protected storage

Pairing secrets use `BCryptGenRandom` with the Windows system-preferred RNG. Server codes,
request IDs, and device credentials use Node `crypto.randomBytes`/`randomUUID`. Random
pairing and device values are SHA-256 hashed before database calls. Rate actors use HMAC-
SHA-256 with a server-only key so database records do not expose source IPs or user IDs.

The raw device credential is returned once and stored only with Windows `CredWriteW` as a
current-user generic credential. It survived an isolated new AutoHotkey process, then
`CredDeleteW` removed it and `CredReadW` returned no value. The isolated target used a
unique `.Test.<process>.<tick>` suffix and cleanup removed only that entry.
Normal targets include the stable launcher device UUID, preventing distinct launcher
identities under one Windows account from sharing protected credentials.

## Automated and integration results

| Check | Result |
| --- | --- |
| Launcher parse-only gate | Pass; exits before app/instance startup |
| Milestone 5 isolated launcher suite | Pass: 382 assertions |
| Milestone 1 foundation regression | Pass: 85 assertions |
| Milestone 2 Clipboard History regression | Pass: 63 assertions; rapid model 16 ms; events 1,094 ms; GDI delta 0 |
| Milestone 3 Dynamic Screenshot regression | Pass: 205 assertions; GDI delta 0; handle/private/working-set deltas 0 |
| Isolated image-preview regression | Pass: 44 assertions |
| Milestone 3 logic-only geometry/gesture | Pass: 26 assertions |
| Complete Workstation Vitest suite | Pass: 12 files, 51 tests |
| Focused Milestone 5 Workstation tests | Pass: 6 files, 23 tests |
| Workstation test TypeScript check | Pass |
| Server-only endpoint TypeScript check | Pass |
| Focused Milestone 5 ESLint | Pass, no warnings |
| Production Vite build | Pass: 1,565 modules; existing bundle-size warning remains |
| Application-wide ESLint baseline | Existing baseline failure only: 95 errors and 13 warnings; no Milestone 5 file referenced |
| Application TypeScript check | Existing baseline failure only: 88 legacy errors; no Milestone 5 file referenced |
| Local pgTAP launcher security suite | Not run: Supabase CLI, Docker, and `psql` unavailable |

The launcher suite uses mock asynchronous transport/browser boundaries, temporary
settings, an in-memory mock credential store for protocol transitions, and one uniquely
named real Credential Manager entry for restart/deletion. It starts no launcher instance,
uses no production mutex/IPC, and creates no production log or settings file.

## Isolation, replay, expiry, rate-limit, and revocation evidence

The committed pgTAP suite uses two synthetic users and two stable device identities. It
asserts owner-only list/RLS results, cross-user revoke denial, ownership spoof/change
denial, wrong-secret rejection, cross-device poll rejection, credential/device binding,
one successful exchange, replay failure, a single issued device row, denial, expiry,
unknown-request non-enumeration, rate-limit exhaustion, and immediate rejection after
revocation. It also verifies authenticated roles cannot select `credential_hash` and no
raw credential, pairing-secret, or display-code column exists.

This SQL evidence is committed but not reported as executed. Local JavaScript/AutoHotkey
tests executed the corresponding protocol validation, entropy, double-approval guard,
terminal states, protected-store lifecycle, disconnect, revocation recovery, offline
recovery, hostile names, and content-free errors.

## Accessibility results

- Authorization and device-management controls use native buttons, labels, status/alert
  semantics, keyboard-operable dialogs, Escape cancellation, initial confirmation focus,
  disabled busy states, and visible `focus-visible` rings.
- The native launcher uses labeled Edit and owner-drawn native Button controls, Tab/Shift+
  Tab, Enter, Escape, and existing navigation. Editing fields retain normal arrow-key
  behavior. Disconnect defaults to No.
- Automated tests verify keyboard activation, visible-focus classes, confirmation focus,
  Escape, double-approval prevention, safe hostile text, and revoke disabling.

## Privacy and sensitive-output verification

Static and runtime checks found no credential or pairing secret in settings, logs, URLs,
browser persistence, repository output, test artifacts, or diagnostic messages. Browser
code contains no service-role key, credential hash, pairing secret, or new storage call.
Launcher connection code never calls the logger and never logs HTTP bodies or headers.
Tests print only content-free counts/statuses. Build/test output contains no fixture
secret, account email, stable production user ID, clipboard content, or Quick Paste
content.

The approval URL intentionally contains the opaque request UUID and insufficient display
code allowed by the protocol. It contains no pairing/exchange secret, device credential,
access token, Supabase session, password, service key, device name, email, or owner ID.

## Resident launcher confirmation

Source and compiled resident checks both returned clear before clipboard/screenshot
regressions. No resident process was stopped, restarted, replaced, toggled, signaled by
IPC, or used for testing. Milestone 5 tests never acquire the production instance name.
Two isolated Milestone 5 test processes initially stayed alive because their native test
hotkeys kept AutoHotkey persistent; only processes whose command line named
`Milestone5Tests.ahk` were stopped, the test was corrected to exit explicitly, and the
production `OlioLauncher.ahk`/compiled process set remained untouched.

## Nontechnical manual checklist

> [!WARNING]
> Use a harmless test account and device name. Do not share pairing codes or screenshots
> containing account information. Never provide a password, access token, Supabase
> session, authorization header, device credential, private message, financial
> information, clipboard content, Quick Paste content, or other sensitive data to a
> tester, developer, or support report.

1. Open Olio Launcher **Settings** and confirm it shows a disconnected Connect action.
2. Enter a recognizable harmless device name and the operator-provided Workstation HTTPS
   address, then choose **Connect Olio Account**.
3. Confirm the normal browser opens the Workstation authorization page. If signed out,
   sign in through the usual Workstation form; never enter the password into the launcher.
4. Confirm the page device name and display code exactly match the launcher.
5. Choose **Deny** once. Confirm the launcher reports denial and offers a safe retry.
6. Start again, review the name/code, and choose **Approve launcher** once. Confirm a
   second click cannot create another approval.
7. Return to launcher Settings and confirm **Connected** appears. Confirm no Quick Paste
   title or content appears anywhere in the launcher.
8. Open Workstation **Profile Settings**, refresh **Olio Launcher devices**, and confirm
   the named device, connected time, last-used time, and Connected status appear.
9. In the launcher choose **Disconnect Olio Account**, cancel the confirmation once, then
   repeat and confirm. Verify Settings returns to disconnected and Workstation shows the
   old device revoked after refresh.
10. Reconnect the same launcher and confirm a new individually revocable device record.
11. In Workstation choose **Revoke**, cancel once, then confirm **Revoke access**. Return
    to launcher Settings, refresh/reopen it, and confirm it reports revocation and offers
    recovery.
12. Sign in to a different harmless test account. Confirm it cannot see or revoke the
    first account's launcher. Connect a second isolated launcher identity and confirm each
    account sees only its own device.
13. Temporarily disconnect networking while waiting and while checking a connected device.
    Confirm the launcher remains responsive, stops safely, and offers retry without
    deleting a valid credential.
14. Use Tab, Shift+Tab, Enter, Space, and Escape throughout. Confirm every focused action
    has a visible outline and every destructive action requires confirmation.
15. Confirm Clipboard History, Dynamic Screenshot, Focus Key behavior, startup, native
    navigation, and single-instance behavior remain unchanged. Confirm Send to Phone and
    Network Analyzer remain inactive.

## Environmental cases not exercised

- Local migration application and live pgTAP execution: Supabase CLI, Docker, PostgreSQL
  client, and an isolated local database are unavailable.
- No production or shared remote Supabase project was contacted or migrated because no
  authorization was provided.
- Real signed-in browser approval with two live Supabase users and two physical launcher
  installations requires an authorized migrated environment and was not attempted.
- Real proxy, captive portal, TLS interception, server clock skew, sleep/resume during
  pairing, device loss, and Windows Credential Manager roaming/domain-policy variants were
  not exercised.
- Packaging and a destination Windows machine without AutoHotkey remain Milestone 8 and
  were not started.

## Exit gate

All locally executable Milestone 5 gates pass. The unexecuted local database and real
two-account end-to-end cases remain explicit pre-deployment gates. Stop here. Do not begin
Milestone 6 Quick Pastes in Olio Launcher or any later milestone without product-owner
approval.
