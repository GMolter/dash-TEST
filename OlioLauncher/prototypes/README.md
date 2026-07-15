# Milestone 0 diagnostic prototypes

These files are technical spikes, not the Olio Launcher application or production UI.
They intentionally live outside the planned `src/` tree and must not be promoted to
Milestone 1 without review.

Requirements: Windows 11 and AutoHotkey v2. Run from a standard-user PowerShell prompt.

## Selecting a mode

Open PowerShell in this `prototypes` directory and pass the desired mode as the argument
after `Milestone0Probe.ahk`. Double-clicking the AHK file only shows the help dialog.

```powershell
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" .\Milestone0Probe.ahk hotkey
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" .\Milestone0Probe.ahk panel
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" .\Milestone0Probe.ahk clipboard
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" .\Milestone0Probe.ahk clipboard-test
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" .\Milestone0Probe.ahk capture
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" .\Milestone0Probe.ahk capture-test
.\Measure-Milestone0.ps1
```

The modes verify:

- `hotkey`: suppresses F23 down/up so the Copilot key cannot invoke its native Windows
  action, while recording Win/Shift state and event metadata. F8 opens native AutoHotkey
  key history. No ordinary keystrokes are logged.
- `panel`: shows a frameless diagnostic panel at the right edge of the foreground
  window's monitor. It uses Per-Monitor V2 awareness and handles `WM_DPICHANGED`.
- `clipboard`: subscribes to `OnClipboardChange` and records only format presence and
  callback type, never clipboard contents.
- `clipboard-test`: preserves the current clipboard, generates text and bitmap changes,
  verifies both callback paths, then restores the prior clipboard.
- `capture`: Ctrl+Alt+S or this mode opens a virtual-desktop selection overlay. The
  selected pixels are copied as `CF_BITMAP` using GDI handles; no image encoder, path,
  stream, temporary file, or permanent file is used. When launched directly in
  `capture` mode, the process exits automatically after success, cancellation, or error.
- `capture-test`: performs 25 small screen-to-clipboard captures, verifies `CF_BITMAP`,
  checks the process GDI-object count, and restores the prior clipboard.
- `benchmark`: records show-to-synchronous-`UpdateWindow` latency and working set. The PowerShell runner
  adds a repeatable, visually silent cold-start proxy and hidden-resident idle sampling.
- `cold-start` and `resident` are internal noninteractive modes used by the PowerShell
  runner. They construct the native GUI without showing it, so automated measurements
  do not flash or leave a panel on screen.

All generated output is metadata-only TSV under `prototypes/results/`. Captures exist
only in GDI memory and on the Windows clipboard. Exit any interactive mode with
Ctrl+Alt+Q.

The target laptop reports its Copilot key as `LWin+LShift+F23` (`VK 86`, `SC 06E`).
Repeat-state checks and real 100%, 125%, 150%, mixed-DPI multi-monitor layouts still
require manual validation; do not infer those results from a single display setup.
