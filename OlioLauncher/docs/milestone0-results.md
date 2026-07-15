# Milestone 0 spike results

Status: **Approved. Milestone 1 was authorized after the basic capture lifecycle was
stabilized; unavailable advanced display-topology cases remain in the regression matrix.**

Run date: 2026-07-12 (America/Indianapolis)

## Test environment

- Windows 11 Home, build 26200, 64-bit
- AutoHotkey 2.0.26, 64-bit runtime
- Active-display sample: 1920 × 1128 work area at 144 DPI (150%)
- Standard-user architecture; no prototype requests elevation

Generated raw TSV files are intentionally git-ignored because they contain
machine/run-specific diagnostics. The results below are the reviewed, committed record.

## Automated results

| Probe | Result | Measurement |
| --- | --- | --- |
| AutoHotkey parse/startup validation | Pass | `syntax-check` exited 0 under AutoHotkey v2.0.26. |
| Native frameless panel placement | Pass on available single display | Right-edge/work-area placement passed manual checks at 100%, 125%, and 150%. A second monitor was not available. |
| Clipboard callback: Unicode text | Pass | `OnClipboardChange` observed text-format availability. Prior clipboard was restored; no content was logged. |
| Clipboard callback: bitmap | Pass | `OnClipboardChange` observed bitmap-format availability. Prior clipboard was restored; no pixels were logged. |
| In-memory capture | Pass | 25 consecutive 16 × 16 GDI captures published `CF_BITMAP`; GDI objects were 18 before and 18 after (delta 0). |
| Capture file output | Pass by implementation inspection and scoped file check | Capture calls only GDI and clipboard APIs. It has no encoder, stream, image extension, temporary path, or image write. Metadata TSV output is not capture output. |
| Panel show/paint latency | Baseline recorded | 50 cycles: 21.541 ms mean, 27.930 ms p95 through synchronous `UpdateWindow`. |
| Visually silent cold-start proxy | Baseline recorded | 10 processes: 162.366 ms mean, 275.538 ms p95. Includes runtime launch, script parsing, native GUI construction, active-monitor geometry, and shutdown; no window is shown. |
| Hidden resident memory | Baseline recorded | 16,674,816-byte working set and 3,428,352 private bytes during the idle sample. In-process visible 50-cycle working set: 22,810,624 bytes. |
| Idle CPU | Baseline recorded | 0.0000% over 15 seconds. |
| Single-instance prototype | Pass for spike behavior | `#SingleInstance Ignore` prevents a second probe instance. Production toggle/activation IPC is deferred to Milestone 1. |
| Physical Copilot key mapping and reliability | Pass for normal and post-sleep checks | Observed `LWin` (`VK 5B`, `SC 15B`) down, `LShift` (`VK A0`, `SC 02A`) down, `F23` (`VK 86`, `SC 06E`) down/up, then modifier release. Ten presses and a post-sleep test passed. |
| Native Copilot action suppression | Pass | After replacing the pass-through hook, Windows Settings stayed closed during ten presses and the post-sleep test. |
| Interactive capture selection | Retest required | The auxiliary border window was removed after it trapped an error behind the overlay. One guarded overlay now owns the drag lifecycle, is destroyed before any error is shown, and automatically exits the one-shot `capture` process after success, cancellation, or error. |
| Silent measurement experience | Pass after correction | A short verification run printed start, progress, completion, timing, CPU, memory, and result-path messages while keeping cold-start and resident GUI instances hidden. |

## Manual validation still required

The product owner accepted advanced display-topology coverage as non-blocking for the
Milestone 1 start. The single-display 100%, 125%, and 150% checks passed. Keep the items
below in the later regression matrix rather than holding the foundation for unavailable
hardware:

- Repeat the key test while an elevated application is foreground.
- Panel placement on mixed-DPI monitors when a second display becomes available.
- A secondary monitor left/above the primary so virtual coordinates are negative.
- Taskbars on each supported edge and auto-hide on/off.
- Display disconnect/reconnect, docking, sleep/resume, and rapid focus-key toggling.
- Interactive rectangle dragging in all directions and across monitor boundaries;
  confirm cancellation leaves the clipboard unchanged.

## Reproduction

From `OlioLauncher/prototypes/` in a standard-user PowerShell session:

```powershell
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" .\Milestone0Probe.ahk syntax-check
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" .\Milestone0Probe.ahk clipboard-test
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" .\Milestone0Probe.ahk capture-test 25
& "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe" .\Milestone0Probe.ahk benchmark 50
.\Measure-Milestone0.ps1 -ColdStartRuns 10 -IdleSeconds 15
```

The cold-start metric is a visually silent process proxy that constructs the native GUI
and resolves active-monitor geometry without showing a window. The separate in-process
panel metric starts immediately before `Gui.Show` and ends after synchronous client-area
painting. Neither number includes a browser runtime or helper process.
