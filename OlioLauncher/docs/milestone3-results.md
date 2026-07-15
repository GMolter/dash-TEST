# Milestone 3 Dynamic Screenshot results

Status: **Implementation complete; exit criteria pass on the available Windows 11
hardware; ready for product-owner review. Milestone 4 has not begun.**

Run date: 2026-07-15 (America/Indianapolis)

## Implemented scope

- One in-process AutoHotkey v2 `ScreenshotManager`; no browser, helper, encoder,
  Snipping Tool, external executable, network, database, or elevation path
- Launcher hidden before the overlay only when Screenshot is selected from the launcher;
  direct Focus Key capture preserves the launcher and image-preview windows in place
- Reverse-direction, cross-monitor, negative-coordinate, and clamped virtual bounds
- Per-Monitor V2 physical-pixel capture with DPI-scaled instructions, selection border,
  dimension feedback, and a shared Windows crosshair cursor
- Mouse capture for coherent dragging plus Escape through the active overlay's native
  key messages
- Direct screen-DC `BitBlt` into an in-memory compatible bitmap and `CF_BITMAP`
  clipboard ownership transfer
- Bounded clipboard-open retries, invalid-selection rejection, Clipboard History event
  suppression with one deliberate memory-only screenshot history entry, focus restoration,
  duplicate-overlay prevention, and complete cleanup
- Release-aware rapid double press of the Copilot/Focus Key opens screenshot selection
  directly within 350 ms while rejecting held-key repeat and cancelling the deferred
  single-toggle action
- No screenshot, thumbnail, preview, clipboard content, pixel hash, window text, or
  sensitive metadata written to disk or diagnostics

Quick Pastes, account connection, Send to Phone, Network Analyzer, packaging, and every
later milestone remain unchanged and unimplemented. Send to Phone and Network Analyzer
remain disabled native controls that execute no code.

## Automated and instrumented results

| Check | Result |
| --- | --- |
| Application syntax gate | Pass on AutoHotkey 2.0.26 |
| Complete Milestone 1 regression suite | Pass: 85 assertions |
| Complete Milestone 2 regression suite | Pass: 63 assertions; rapid model 16 ms; rapid events 1,031 ms; GDI delta 0 |
| Focused Milestone 3 suite | Pass: 205 assertions |
| Drag directions | Pass for left-to-right, right-to-left, top-to-bottom, bottom-to-top, and reverse diagonal |
| Monitor-spanning geometry | Pass for rectangles crossing a primary-monitor boundary |
| Negative virtual coordinates | Pass without clamping valid negative values to zero |
| DPI conversion | Pass for 96, 120, and 144 DPI (100%, 125%, and 150%) plus representative mixed-DPI physical layouts |
| Rapid Focus Key gesture | Pass: first press marked for deferred toggle, release required, held-key repeat distinguished, rapid second press marked for direct capture, 350 ms boundary enforced, and completed gesture reset |
| Image preview refinement | Pass: 44 assertions; borderless Olio chrome, compact owner-drawn header close, no metadata line, exact scan-line paint, direct capture preserved launcher/preview windows, and repeated GDI/USER/subclass cleanup |
| Captured dimensions and pixels | Pass for exact 3 × 2 dimensions and three representative 32-bit pixels across a color boundary |
| Clipboard bitmap | Pass: successful `CF_BITMAP` ownership transfer retained exact dimensions |
| Escape cancellation | Pass through the overlay `WM_KEYDOWN` path; clipboard sequence and complete `ClipboardAll` bytes unchanged |
| Empty/invalid selection | Pass; rejected before any clipboard access |
| Clipboard contention | Pass: three simulated open failures followed by success, persistent failure, and a real 180 ms cross-process lock followed by recovery |
| Launcher event suppression | Pass: mutation depth returned to zero, sequence marked, one deliberate Clipboard History entry retained without callback duplication |
| Overlay/focus cleanup | Pass after success, cancellation, and simulated process exit; overlay HWND destroyed, mouse capture and message handlers released, and exact prior focus target returned to the launcher callback |
| Repeated capture cleanup | Pass after warmup plus 75 capture/publish cycles: GDI 0, USER −1, handles 0, private bytes 0, working set 0 |
| Rapid repeated activation | Pass: 40 duplicate attempts in 26.099 ms, one unchanged overlay HWND, five destroy/recreate cycles without linear GDI/USER growth |
| Privacy and file output | Pass: before/after launcher-file snapshot identical; unique runtime clipboard marker absent from source, settings, logs, results, and local data; static file/network/shell/Snipping Tool scan clean |
| Process cleanup | Pass: clipboard-contention helper exited; no test or measurement process remained |

The focused suite prints content-free PASS/FAIL metadata to standard output. Its wrapper
redirects that stream only when required by the Windows command host and deletes the
temporary metadata files in `finally`. No redirected output contains clipboard content,
pixels, coordinates, window text, or hashes.

## Performance and resource measurements

Development machine: Windows 11, AutoHotkey 2.0.26, standard-user process, one physical
1920 × 1200 display at 144 DPI (150%). The real overlay measurement was warmed off-screen
to exclude AutoHotkey's one-time GUI/text initialization, then painted across the complete
physical virtual desktop. The isolated resident namespace used defaults, disabled logging,
and made no startup-registration change.

| Measurement | Result |
| --- | --- |
| Hidden resident idle CPU over 10 seconds | 0.0000% |
| Hidden resident working set | 17,489,920 bytes (16.68 MiB) |
| Hidden resident private bytes | 4,894,720 bytes (4.67 MiB) |
| Hidden resident handles | 172 |
| Hidden resident GDI / USER objects | 36 / 37 |
| Normal-operation helper processes | 0 |
| Activation to synchronously painted full overlay | 24.253 ms |
| 320 × 180 capture through clipboard completion | 26.700 ms |
| 1600 × 900 capture through clipboard completion | 50.643 ms |
| Real cancellation clipboard preservation | Exact; sequence and full bytes unchanged |
| Real overlay cleanup delta | GDI 0; USER 0 |
| Two representative captures after overlay | GDI 0; USER −2; handles 0; private bytes +20,480 |
| 75 repeated 8 × 8 capture/publish cycles | 1,243.504 ms total; GDI 0; USER −1; handles 0; private bytes 0; working set +4,096 |

The 35 MiB resident ceiling and 0.1% idle CPU ceiling remain satisfied. Only one monitor
was physically available, so the 1600 × 900 result is a representative large single-monitor
selection rather than a hardware-spanning capture. The measurement harness automatically
uses a two-monitor center-spanning rectangle when two monitors are present.

## Scaling, cancellation, and privacy verification

- Selection and capture geometry use physical virtual-screen coordinates under
  Per-Monitor V2 awareness; AutoHotkey GUI scaling is disabled for the overlay itself.
- Selection-feedback DIPs were verified at 96, 120, and 144 DPI. The available physical
  run exercised 144 DPI. Representative mixed-DPI layouts and negative origins passed the
  pure geometry suite; real mixed-DPI hardware was unavailable.
- Escape never calls `OpenClipboard`, `EmptyClipboard`, or `SetClipboardData`. Both the
  focused suite and real overlay measurement compared the complete prior clipboard.
- `ScreenshotManager.ahk` contains no file, encoder, stream, shell, Snipping Tool,
  network, database, logging, settings, or external-process call.
- The repository file snapshot was identical before and after captures. A runtime-only
  clipboard marker was absent from launcher source, local settings, logs, test results,
  and local data.
- Screenshot diagnostics contain only event/status tokens. Performance output contains
  durations, dimensions, and resource counts, never pixels, clipboard data, hashes,
  window text, or screen coordinates.

## Simple manual test checklist

> [!WARNING]
> Use only harmless screen content, such as a blank Notepad window or a simple Paint
> drawing. Do not expose passwords, private messages, financial information, personal
> photos, access tokens, or other sensitive material while testing screenshots or the
> clipboard.

Do not exit or restart a normal resident Olio Launcher for this checklist; restarting
would clear its memory-only Clipboard History.

1. Open Notepad, type `Harmless Olio screenshot test`, and copy it. Open the launcher,
   select **Screenshot**, then press Escape without dragging. Paste into Notepad and
   confirm the original text is still on the clipboard.
2. Open Screenshot again. Confirm the entire desktop dims, the pointer is a crosshair,
   the instructions are readable, and a bright border plus pixel dimensions appear while
   dragging.
3. Drag a harmless rectangle left-to-right and top-to-bottom. Open Paint and press Ctrl+V.
   Confirm the pasted image exactly matches the selected area.
4. Repeat while dragging right-to-left and bottom-to-top. Confirm the same area is captured
   correctly and no empty or inverted image appears.
5. If two monitors are available, start on one monitor and release on the other. Repeat
   with the secondary monitor arranged to the left or above the primary when practical.
   Confirm the selection border and Paint result span the monitor boundary correctly.
6. Open Screenshot and click without dragging. Confirm no clipboard change occurs and the
   launcher does not freeze or show a blank image.
7. Start a selection and press Escape during the drag. Paste again and confirm the item
   that was on the clipboard before the attempt is still exact.
8. Use only the keyboard to reach Screenshot: arrow to the tile and press Enter. Press
   Escape to cancel. Confirm focus returns to the application that was active before the
   launcher opened.
9. Return to a harmless application. Press and release the Focus Key twice very quickly.
   Confirm Screenshot opens directly without moving or closing an open launcher or image
   preview. Cancel and confirm both windows are still in the same place. Then choose the
   Screenshot tile and confirm that path does hide the launcher. While its overlay is active, press the Focus Key
   several more times and confirm only one overlay exists, the launcher does not appear
   over it, Escape still works, and nothing freezes.
10. Make at least 20 small harmless captures, pasting several into Paint. Confirm the
    launcher remains responsive, captures do not become blank, and no overlays remain.
11. After saving any unrelated work, test Windows display scaling at 100%, 125%, and 150%.
    If multiple monitors are available, give them different supported scaling values.
    Repeat normal and reverse drags and confirm the border follows the pointer exactly.
12. Before and after a capture, inspect Desktop, Pictures, Downloads, and any folder where
    Windows normally saves screenshots. Sort by **Date modified** and confirm no new PNG,
    JPEG, BMP, thumbnail, preview, cache, or temporary image file appears. The only image
    should be the one you manually paste into Paint; save it only if you choose.
13. Confirm each successful screenshot appears once as the newest image in Clipboard
    History. Confirm the page still shows at most ten scrollable entries, card activation
    restores/promotes without duplication and leaves the launcher open, Open is greyed for
    text and previews images from memory, Open sits immediately left of Delete at the
    bottom, source application is not shown, and Clear all remains beside the title.
14. Confirm Send to Phone and Network Analyzer remain dimmed and cannot be activated.

## Environmental cases not exercised

- A second physical monitor, a true negative-origin desktop, and real mixed-DPI monitor
  movement were unavailable. Their geometry and DPI math passed instrumented tests, but
  the manual hardware checklist remains required.
- Display disconnect/reconnect, docking, sleep/resume during an active selection,
  alternate taskbar edges, secure-desktop UAC prompts, protected/DRM video surfaces, and
  remote-desktop topology changes were not exercised in this run.
- Packaging and execution on a device without AutoHotkey belong to Milestone 8 and were
  not started.

## Reproduction

Run only when no normal resident Olio Launcher is active. The Milestone 3 suite and
measurement refuse to proceed when the production mutex exists rather than stopping it.

```powershell
$ahk = "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe"
& $ahk /ErrorStdOut .\OlioLauncher\tests\Milestone1Tests.ahk
& $ahk /ErrorStdOut .\OlioLauncher\tests\Milestone2Tests.ahk
& $ahk /ErrorStdOut .\OlioLauncher\tests\Milestone3Tests.ahk
& .\OlioLauncher\tests\Measure-Milestone3.ps1 -IdleSeconds 10
```

The measurement briefly dims the complete desktop once, automatically cancels without
changing the clipboard, performs small and representative large in-memory captures, then
starts and stops only its own hidden `.M3Measurement` launcher namespace.

## Exit gate

All Milestone 3 exit criteria pass on the available Windows 11 machine. Stop here for
product-owner review. Do not begin Milestone 4 or any later milestone without explicit
approval.
