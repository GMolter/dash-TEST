# Olio Launcher

Olio Launcher is a native AutoHotkey v2 Windows launcher. The current code implements
the approved Milestone 1 foundation and Milestone 2 Clipboard History plus the Milestone
3 Dynamic Screenshot candidate: one resident process, Focus Key activation, right-edge
placement, native navigation, validated local settings, optional per-user startup,
redacted diagnostics, memory-only clipboard history, and clipboard-only screen capture.

The shell uses a compact Workstation-themed grid of owner-drawn native Windows button
controls, with slate surfaces, spatial keyboard focus, a compact settings pill, and the
Workstation `O|` brand mark in the header and tray. Enabled tiles open native placeholder
pages or native actions, and clicking outside the launcher hides it. The shell does not
embed HTML, WebView2, Electron, or another browser runtime.

Clipboard History keeps the ten most recent unpinned items, supports a bounded pinned
set, and presents them in a compact, scrollable card list. Clicking a card restores that
item, moves it to the top without duplicating it, and leaves the launcher open. Delete
and clear-with-confirmation remain visible management actions. Open sits immediately left
of Delete: it is greyed out for text and opens a native memory-only preview for images.
The preview uses the same borderless Olio header and compact owner-drawn controls as the
launcher, with no dimensions or storage-status text.
Clipboard payloads are never persisted or transmitted. Selecting Screenshot hides the
launcher and opens a native dimmed overlay across the complete virtual desktop. Drag in
any direction, release to copy the selected pixels directly as an in-memory Windows
bitmap and add the same image to memory-only Clipboard History, or press Escape to cancel
without changing the clipboard. A rapid double press of the Focus Key opens screenshot
selection directly without moving or closing the launcher or an open image preview; using
the Screenshot tile still hides the launcher first. No image encoder,
image file, Snipping Tool, helper process, browser runtime, or network path is used.
Quick Pastes synchronization is not implemented. Send to Phone and Network Analyzer
remain disabled and execute no action.

## Run from source

Install AutoHotkey 2.0.26, then run from the repository root:

```powershell
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" ".\OlioLauncher\OlioLauncher.ahk"
```

The first launch opens the panel. Press the laptop Copilot key
(`LWin+LShift+F23`) once to hide or show it, or press it twice within 350 ms to start
Dynamic Screenshot directly. A second launch toggles the existing process
instead of creating another resident launcher. Exit completely from the tray icon.

See [setup.md](docs/setup.md) for settings and operation,
[milestone2-results.md](docs/milestone2-results.md) for approved Clipboard History
evidence, and [milestone3-results.md](docs/milestone3-results.md) for Dynamic Screenshot
verification and the nontechnical manual checklist.
