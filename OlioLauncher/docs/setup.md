# Milestone 1 setup and operation

## Requirements

- Windows 11
- Standard-user account; do not run the launcher as administrator
- AutoHotkey 2.0.26 while running from source

The standalone compiled executable is a Milestone 8 deliverable. No installer, service,
driver, browser runtime, or helper process is used by the current foundation.

## Start manually

From the repository root:

```powershell
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" ".\OlioLauncher\OlioLauncher.ahk"
```

Normal launch opens the panel. `--background` starts the resident process without
showing the panel:

```powershell
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" ".\OlioLauncher\OlioLauncher.ahk" --background
```

Launching either command while Olio Launcher is already running sends one toggle request
to the existing process and exits the new process immediately.

## Controls

- Copilot key / default Focus Key: `LWin+LShift+F23`
- Up/Down: move between enabled navigation buttons
- Enter: select the focused button
- Escape: hide the panel and restore the prior foreground window
- Tray menu **Open / Hide**: toggle the panel
- Tray menu **Exit**: unregister the Focus Key and end the process

Send to Phone and Network Analyzer are disabled controls. Clipboard History, Dynamic
Screenshot, Quick Pastes, and Settings show placeholder text only.

## Settings

Settings are read from:

```text
%LOCALAPPDATA%\OlioLauncher\settings.json
```

The folder is created only after a setting must be written. Start from
`config/settings.example.json` if you want to configure the source build manually.
Supported values are:

- `focusKey`: AutoHotkey v2 hotkey syntax; default `#+F23`
- `startWithWindows`: Boolean; default `false`
- `panelWidth`: integer from 280 through 640
- `alwaysOnTop`: Boolean
- `closeOnFocusLost`: Boolean
- `loggingEnabled`: Boolean; default `false`
- `lastSelected`: `clipboard`, `screenshot`, `quickPastes`, or `settings`
- `openingMonitor`: `active` or `primary`
- `openingPosition`: currently `right`

Edit the file only while the launcher is stopped, then restart it. Invalid fields recover
to documented defaults and the panel reports how many values recovered. Before a later
write replaces an invalid source file, the original is preserved beside it as
`settings.invalid.YYYYMMDD-HHMMSS.json`. Writes use a same-directory temporary file and
atomic replace.

## Start with Windows

Set `startWithWindows` to `true` and restart the launcher. It creates only this per-user
value:

```text
HKCU\Software\Microsoft\Windows\CurrentVersion\Run\OlioLauncher
```

The source command points to AutoHotkey, the current `OlioLauncher.ahk`, and
`--background`. Setting the option to `false` removes only that value. Neither operation
requires elevation.

## Diagnostics

Diagnostics default off. When `loggingEnabled` is true, metadata-only logs are written to:

```text
%LOCALAPPDATA%\OlioLauncher\logs\launcher.log
```

Logs contain timestamps, event names, and short status tokens. They never contain
clipboard data, captured pixels, Quick Paste content, credentials, pairing codes, or
access tokens. The log rotates at 1 MiB.

