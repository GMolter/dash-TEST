# Milestone 6 — Quick Pastes results

## Delivered boundary

Milestone 6 adds read-only private Quick Pastes to the native launcher. Newly approved
devices receive `connection:status` plus the minimum `quick-pastes:read` scope. Existing
Milestone 5 devices are not silently upgraded. Copy and explicit paste are local launcher
actions and require no broader server scope.

The existing `/api/launcher` serverless function validates stable device identifier plus
unique protected credential, derives the owner only from the matched unrevoked device,
and returns only launcher-required fields in stable Workstation order. The migration
adds a service-only, fixed-search-path `fetch_launcher_quick_pastes` function with explicit
grants, atomic last-used update, source/device rate limits, and content limits. Existing
Quick Paste RLS and Workstation ownership rules remain unchanged.

## Synchronization and privacy

- Items and last-success time exist only in launcher memory.
- No encrypted or plaintext offline cache was added.
- Transient failures may leave a clearly labeled stale in-memory list.
- Revocation, confirmed disconnect, and exit clear every retained Quick Paste.
- Credentials and content never enter URLs, settings, logs, browser persistence,
  analytics, snapshots, coverage, or diagnostic artifacts.
- Responses are limited to 100 items, 20,000 content characters per item, 500,000
  aggregate content characters, and 1 MiB of JSON.
- Source access is limited to 60 requests per 10 minutes; each device is limited to 30
  requests per 10 minutes.

## Native use

The native page includes loading/disconnected/error/empty states, one full-width Search
field, Refresh, last successful sync, a keyboard-accessible owner-drawn list, Copy, Paste,
and a Settings route. Search covers title, content, category, and favorite metadata
without a separate category selector. A stable favorite-first projection keeps pinned
items above regular items without changing order inside either group. Accumulated wheel
deltas move two cards per full notch for faster, predictable scrolling. Opening the page starts
synchronization directly. It provides no creation, editing, deletion, reordering, or
sharing interface.

Mouse selection, Enter, and Copy publish only the selected content through the existing
Clipboard History suppression mechanism. Paste uses the same publication and then targets
only the previously active root window. Windows focus and integrity failures do not trigger
elevation; the content stays copied for manual recovery. Clipboard capture pause and
sensitive-application exclusions remain coherent, and Dynamic Screenshot is unchanged.

## Automated evidence

The focused launcher suite uses isolated mock transports, credentials, connection state,
clipboard state, paste targets, and an off-screen native GUI. It does not acquire the
production mutex, open production settings or credentials, invoke launcher IPC, or start
the resident launcher.

- Focused launcher Milestone 6: **64 assertions passed**
- Focused Workstation Milestone 6 Vitest: **17 tests passed**
- Launcher regressions: Milestone 1 **85**, Milestone 2 **63**, Milestone 3 logic
  **26**, Milestone 5 **382**, and Clipboard Preview **44** assertions passed. The full
  guarded Milestone 3 harness also exited successfully.
- Complete Workstation Vitest: **14 files and 66 tests passed**
- API TypeScript check: **passed**
- Test TypeScript check: **passed**
- Focused ESLint: **passed**
- Production Vite build: **passed** (with the existing non-failing large-chunk advisory)
- Launcher entrypoint parse-only gate: **passed**
- Vercel production function budget: **12 functions, passed**
- `git diff --check` and sensitive-output scans: **passed**

## Isolation evidence

The API tests provide uniform content-free rejection for wrong credentials, wrong
devices, revoked devices, and missing authentication, and verify that no owner spoof
field reaches the RPC. The pgTAP test transaction uses two users and two device identities
to prove owner A sees only A's rows, owner B sees only B's rows, device A cannot
authenticate as device B, legacy devices lack the new scope, and removal blocks the next
fetch. Active database rows contain only credential hashes, never recoverable raw
credentials; removing a device deletes its row, hash, and completed pairing history.

## Nontechnical manual checklist

Use harmless test text and two disposable local test accounts/devices. Never use the
resident launcher's profile or clipboard history.

1. Approve a fresh launcher and confirm Quick Pastes loads in Workstation order.
2. Verify Search matches titles, contents, saved categories, and “favorite,” and verify
   Refresh, empty state, and last-sync time. Confirm there is no category selector and
   favorite items remain above regular items.
3. Navigate every control with Tab/Shift+Tab and the list with arrow keys; confirm focus
   is visible and Enter copies the selected item. Confirm a wheel notch moves two cards
   and smaller high-resolution deltas accumulate smoothly.
4. Click one item, paste it manually into Notepad, and confirm exactly its content appears.
5. Put Notepad in front, open the launcher, select a harmless item, and choose Paste.
   Confirm only Notepad receives it.
6. Try an elevated editor from a standard-user launcher. Confirm paste fails safely,
   remains copied, and no elevation prompt appears.
7. Pause Clipboard History and repeat copy/paste. Confirm capture stays paused.
8. Use a configured sensitive application and confirm its clipboard capture exclusion
   remains intact.
9. Go offline, refresh, and confirm a recoverable stale/error label; reconnect and retry.
10. Revoke the device in Workstation and refresh. Confirm rows and the local protected
    credential clear and reconnection is offered.
11. Disconnect a newly connected disposable device and confirm Quick Pastes clears.
12. Exit an isolated launcher, reopen it, and confirm no Quick Paste list is available
    until synchronization.
13. Confirm Send to Phone and Network Analyzer remain disabled and no Quick Paste
    management controls appear in the launcher.

## Environmental limitations

The Supabase pgTAP suite requires Supabase CLI, Docker, and PostgreSQL. If those tools are
not present, the migration must not be applied to a remote or shared project merely to
obtain a test result. Cross-user, cross-device, raw-hash, grant, RLS, and atomic
revocation cases remain committed for execution in an isolated local database.

On this workstation, `supabase`, Docker, and `psql` were unavailable, so no migration was
applied and pgTAP was not executed. The optional repository-wide application TypeScript
check also remains red on pre-existing nullability/link-target errors in unrelated
`AnimatedBackground`, `PlannerView`, `Admin`, `URLRedirect`, and `DocEditor` files; the
required API and test TypeScript checks, focused lint, complete Vitest suite, and
production build all pass.

Milestone 7 settings/polish, Milestone 8 packaging, Send to Phone, Network Analyzer,
organization sharing, and later work are explicitly outside this result.
