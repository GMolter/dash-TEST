# Olio Launcher Roadmap

## 1. Product objective

Olio Launcher is a compact Windows tool panel opened by the laptop's Copilot key or a
user-configurable Focus Key. It provides fast access to local clipboard history,
memory-only screen capture, and Quick Pastes synchronized with Olio Workstation.

The application will be written for AutoHotkey v2 and optimized for Windows 11. It must
remain useful without an internet connection; only synchronized services such as Quick
Pastes require an Olio Workstation connection.

## 2. Scope rules

### Included in the initial product

- A right-side launcher panel with keyboard and mouse navigation.
- Copilot key and configurable Focus Key support.
- Clipboard History containing the 10 most recent supported items.
- Dynamic Screenshot with clipboard-only output and no image files.
- Quick Pastes synchronized with a connected Olio Workstation account.
- Launcher settings, startup behavior, opening position, and connection status.
- A planning-only Send to Phone card.
- A disabled Network Analyzer placeholder.

### Explicitly excluded for now

- Send to Phone implementation, database tables, APIs, pairing, or background behavior.
- Network scanning, packet capture, device discovery, traffic monitoring, or diagnostics.
- Cloud synchronization of Clipboard History.
- Automatic persistence of clipboard contents to disk.
- macOS, Linux, Android, and non-Windows desktop support.

Send to Phone must complete a separate product and security planning process before any
implementation begins. Network Analyzer must be the last feature planned and built.

## 3. Repository boundaries

All launcher-owned code, assets, tests, documentation, and packaging files must remain
inside `OlioLauncher/`.

Changes required to expose Quick Pastes inside the website belong in
`OlioWorkstation/`. This includes the Workstation UI, Supabase migrations, row-level
security policies, and web API endpoints. Launcher credentials or secrets must never be
committed to either folder.

Planned launcher structure:

```text
OlioLauncher/
|-- OlioLauncher.ahk
|-- roadmap.md
|-- README.md
|-- assets/
|-- config/
|   `-- settings.example.json
|-- docs/
|   |-- architecture.md
|   |-- setup.md
|   |-- security.md
|   `-- troubleshooting.md
|-- src/
|   |-- App.ahk
|   |-- LauncherWindow.ahk
|   |-- Navigation.ahk
|   |-- SettingsManager.ahk
|   |-- ClipboardManager.ahk
|   |-- ScreenshotManager.ahk
|   |-- QuickPastesClient.ahk
|   |-- CredentialStore.ahk
|   |-- Logging.ahk
|   `-- WindowsInterop.ahk
`-- tests/
```

The exact module breakdown can change during implementation, but modules should remain
small, single-purpose, and contained within `OlioLauncher/`.

## 4. Core architecture

AutoHotkey v2 owns the application lifecycle, hotkeys, clipboard observation, screen
capture, native window behavior, and communication with Windows. Olio Workstation owns
account authentication, Quick Paste management, device approval, server-side
authorization, and revocation.

The launcher should be a single-instance application. Pressing the configured key must
toggle the existing process instead of starting another process.

Runtime data locations:

- Non-sensitive settings: `%LOCALAPPDATA%\OlioLauncher\settings.json`
- Redacted diagnostics: `%LOCALAPPDATA%\OlioLauncher\logs\`
- Device credential: Windows Credential Manager or DPAPI-protected storage
- Clipboard History: process memory only
- Quick Paste offline cache: local encrypted or content-minimized cache, only after an
  explicit design decision during the Quick Pastes milestone

No logs may contain clipboard contents, Quick Paste contents, access tokens, pairing
codes, or captured images.

## 5. User experience specification

### Window behavior

- Default to a narrow panel attached to the right edge of the active monitor.
- Open on the monitor containing the foreground window.
- Respect the Windows work area so the taskbar is not covered.
- Account for mixed DPI scaling and monitors with negative virtual coordinates.
- Restore focus to the previously active application after a paste action.
- Close with `Escape`.
- Optionally close when focus is lost.
- Optionally stay on top.
- Remember the last selected tool and user-selected opening preference.

### Navigation

- Every action must be reachable by keyboard.
- Arrow keys move through items; `Enter` activates; `Escape` backs out or closes.
- Visible focus states are required.
- Destructive actions such as Clear History and Disconnect must require confirmation.
- Disabled features must be visually and programmatically non-interactive.

### Main sections

1. Clipboard History
2. Dynamic Screenshot
3. Quick Pastes
4. Send to Phone — `Planning`
5. Network Analyzer — `Coming later`
6. Settings

## 6. Milestone roadmap

### Milestone 0 — Technical spike and decisions

Goal: remove high-risk unknowns before building the main interface.

Tasks:

- Confirm the exact AutoHotkey v2 key event produced by the Copilot key mapping.
- Prototype a single-instance frameless panel without creating product UI.
- Verify per-monitor DPI awareness and active-monitor placement.
- Verify clipboard change callbacks for text and bitmap formats.
- Prototype a rectangular screen capture copied directly to the clipboard.
- Confirm that the capture prototype creates no temporary or permanent files.
- Decide whether the launcher UI will use native AutoHotkey controls or a packaged
  WebView2 layer. Prefer native controls unless the spike proves they cannot provide the
  required interaction and appearance.
- Record decisions in `docs/architecture.md` before proceeding.

Exit criteria:

- Copilot/Focus Key events are reliable.
- Panel positioning works at 100%, 125%, and 150% scaling.
- A bitmap can be captured and copied without file-system output.
- No unresolved technical choice blocks the foundation milestone.

### Milestone 1 — Application foundation

Goal: produce a reliable empty launcher shell.

Tasks:

- Add the AutoHotkey v2 entry point and application lifecycle.
- Enforce a single running instance.
- Implement toggle, show, hide, close, and focus-restoration behavior.
- Add right-side active-monitor positioning.
- Create primary navigation and placeholder views.
- Implement settings loading, validation, defaulting, and safe writes.
- Add configurable Focus Key registration with conflict/error reporting.
- Add optional launch-at-sign-in behavior without requiring administrator privileges.
- Add redacted diagnostic logging and a user-controlled logging toggle.
- Document installation and manual startup.

Exit criteria:

- Repeated key presses never create duplicate processes or windows.
- Invalid settings recover to documented defaults.
- The panel opens on the correct monitor and never renders outside its work area.
- Send to Phone and Network Analyzer are visibly disabled and execute no code.

### Milestone 2 — Clipboard History

Goal: expose the last 10 copied items without transmitting or persisting them.

Initial supported formats:

- Plain and Unicode text
- Bitmap/image clipboard data

Tasks:

- Subscribe to Windows clipboard change events without polling aggressively.
- Normalize supported formats into an in-memory history model.
- Store at most 10 unpinned entries.
- Deduplicate consecutive equivalent entries.
- Ignore launcher-generated clipboard events when appropriate.
- Show a safe text or image preview, content type, capture time, and source application
  when Windows exposes it reliably.
- Copy a selected history entry back to the clipboard.
- Add an optional Copy and Paste action that restores the previous window first.
- Add delete, clear, pause/resume, and pin behavior.
- Add a sensitive-application exclusion list.
- Define size limits and graceful handling for large clipboard payloads.
- Ensure Clipboard History is destroyed when the process exits.

Privacy requirements:

- Clipboard entries never leave the computer.
- Clipboard entries never enter logs.
- Clipboard entries are not written to settings, caches, crash reports, or databases.
- Disk persistence may only be introduced later as a separately approved opt-in feature.

Exit criteria:

- The most recent 10 supported items are displayed in correct order.
- Text and images can be restored accurately.
- Rapid clipboard changes do not freeze or crash the launcher.
- Paused and excluded applications do not add history entries.
- Clearing history releases all retained clipboard objects.

### Milestone 3 — Dynamic Screenshot

Goal: capture a user-selected screen region directly to the clipboard with no saved
image.

Tasks:

- Hide the launcher before capture.
- Display a dimmed selection overlay across the complete virtual desktop.
- Support dragging in every direction and across monitors.
- Show clear selection bounds and cursor state.
- Cancel with `Escape` while leaving the existing clipboard unchanged.
- Capture the selected pixels through Windows APIs into memory.
- Place the final bitmap on the clipboard.
- Release all device contexts, bitmap handles, and overlay windows after completion.
- Restore the launcher or prior application according to settings.
- Test mixed DPI scaling and negative monitor coordinates.
- Add automated or instrumented verification that the launcher creates no image files.

The implementation must not invoke a workflow that can auto-save through Windows
Snipping Tool settings. It must not create temporary PNG, JPEG, BMP, thumbnail, or cache
files.

Exit criteria:

- Successful captures exist only in memory and on the clipboard.
- Cancellation does not alter the clipboard.
- Pixel bounds are correct across all tested monitor layouts and scaling values.
- Repeated captures do not leak GDI objects or memory.

### Milestone 4 — Quick Pastes in Olio Workstation

Goal: create reusable personal snippets as a first-class Workstation utility.

Quick Pastes must be separate from the existing Pastebin. Pastebin creates shareable
resources with URLs, visibility, expiry, and view counts; Quick Pastes are private,
reusable content intended for immediate insertion.

Proposed initial data model:

- `id` — UUID primary key
- `user_id` — owner, required
- `title` — required display name
- `content` — required text
- `category` — optional organizational label
- `sort_order` — stable user-controlled ordering
- `is_favorite` — fast launcher access
- `created_at`
- `updated_at`

Workstation tasks:

- Add a Supabase migration and indexes.
- Add row-level security that restricts every operation to `auth.uid() = user_id`.
- Add create, edit, delete, duplicate, reorder, favorite, filter, and search actions.
- Add Quick Pastes to the Workstation Utilities navigation.
- Add validation and useful empty/loading/error states.
- Start with personal scope only; organization sharing requires separate approval.
- Test ownership rules with at least two users.

Exit criteria:

- Users can manage personal Quick Pastes from the Workstation.
- One user cannot read or modify another user's snippets.
- The utility works independently of the desktop launcher.

### Milestone 5 — Secure launcher connection

Goal: connect a launcher installation without collecting an Olio password or exposing a
privileged Supabase key.

Recommended pairing flow:

1. Launcher creates a short-lived pairing request and displays a code/status.
2. Launcher opens a Workstation approval page in the user's normal browser.
3. The signed-in user approves the named device.
4. The launcher polls or completes a one-time exchange for a restricted credential.
5. The credential is protected with Windows Credential Manager or DPAPI.
6. The device appears in Workstation account settings with last-used time and revoke.

Security tasks:

- Threat-model pairing, credential theft, replay, revocation, and device loss.
- Use short-lived, single-use pairing codes.
- Store only hashed pairing secrets server-side where practical.
- Make device credentials individually revocable.
- Never embed the Supabase service-role key in the launcher.
- Never ask for or store the user's Olio password in AutoHotkey.
- Apply rate limits to pairing and synchronization endpoints.
- Restrict API responses to the authenticated device owner's data.
- Redact secrets and content from all logs.
- Document disconnect, revoke, expiration, and recovery behavior.

Exit criteria:

- A user can approve and revoke a named launcher device.
- Revocation prevents subsequent synchronization.
- Credentials survive launcher restarts without appearing in plaintext configuration.
- Cross-user access and replay tests fail safely.

### Milestone 6 — Quick Pastes in Olio Launcher

Goal: browse and use connected Quick Pastes from the launcher.

Tasks:

- Display connected, disconnected, syncing, offline, expired, and revoked states.
- Fetch the current user's Quick Pastes through the restricted API.
- Add search, categories, favorites, and manual refresh.
- Copy a selected Quick Paste to the clipboard.
- Support optional immediate paste into the previously active application.
- Avoid recording a selected Quick Paste twice in Clipboard History.
- Display last successful synchronization time.
- Decide whether offline caching is needed after observing real usage.
- If caching is approved, document encryption, content limits, retention, clearing, and
  behavior after account disconnect before implementation.

Exit criteria:

- Connected users can find, copy, and paste their own snippets.
- Disconnected or revoked users receive a clear recovery action.
- Temporary network failures do not affect local clipboard or screenshot features.
- Disconnect removes the device credential and any approved local cache.

### Milestone 7 — Settings, accessibility, and polish

Goal: make the launcher dependable for daily use.

Settings to expose:

- Focus Key
- Start with Windows
- Active, primary, or remembered monitor
- Right-edge or remembered opening position
- Panel width
- Always on top
- Close when focus is lost
- Close after choosing an item
- Automatically paste after selection
- Clipboard capture pause
- Sensitive-application exclusions
- Theme and reduced-motion preference
- Olio account connection and disconnect
- Redacted diagnostics toggle

Tasks:

- Validate hotkey conflicts before saving.
- Add keyboard navigation, visible focus, accessible names, and readable contrast.
- Add reduced-motion behavior.
- Confirm usability with Windows text scaling.
- Add safe settings migration for future versions.
- Add a settings reset that does not silently revoke or preserve credentials incorrectly.

Exit criteria:

- All primary actions work without a mouse.
- Settings survive restart and invalid values recover safely.
- Text remains usable at supported Windows scaling values.
- No setting can accidentally enable Send to Phone or Network Analyzer.

### Milestone 8 — Packaging and release readiness

Goal: create a repeatable, supportable release.

Tasks:

- Decide between distributing the `.ahk` source and an AutoHotkey-compiled executable.
- Pin and document the supported AutoHotkey v2 version.
- Add application icon, version metadata, and license notices for dependencies.
- Document installation, updating, uninstalling, and startup removal.
- Define a versioning and release-note process.
- Add integrity/signing guidance; evaluate code signing before public distribution.
- Run the complete manual test matrix on a clean Windows account.
- Verify that uninstall instructions remove startup registration, settings, credentials,
  logs, and any optional cache.

Exit criteria:

- A clean machine can install, run, update, and remove the launcher using documentation.
- Release artifacts are reproducible from committed files.
- No development secrets or personal data exist in the release package.

### Milestone 9 — Send to Phone planning only

Goal: produce an approved product and security design. Do not write feature code.

Questions that must be answered:

- Which content types are supported: text, images, links, or files?
- Is delivery same-network, internet-relayed, or both?
- Is end-to-end encryption required, and how are device keys managed?
- What data is stored server-side, for how long, and how is it deleted?
- What happens when the iPhone home-screen web app is closed or suspended?
- Are Web Push notifications required and acceptable?
- How are iPhones paired, named, disconnected, and revoked?
- How is Add to Home Screen installation explained and verified?
- What are the size, frequency, abuse, and rate limits?
- What happens when an account or phone is lost?

Required planning outputs:

- Product specification
- iPhone/PWA feasibility report
- Data-flow diagram
- Threat model
- Privacy and retention policy
- Pairing and revocation design
- Test plan
- Explicit implementation approval

Until approval, the launcher contains only a disabled `Planning` card.

### Milestone 10 — Network Analyzer, last

This milestone may not begin until every earlier approved feature is stable and Send to
Phone has either shipped or been formally deferred.

The placeholder must perform no network calls, discovery, scanning, capture, probing,
or background work. Before implementation, define the exact user problem, permissions,
privacy boundaries, administrative requirements, supported diagnostics, and legal or
organizational constraints.

## 7. Test matrix

Every applicable milestone must cover:

- Windows 11 on a standard user account
- Single and multiple monitors
- 100%, 125%, 150%, and mixed DPI scaling
- Primary monitors positioned left or right of secondary monitors
- Virtual desktop coordinates that include negative values
- Taskbar on different display edges
- Rapid launcher toggling
- Sleep, resume, display disconnect, and display reconnect
- Text and image clipboard formats
- Empty, very large, and rapidly changing clipboard content
- Screenshot selection, cancellation, and repeated capture
- Online, offline, slow, expired, and revoked Quick Paste sessions
- Keyboard-only navigation
- Elevated target applications

Windows security prevents a normal-privilege launcher from reliably sending input to an
elevated application. The launcher must run without administrator rights by default and
explain this limitation instead of silently elevating itself.

## 8. Quality gates

A milestone is complete only when:

- Its exit criteria pass.
- Relevant documentation is updated.
- New settings and data have safe defaults and migrations.
- Sensitive data is absent from logs and repository files.
- Failure states are visible and recoverable.
- Existing completed features still pass smoke tests.
- Deferred features remain inactive.

No milestone should be marked complete solely because its UI exists.

## 9. Initial release definition of done

The first stable Olio Launcher release is complete when:

- The Copilot key or Focus Key reliably toggles one launcher instance.
- The panel opens at the configured right-side position on the correct monitor.
- Clipboard History safely manages the latest 10 supported items in memory.
- Dynamic Screenshot copies a selected region without creating image files.
- Users can manage Quick Pastes in Olio Workstation.
- Users can securely connect, revoke, synchronize, copy, and paste Quick Pastes.
- Settings, accessibility, privacy, failure handling, and installation documentation pass
  their quality gates.
- Send to Phone remains planning-only.
- Network Analyzer remains a completely inactive placeholder.

## 10. Immediate next step

Begin Milestone 0 only after this roadmap is reviewed and approved. The technical spike
must not introduce production features or Workstation database changes. Its findings
should be documented before Milestone 1 begins.
