# Olio Launcher

Olio Launcher is a native AutoHotkey v2 Windows launcher. The current code implements
the Milestone 1 foundation shell only: one resident process, Focus Key activation,
right-edge placement, placeholder navigation, validated local settings, optional
per-user startup, and redacted diagnostics.

The shell uses a compact Workstation-themed grid of owner-drawn native Windows button
controls, with slate surfaces, indigo focus states, and a small settings icon. It does
not embed HTML, WebView2, Electron, or another browser runtime.

Clipboard History, Dynamic Screenshot product UX, Quick Pastes, Send to Phone, and
Network Analyzer behavior are not implemented. Send to Phone and Network Analyzer are
disabled and execute no action.

## Run from source

Install AutoHotkey 2.0.26, then run from the repository root:

```powershell
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" ".\OlioLauncher\OlioLauncher.ahk"
```

The first launch opens the panel. Press the laptop Copilot key
(`LWin+LShift+F23`) to hide or show it. A second launch toggles the existing process
instead of creating another resident launcher. Exit completely from the tray icon.

See [setup.md](docs/setup.md) for settings and startup configuration and
[milestone1-results.md](docs/milestone1-results.md) for verification evidence.
