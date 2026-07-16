# Olio Launcher architecture decisions

Status: **Milestones 0 through 4 are approved. Milestone 5 Secure Launcher
Connection is implemented and locally verified; live database execution remains an
environmental validation case.**

This document records the native architecture choices established by Milestone 0 and
preserved through Milestone 5. Milestone 5 authorizes device connection only. It does not
authorize Quick Paste synchronization, offline caching, Send to Phone, Network Analyzer,
packaging, or a later milestone.

## Milestone 5 secure connection

`LauncherConnection` extends the single resident AutoHotkey process. It owns a small
state machine (`disconnected`, `starting`, `waiting`, `exchanging`, `connected`, terminal
and recoverable failure states), never owns an Olio password or Supabase session, and does
not access Quick Pastes. Native Settings exposes only a safe device name; the production
Workstation origin is fixed to `https://olio.one` and is not user-configurable. Only the
stable device UUID, device name, connected display name, and connected time are
non-sensitive settings. Pairing secrets and credentials are never serialized.

Windows CNG (`BCryptGenRandom` with `BCRYPT_USE_SYSTEM_PREFERRED_RNG`) generates 256-bit
pairing secrets and the version-4 stable device identifier. `WinHttpRequest` performs one
asynchronous HTTPS POST at a time with bounded DNS, connect, send, receive, and overall
timeouts. A 3-second timer polls only while approval is pending; every terminal state
stops it. The response body is parsed in memory and is never passed to diagnostics. The
launcher constructs both the fixed `/api/launcher` path and `/launcher/authorize` URL
from one normalized HTTPS origin. Automatic HTTP redirects are disabled, so request or
device authentication material cannot be forwarded to another host.

The approval URL contains only an opaque request UUID and short-lived display code. Those
values are insufficient to exchange the request; exchange also requires the independent
pairing secret and stable device identifier. The final 256-bit credential is written as a
generic credential through `CredWriteW`, read with `CredReadW`, and deleted with
`CredDeleteW`. Windows Credential Manager scopes it to the current Windows user and
protects it at rest; the target name includes the stable device UUID so two launcher
identities under one Windows account do not share a credential. Confirmed disconnect
revokes the server row before removing the local entry; a network failure leaves it
intact for safe retry. An invalid previously
working credential is treated as revocation, removed locally, and presented as a recovery
state.

The Workstation endpoint is the only network boundary. It keeps the Supabase service-role
key server-side, derives approval ownership from a validated browser session, hashes all
random secrets before database storage, and calls atomic fixed-search-path PostgreSQL
functions. Device scope is exactly `connection:status`. There is no Quick Paste read
scope, synchronization function, content endpoint, cache, or clipboard connection in
Milestone 5. See [milestone5-threat-model.md](milestone5-threat-model.md).

## Decision summary

| Area | Decision | Evidence / consequence |
| --- | --- | --- |
| Runtime | AutoHotkey v2, compiled as one standalone executable | Keeps lifecycle, hooks, GUI, GDI, and Win32 calls in one resident native process. No Electron, browser runtime, terminal, or normal-operation helper. |
| UI technology | Native AutoHotkey GUI controls and Win32 styling | The frameless native panel spike positions and paints within the latency and memory baseline. WebView2 adds deployment, focus, accessibility-bridge, and memory complexity without a demonstrated requirement. Reconsider only if a documented native-control blocker is found. |
| Process model | One standard-user, single-instance resident process | A Focus Key toggles an existing native window. The spike uses `#SingleInstance Ignore`; the production activation/IPC behavior belongs to Milestone 1. |
| DPI model | Per-Monitor V2 awareness set before GUI creation | Use `SetProcessDpiAwarenessContext(PER_MONITOR_AWARE_V2)`, physical virtual-screen coordinates, `MonitorFromWindow`, `GetMonitorInfoW`, `GetDpiForWindow`, and the suggested rectangle from `WM_DPICHANGED`. |
| Monitor choice | Monitor containing the foreground window | Position against `rcWork`, not monitor bounds, so the taskbar is respected. Negative virtual coordinates are valid and must not be clamped to zero. |
| Clipboard observation | Event-driven `OnClipboardChange` | Inspect format presence only in the callback and copy supported payloads later. Never log content. Text and bitmap callbacks were both observed by the automated spike. |
| Clipboard history | In-process `ClipboardHistoryModel` containing text strings or copied DIB buffers | No payload, preview, comparison value, or source field is serialized. Ten unpinned and at most ten pinned entries bound memory use. Consecutive equivalence is checked directly in memory without retaining a hash. |
| Screen capture | GDI screen DC to compatible in-memory bitmap, then `CF_BITMAP` | `BitBlt` copies selected pixels directly to an `HBITMAP`; `SetClipboardData` transfers ownership to Windows. There is no image encoder, stream, cache, temporary path, or image-file operation. All DC and untransferred bitmap handles are released. |
| First run | Default to an explicit, user-approved copy to `%LOCALAPPDATA%\OlioLauncher\`; also allow an explicit in-place portable choice | Never silently relocate or delete the executable. Explain both choices before mutation. The stable per-user copy is recommended for reliable sign-in startup and updates. Startup uses a per-user mechanism and points to the selected location. |
| Elevation | No initial launcher feature requires elevation | Focus-key handling, native UI, clipboard callbacks, GDI capture, settings, per-user startup, and later restricted network access all run at standard-user integrity. Do not embed `requireAdministrator`. Pasting into elevated targets remains blocked by Windows integrity rules and must not trigger silent elevation. |
| Privileged boundary | None for the initial launcher | A future approved administrative operation may launch a short-lived, narrowly scoped elevated helper. No service, driver, privileged helper, or elevation path is justified or implemented now. |
| Local data | Settings/logs in `%LOCALAPPDATA%`; sensitive transient data stays out of logs and files | Milestone 0 output contains only timing, format-presence, geometry, version, and resource-count metadata. Clipboard contents and captured pixels are not persisted. |

## Native process and resource ownership

The compiled executable will own the message loop, GUI objects, hotkey registrations,
clipboard subscription, and GDI resources. Modules in the eventual `src/` tree should
remain AutoHotkey v2 includes compiled into the same release executable; source-file
separation must not become a multi-process runtime.

Win32 ownership rules are explicit:

- Every `GetDC` is paired with `ReleaseDC`.
- Every compatible memory DC is paired with `DeleteDC`.
- The original selected GDI object is restored before a memory DC is destroyed.
- A created bitmap is deleted on failure, but never after successful
  `SetClipboardData`, because Windows then owns it.
- Clipboard access is closed in a `finally` block.
- Overlay and selection windows are destroyed on success, cancellation, and process exit.
- Cancelling a selection occurs before any call to `EmptyClipboard`, leaving the prior
  clipboard unchanged.

The production screenshot implementation adds bounded retry handling for transient
clipboard contention and instrumented mixed-monitor pixel-bound tests while preserving
these ownership rules.

## Milestone 3 screenshot lifecycle

`ScreenshotManager` remains an AutoHotkey include in the resident process. Selecting the
native Screenshot tile hides the launcher before creating one borderless, topmost overlay
whose rectangle is the physical Windows virtual desktop (`SM_XVIRTUALSCREEN`,
`SM_YVIRTUALSCREEN`, `SM_CXVIRTUALSCREEN`, and `SM_CYVIRTUALSCREEN`). The process is
Per-Monitor V2 aware and the overlay disables AutoHotkey GUI scaling, then applies the
virtual rectangle with `SetWindowPos`. Negative origins and monitor-spanning rectangles
therefore remain physical screen pixels instead of logical or primary-monitor-relative
coordinates.

The overlay paints a translucent Olio Workstation surface, readable instructions, a cyan
selection border, and live pixel dimensions. `WM_SETCURSOR` supplies the shared Windows
crosshair cursor. Mouse capture keeps reverse-direction and cross-monitor drags coherent;
`WM_KEYDOWN` handles Escape without installing a temporary global keyboard hook. Empty
rectangles are rejected before clipboard access. Rapid activation is idempotent while a
selection is active, and the Focus Key cannot open a second launcher over the overlay. A
small release-aware gesture state machine recognizes two Focus Key presses within 350 ms;
held-key repeat is ignored because a physical key-up event must occur between presses. The
first press schedules, rather than immediately performs, the single-toggle action. A rapid
second press cancels that pending toggle, so direct capture does not change any existing
launcher or preview window state. Click-away close is suspended only until direct capture
finishes; the Screenshot tile retains the hide-before-capture path.

On success, the overlay is destroyed before capture. A screen DC, compatible memory DC,
and compatible bitmap are created in process; `BitBlt` uses `SRCCOPY | CAPTUREBLT`; the
original selected GDI object is restored; and both DCs are released. Clipboard opening is
retried for bounded transient contention. A successful `SetClipboardData(CF_BITMAP)`
transfers the bitmap to Windows; every unsuccessful bitmap remains launcher-owned and is
deleted. Before ownership transfer, Clipboard History copies the bitmap into its existing
bounded in-memory DIB model. That prepared entry is committed only after clipboard
publication succeeds. Clipboard History mutation depth and the resulting sequence number
suppress the launcher-generated callback, so the one deliberate screenshot entry is not
recursively inserted or duplicated. Paused history and existing image limits remain in
force.

Cancellation destroys the overlay and releases mouse capture before any clipboard API is
called, so every prior clipboard format and byte remains unchanged. Completion returns the
saved pre-launch foreground window to `LauncherWindow`; if it no longer exists, the
launcher is shown instead. Failure status is content-free, restores focus, and is reported
without pixels, coordinates, window text, or clipboard data.

No screenshot code calls a file, encoder, stream, shell, browser, network, database,
Snipping Tool, or external-process API. Screenshot pixels exist only in GDI memory and on
the Windows clipboard. The focused suite snapshots launcher files, scans a unique runtime
clipboard marker, and statically rejects file/network/shell paths in `ScreenshotManager`.
The isolated measurement mode uses a separate single-instance namespace, default in-memory
settings, disabled logging, and no startup-registration mutation.

## Milestone 2 clipboard lifecycle

`ClipboardManager` registers one `OnClipboardChange` callback in the resident launcher.
The callback reads only the current sequence number, supported-format availability, and
clipboard-owner process name. A one-shot timer performs the bounded copy outside the
callback; there is no polling loop. Stale sequence numbers are discarded rather than
capturing a different clipboard value.

Supported input formats are `CF_UNICODETEXT`, legacy `CF_TEXT`, `CF_DIBV5`, `CF_DIB`, and
`CF_BITMAP`. Text becomes an AutoHotkey Unicode string. DIB data is copied into an
AutoHotkey `Buffer`; `CF_BITMAP` is normalized to a 32-bit DIB with `GetDIBits`. Restoring
an entry allocates a moveable global-memory block and transfers it to Windows through
`SetClipboardData`. Windows owns a successfully transferred block; every failed transfer
is freed locally.

Resource ownership is explicit:

- History entries own only their string or DIB buffer and release it on delete, eviction,
  clear, and exit.
- Only the selected image receives a temporary `HBITMAP` preview. Re-selection, leaving
  the page, deletion, clear, and shutdown call `DeleteObject` before dropping the handle.
- The image-only Open action copies the selected DIB into a separately owned process-memory
  buffer before showing an owned native preview window. `WM_PAINT` scales that buffer with
  `StretchDIBits`; no file, encoder, shell, clipboard mutation, or retained preview bitmap
  is involved. The preview uses a borderless Olio header, compact owner-drawn header close
  control, and no dimensions or storage-status line. Escape, the header close control,
  launcher hide, repeated open, and process exit destroy the window, remove its paint
  registration, and release the copied buffer.
- `CF_BITMAP` normalization pairs `GetDC` with `ReleaseDC`; clipboard access closes in a
  `finally` block; every `GlobalLock` is paired with `GlobalUnlock`.
- Pinned entries are exempt from the ten-unpinned eviction rule, but a separate ten-pin
  ceiling prevents unbounded image retention.

The current safety limits are 1 MiB for a text clipboard allocation and 16 MiB for a DIB
allocation, with image dimensions capped at 8,192 pixels per side and 32 million pixels.
The first exceeded limit rejects the entry, releases any temporary object, and reports a
content-free status in the UI. No rejected bytes are retained.

The default sensitive-application exclusion list contains `KeePass.exe`,
`KeePassXC.exe`, `1Password.exe`, and `Bitwarden.exe`. Matching is case-insensitive against
the clipboard-owner executable name. Windows does not always provide a live owner window;
when it does not, an owner-name exclusion cannot be applied. Source metadata remains
internal and is not rendered in the Clipboard History UI; identity is never inferred from
window titles or clipboard content.

Launcher restores mark the resulting clipboard sequence and also recognize the current
process as clipboard owner. The corresponding callback is suppressed so selecting an
entry does not duplicate it. Selection restores the entry, promotes that same in-memory
object to the top, and leaves the compact launcher open. The owner-drawn native list box
shows roughly three cards at once and provides mouse-wheel and keyboard scrolling through
all ten retained unpinned entries. A native Open button immediately left of Delete tracks
list selection notifications: text disables it, while an image enables a keyboard-reachable
owned preview. Closing that preview returns focus to the launcher.

## Focus Key and Copilot key

The spike installs AutoHotkey's keyboard hook and records metadata for `F23`, modified
`F23`, and `Win+C` candidates. F8 opens native key history for exact virtual-key and scan
code inspection. Candidate mappings must not be hard-coded from internet reports or from
a different laptop model.

The target laptop's physical Copilot key produced this ordered hook sequence:

1. `LWin` down — `VK 5B`, `SC 15B`
2. `LShift` down — `VK A0`, `SC 02A`
3. `F23` down/up — `VK 86`, `SC 06E`
4. `LShift` up
5. `LWin` up

The prototype's F23 hook received the down event, confirming the mapping is observable as
`LWin+LShift+F23` on this device. The initial candidate hook used AutoHotkey's `~`
pass-through prefix, which allowed Windows Settings to open. The probe now uses
non-pass-through wildcard handlers for both F23 edges: modifier state remains observable,
but F23 is suppressed before Windows receives the complete chord. Repeat reliability and
native-action suppression still need ten presses in normal, elevated-target, post-sleep,
and post-resume states. The configurable Focus Key remains the fallback if Windows or OEM
software consumes the Copilot event in any state.

Production Focus Key registration owns both the down and up edges. One press toggles the
launcher after the 350 ms double-press decision window. A second down edge inside that
window starts Dynamic Screenshot directly only when an up edge occurred after the first
press, preventing Windows key-repeat from opening capture mode. The pending single toggle
is cancelled, and existing launcher and image-preview windows remain visible and unmoved
behind the overlay. Completing a gesture resets it; presses outside the interval begin a
new single-press sequence.

## DPI and window placement algorithm

1. Before constructing any GUI, request Per-Monitor V2 awareness.
2. On activation, save the foreground HWND for later focus restoration.
3. Resolve its nearest monitor with `MonitorFromWindow(..., MONITOR_DEFAULTTONEAREST)`.
4. read the physical work rectangle with `GetMonitorInfoW`.
5. Scale the configured logical panel width by the monitor DPI; use the work-area height.
6. Place the panel at `work.right - width, work.top` without assuming nonnegative
   coordinates.
7. On `WM_DPICHANGED`, apply Windows' suggested rectangle atomically with `SetWindowPos`.
8. Re-resolve geometry after display, taskbar, sleep/resume, and dock-topology changes.

The local spike verified this algorithm on one 150% display. The 100%, 125%, mixed-DPI,
negative-coordinate, and alternate-taskbar-edge cases remain mandatory manual tests.

## Performance baseline and provisional budgets

The reproducible results and methodology are in
[`milestone0-results.md`](milestone0-results.md). The development-machine baseline is:

- Panel show through synchronous `UpdateWindow`: 21.541 ms mean, 27.930 ms p95 over
  50 cycles.
- Visually silent cold-start proxy: 162.366 ms mean, 275.538 ms p95 over 10 fresh processes.
- Hidden resident working set: 16,674,816 bytes during idle sampling; 22,810,624 bytes during
  the 50-cycle in-process benchmark.
- Idle CPU: 0.0000% over 15 seconds.

The cold-start proxy constructs the GUI and resolves active-monitor geometry without
showing a window. `UpdateWindow` in the separate interactive benchmark is a bounded
synchronous-paint boundary, not proof of photon-to-screen latency. An interactive
high-speed-camera or presentation-feedback measurement can be added if a later change
approaches the budget. Until real usage data replaces them, Milestone 1 should treat
50 ms p95 Focus-Key-to-painted-window, 500 ms cold start, 35 MiB resident working set,
and 0.1% idle CPU as regression ceilings on comparable hardware.

The Milestone 3 post-feature sample remains inside those budgets: 0.0000% idle CPU over
10 seconds, 17,489,920-byte working set, 4,894,720 private bytes, and zero normal-operation
helper processes. A warmed full-virtual-desktop overlay painted in 24.253 ms; 320 × 180
and 1600 × 900 captures reached clipboard completion in 26.700 ms and 50.643 ms. Full
details and the unavailable hardware cases are recorded in
[`milestone3-results.md`](milestone3-results.md).

## First-run and removal behavior

The first-run screen will describe two standard-user choices before changing the system:

1. **Copy to a stable per-user location (recommended):** after approval, copy the
   executable to `%LOCALAPPDATA%\OlioLauncher\OlioLauncher.exe` and optionally register
   that path for sign-in startup.
2. **Run in place:** keep executing the selected portable file and clearly warn that
   moving or removing it breaks startup. Any optional startup registration points to
   that exact path.

Neither choice requires UAC. Machine-wide copying or startup registration is outside the
initial scope and must not be offered merely for convenience. Removal must unregister
the per-user startup entry first, then offer separate, explicit deletion of generated
settings/logs and credentials. The running executable must never silently delete itself.

## Security and privacy boundaries

- The normal process runs at medium integrity and follows least privilege.
- No clipboard text, image pixels, previews, comparison data, source application fields,
  Quick Paste content, credentials, pairing codes, or access tokens enter logs, settings,
  caches, crash reports, databases, or test-result files.
- Clipboard History has no file, database, cache, crash-report, or network writer. Its
  data lifetime ends with the process.
- Milestone 0 contains no credentials, databases, network requests, synchronization,
  packet inspection, device discovery, or feature placeholders.
- A medium-integrity process cannot reliably inject input into an elevated target. Show
  a clear limitation later; do not elevate the whole launcher.
- The inactive future Network Analyzer cannot justify a current service, driver, Npcap
  dependency, firewall rule, or UAC prompt.

## Milestone 0 review gate

The prototypes resolve the UI technology, process model, DPI approach, clipboard event
model, capture API/ownership model, first-run deployment choice, and elevation boundary.
The target hardware mapping is confirmed as `LWin+LShift+F23`; normal, post-sleep, and
native-action-suppression checks passed. Single-display placement passed at 100%, 125%,
and 150%. At the product owner's direction, unavailable multi-monitor and advanced
topology cases remain in the later regression matrix and do not block Milestone 1. The
interactive capture needs one final retest after its fail-safe simplification. Stop here
for review; do not create the Milestone 1 entry point, production navigation, settings
implementation, startup registration, or feature UI.
