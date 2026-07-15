# Olio Launcher architecture decisions

Status: **Milestone 0 approved; Milestone 1 foundation implemented and under review.**

This document records the architecture choices supported by the Milestone 0 prototypes.
It does not define production feature UI and does not authorize Quick Pastes, Send to
Phone, Network Analyzer, database, or Workstation changes.

## Decision summary

| Area | Decision | Evidence / consequence |
| --- | --- | --- |
| Runtime | AutoHotkey v2, compiled as one standalone executable | Keeps lifecycle, hooks, GUI, GDI, and Win32 calls in one resident native process. No Electron, browser runtime, terminal, or normal-operation helper. |
| UI technology | Native AutoHotkey GUI controls and Win32 styling | The frameless native panel spike positions and paints within the latency and memory baseline. WebView2 adds deployment, focus, accessibility-bridge, and memory complexity without a demonstrated requirement. Reconsider only if a documented native-control blocker is found. |
| Process model | One standard-user, single-instance resident process | A Focus Key toggles an existing native window. The spike uses `#SingleInstance Ignore`; the production activation/IPC behavior belongs to Milestone 1. |
| DPI model | Per-Monitor V2 awareness set before GUI creation | Use `SetProcessDpiAwarenessContext(PER_MONITOR_AWARE_V2)`, physical virtual-screen coordinates, `MonitorFromWindow`, `GetMonitorInfoW`, `GetDpiForWindow`, and the suggested rectangle from `WM_DPICHANGED`. |
| Monitor choice | Monitor containing the foreground window | Position against `rcWork`, not monitor bounds, so the taskbar is respected. Negative virtual coordinates are valid and must not be clamped to zero. |
| Clipboard observation | Event-driven `OnClipboardChange` | Inspect format presence only in the callback and copy supported payloads later. Never log content. Text and bitmap callbacks were both observed by the automated spike. |
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

The production screenshot milestone must add retry handling for transient clipboard
contention and repeated mixed-monitor pixel-bound tests, while preserving these ownership
rules.

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
- No clipboard text, image pixels, Quick Paste content, credentials, pairing codes, or
  access tokens enter logs.
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
