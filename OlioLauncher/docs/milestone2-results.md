# Milestone 2 Clipboard History results

Status: **Approved by the product owner; exit criteria pass. Milestone 3 has not begun.**

Run date: 2026-07-15 (America/Indianapolis)

Approval date: 2026-07-15 (America/Indianapolis)

## Implemented scope

- Event-driven Windows clipboard subscription with one-shot deferred capture and no
  polling loop
- Unicode `CF_UNICODETEXT`, legacy plain `CF_TEXT`, `CF_BITMAP`, `CF_DIB`, and `CF_DIBV5`
- In-memory text strings and normalized DIB buffers; no clipboard persistence or network
  path
- Ten most recent unpinned entries plus a separate ten-pin safety ceiling
- Consecutive direct-equivalence deduplication without stored hashes
- Safe card previews, content type, and local capture time; source application metadata is
  not displayed
- Text and image restoration by click or Enter, with in-place promotion and no duplicate;
  the compact launcher remains open
- A scrollable ten-entry card viewport, image-only Open immediately left of Delete,
  clear-with-confirmation, and keyboard activation; pause and pin behavior remain covered
  at the in-memory model level
- Owned native image preview using a copied memory-only DIB and `StretchDIBits`; Open is
  disabled for text and the preview closes with Escape without changing the clipboard
- Case-insensitive sensitive-application exclusions
- Bounded text/image allocation with content-free oversized status messages
- Explicit release of DIB buffers, global-memory allocations, preview `HBITMAP` handles,
  clipboard handles, and DCs

Dynamic Screenshot, Quick Pastes synchronization, Send to Phone, and Network Analyzer were
not implemented. Send to Phone and Network Analyzer remain disabled native buttons with no
action or network code.

## Automated and instrumented results

| Check | Result |
| --- | --- |
| Milestone 1 regression suite | Pass: 85 assertions |
| Milestone 2 focused suite | Pass: 63 assertions |
| Maximum history length | Pass: newest ten unpinned entries retained in correct order |
| Unicode and legacy plain text | Pass: external-process `CF_UNICODETEXT` and `CF_TEXT` callbacks captured accurately |
| Bitmap/image capture | Pass: external-process `CF_BITMAP` normalized to a 3 × 2 DIB |
| Consecutive deduplication | Pass for text and byte-equivalent DIB entries |
| Pinning | Pass: pinned entry survived unpinned eviction; unpin reapplied the ten-item cap |
| Pause/resume | Pass: paused copies ignored and capture resumed without restarting |
| Sensitive exclusions | Pass: executable matching is case-insensitive and excluded payloads are not retained |
| Oversized rejection | Pass for text over 1 MiB and DIB data over 16 MiB |
| Restore | Pass for exact Unicode text and image dimensions/first-pixel value |
| Launcher suppression | Pass: restored clipboard sequence and same-process owner were ignored |
| Clear and cleanup | Pass: every retained entry marked released and history emptied |
| Rapid model changes | Pass: 500 unique captures in 16 ms, final length ten |
| Rapid Windows events | Pass: 40 external clipboard writes handled in 1,078 ms, latest ten retained |
| GDI cleanup | Pass: one selected-image preview created and cleared; before/after delta 0 |
| Image Open preview | Pass: 44 isolated assertions for text/image enablement, themed borderless chrome, compact owner-drawn header close, no metadata line, exact native scan-line painting, direct-capture preservation, independent DIB lifetime, and repeated cleanup without GDI/USER growth |
| Payload file/log scan | Pass: a runtime-only marker was absent from repository, settings, logs, and test output |
| Test process cleanup | Pass: no test or helper process remains after each suite |

Tests print content-free PASS/FAIL metadata to standard output. They do not create a
clipboard test-results file. `ClipboardTestWriter.ahk` is instrumentation only and is not
included or invoked by normal launcher operation.

Reproduce from the repository root:

```powershell
$ahk = "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe"
Start-Process $ahk -ArgumentList @('/ErrorStdOut', 'OlioLauncher\tests\Milestone1Tests.ahk') -NoNewWindow -Wait
Start-Process $ahk -ArgumentList @('/ErrorStdOut', 'OlioLauncher\tests\Milestone2Tests.ahk') -NoNewWindow -Wait
& 'OlioLauncher\tests\Measure-Milestone2.ps1' -IdleSeconds 10
```

## Performance and resource measurements

Development-machine sample, hidden resident launcher, standard-user process:

| Measurement | Result |
| --- | --- |
| Idle CPU over 10 seconds | 0.0000% |
| Working set | 17,670,144 bytes (16.85 MiB) |
| Private bytes | 4,730,880 bytes (4.51 MiB) |
| Process handles | 170 |
| Resident GDI objects | 42 |
| Resident USER objects | 46 |
| Normal-operation helper processes | 0 |
| Selected-preview cleanup delta | 0 GDI objects |

The working set remains below the provisional 35 MiB ceiling and idle CPU remains below
0.1%. The rapid-event duration includes starting the external test writer and its deliberate
12 ms spacing; the resident launcher's UI remained responsive.

## Privacy verification

- `ClipboardManager.ahk` contains no file, database, cache, crash-report, or network API.
- Runtime entries store only strings or DIB buffers in the AutoHotkey process.
- Safe previews, comparison data, source application fields, clipboard text, and image
  pixels are never passed to `RedactedLogger` or `SettingsManager`.
- Direct equality is used for consecutive deduplication; no clipboard hash is retained.
- A unique runtime clipboard marker was scanned against launcher source/results plus
  `%LOCALAPPDATA%\OlioLauncher` settings and logs and was absent.
- The visual test copied Unicode text from Notepad and displayed an in-memory bitmap
  thumbnail without exposing clipboard source metadata.
- Static review found Send to Phone and Network Analyzer only in disabled UI definitions;
  neither has an action, database change, helper, or network call.

## Simple manual test checklist

Use only harmless test text and a small test picture. Do not copy a real password or other
sensitive information for this checklist.

1. Start Olio Launcher and open **Clipboard**.
2. Open Notepad, type `Hello from Olio ✓`, select it, and press Ctrl+C.
3. Open the launcher again. Confirm the text appears first, shows **Text**, and has a time.
4. In Paint, make a small colored drawing, select it, and press Ctrl+C. Confirm an **Image**
   row and a thumbnail appear in the launcher.
5. Select the text card and confirm **Open** is greyed out. Select the image card, choose
   **Open**, and confirm a larger preview appears with the Olio header, a compact header
   close control, and no pixel dimensions or “Memory only” line. Press Escape and confirm
   Clipboard History regains focus. Confirm no PNG, JPEG, BMP, thumbnail, cache, or
   temporary file was created.
6. Click the Notepad card. Confirm it moves to the top, the launcher stays open, and no
   duplicate card appears. Back in Notepad, press Ctrl+V and confirm the text is exact.
7. Copy eleven different harmless lines. Confirm only the latest ten appear, then use the
   mouse wheel and Up/Down to scroll through them without the launcher freezing.
8. If you use one of the default excluded password managers, copy only a harmless dummy
   value from it and confirm it is ignored. Never use a real credential for testing.
9. Select a row and choose **Delete**. Confirm only that row disappears.
10. Choose **Clear all**. First choose **No** and confirm nothing changes. Open it again,
    choose **Yes**, and confirm the list becomes empty.
11. Copy one harmless item, exit Olio Launcher from its tray icon, restart it, and confirm
    history is empty because it is memory-only.
12. Navigate using only arrows, Tab, Shift+Tab, Enter, and Escape. Confirm focus is visibly
    outlined and every Clipboard action is reachable.
13. Confirm **Send to Phone** and **Network Analyzer** are still dimmed and cannot be opened.

## Exit gate

All Milestone 2 exit criteria pass on the available Windows 11 development machine.
Unavailable advanced monitor, elevated-target, sleep/resume, and alternate-taskbar cases
remain in the roadmap regression matrix. Stop here for review; Milestone 3 Dynamic
Screenshot has not begun.
