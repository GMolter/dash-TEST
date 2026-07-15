# Milestone 2 troubleshooting

## The Copilot key does not toggle the panel

Exit other AutoHotkey probe scripts first. Verify `focusKey` is `#+F23`. Any registration
error appears in the panel status line. The launcher remains a standard-user process and
does not elevate itself.

## Windows Settings opens from the Copilot key

Confirm the Milestone 0 probe is not running with an old pass-through hook. The Milestone
1 Focus Key uses a non-pass-through AutoHotkey hotkey and suppresses F23 before Windows
receives the complete chord.

## A second panel or process appears

This is a defect. Capture the output of:

```powershell
Get-CimInstance Win32_Process -Filter "Name = 'AutoHotkey64.exe'" |
    Where-Object CommandLine -Like '*OlioLauncher.ahk*' |
    Select-Object ProcessId, CommandLine
```

Do not terminate unrelated AutoHotkey scripts. Olio Launcher uses a per-user named mutex
and deduplicated registered-message activation.

## Settings are invalid

The launcher uses defaults for malformed or out-of-range values and reports recovery in
the panel. Correct `%LOCALAPPDATA%\OlioLauncher\settings.json` while the launcher is
stopped. An invalid source is backed up before a subsequent launcher write.

## The panel cannot type into an elevated application

Windows integrity rules prevent a normal process from reliably injecting input into an
administrator-elevated target. The foundation does not silently elevate itself. No
Milestone 1 feature needs administrator access.

## A copied item does not appear

Open Clipboard History and check whether the status says capture is paused, excluded, or
oversized. Select Resume if capture is paused. Copies from a process listed in
`sensitiveApplications` are intentionally ignored when Windows exposes that process as
the clipboard owner. Text over 1 MiB and image data over 16 MiB are not retained.

Windows does not always identify the clipboard-owner application. In that case the Source
column displays `Unknown`; this is expected and the launcher does not guess from content
or window titles.

## Paste returns to the application but inserts nothing

Try Copy, then paste manually with Ctrl+V. A standard-user launcher cannot send input into
an administrator-elevated target. The launcher does not elevate itself to bypass this
Windows protection.

## Clipboard History vanished after exit

This is the intended privacy behavior. History lives only in process memory. Exiting from
the tray or restarting Windows destroys every retained text string, image buffer, and
preview bitmap.
