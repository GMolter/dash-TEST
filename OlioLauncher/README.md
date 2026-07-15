# Olio Launcher

Olio Launcher is a native AutoHotkey v2 Windows launcher. The current code implements
the approved Milestone 1 foundation and Milestone 2 Clipboard History: one resident
process, Focus Key activation, right-edge placement, native navigation, validated local
settings, optional per-user startup, redacted diagnostics, and memory-only clipboard
history for text and images.

The shell uses a compact Workstation-themed grid of owner-drawn native Windows button
controls, with slate surfaces, spatial keyboard focus, a compact settings pill, and the
Workstation `O|` brand mark in the header and tray. Enabled tiles open native placeholder
pages, and clicking outside the launcher hides it. The shell does not embed HTML,
WebView2, Electron, or another browser runtime.

Clipboard History keeps the ten most recent unpinned items, supports a bounded pinned
set, and presents them in a compact, scrollable card list. Clicking a card restores that
item, moves it to the top without duplicating it, and leaves the launcher open. Delete
and clear-with-confirmation remain visible management actions.
Clipboard payloads are never persisted or transmitted. Dynamic Screenshot product UX
and Quick Pastes synchronization are not implemented. Send to Phone and Network Analyzer
remain disabled and execute no action.

## Run from source

Install AutoHotkey 2.0.26, then run from the repository root:

```powershell
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" ".\OlioLauncher\OlioLauncher.ahk"
```

The first launch opens the panel. Press the laptop Copilot key
(`LWin+LShift+F23`) to hide or show it. A second launch toggles the existing process
instead of creating another resident launcher. Exit completely from the tray icon.

See [setup.md](docs/setup.md) for settings and startup configuration and
[milestone2-results.md](docs/milestone2-results.md) for verification evidence and a
nontechnical manual test checklist.
