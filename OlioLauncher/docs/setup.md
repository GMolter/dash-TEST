# Milestone 5 setup and operation

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

- Copilot key / default Focus Key: press `LWin+LShift+F23` once to show or hide the panel;
  press and release it twice within 350 ms to open Dynamic Screenshot directly
- Up/Down: move between enabled navigation buttons
- Enter: select the focused button
- Escape: hide the panel and restore the prior foreground window
- Tray menu **Open / Hide**: toggle the panel
- Tray menu **Exit**: unregister the Focus Key and end the process

On the Clipboard History page:

- Use the mouse wheel or Up/Down to scroll through as many as ten clipboard cards.
- Click a card or focus it and press Enter to restore it to the clipboard. The same entry
  moves to the top without creating a duplicate, and the launcher stays open.
- Tab and Shift+Tab move through Clear all, the card list, Open, Delete, and Back. Enter
  activates the focused action.
- Open is greyed out for text. For an image, select its card and choose Open to show a
  larger native preview. Press Escape or use the compact header close control to return to
  Clipboard History. The preview intentionally omits pixel dimensions and storage text.
- Delete removes the selected card.
- Clear all always asks for confirmation, with No selected by default.

Send to Phone and Network Analyzer are disabled controls. Dynamic Screenshot is active.
Secure account connection is available from Settings, but Quick Pastes remains a
placeholder and executes no synchronization, content fetch, display, copy, paste, or
cache code.

## Connect an Olio account

1. Open **Settings** in the launcher.
2. Enter a recognizable device name and the exact HTTPS origin supplied by the Olio
   Workstation operator, such as `https://workstation.example.com`. Paths, HTTP, embedded
   credentials, localhost names, and host changes are rejected.
3. Choose **Connect Olio Account**. The launcher opens the authorization page in the
   default browser and shows the same short display code.
4. Sign in through the normal Workstation sign-in screen if necessary. Confirm the device
   name and code, then explicitly approve or deny.
5. Return to launcher Settings. Successful approval reports **Connected**. It does not
   make Quick Pastes available during Milestone 5.

The request expires after 10 minutes. Polling occurs at most every 3 seconds and stops on
approval, denial, expiry, cancellation, failure, or success. **Cancel authentication**
invalidates the pending request. **Disconnect Olio Account** requires confirmation,
revokes the server device, and then deletes the protected local credential. Workstation
Profile Settings provides a separate confirmed revoke action.

## Dynamic Screenshot

1. Open Olio Launcher and select **Screenshot** with the mouse, or focus it with the
   arrow keys and press Enter.
2. The launcher hides and the complete Windows desktop dims. The pointer becomes a
   crosshair.
3. Hold the left mouse button, drag around the harmless screen area you want, and release.
   Dragging left, right, up, down, or across monitors is supported.
4. Paste the result into Paint or another image-capable application with Ctrl+V.
5. Press Escape before releasing to cancel. Cancellation does not change any clipboard
   format or content.

After a successful capture, open Clipboard History to see the image as the newest
memory-only item. The screenshot is added once even though Windows also reports a
clipboard-change event. Existing pause and image-size limits still apply. You can also
start at step 2 without opening the panel: press and release the Copilot/Focus Key twice
within 350 ms. This direct path leaves the launcher and an open image preview exactly where
they are behind the selection overlay. Selecting Screenshot from the launcher remains the
only path that hides the launcher before selection.

The capture is a native in-memory Windows bitmap. Olio Launcher does not start Snipping
Tool, encode an image, create a thumbnail or preview file, save to a temporary folder,
or transmit pixels. If another program temporarily locks the clipboard, the launcher
retries briefly and then reports a safe, content-free error. Empty selections are ignored.
The prior application regains focus after success, cancellation, or failure.

For a nontechnical safety checklist covering reverse dragging, multiple monitors, DPI
scaling, repeated captures, keyboard use, Paint, and no-file verification, see
[milestone3-results.md](milestone3-results.md#simple-manual-test-checklist).

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
- `clipboardPaused`: Boolean; default `false`
- `sensitiveApplications`: semicolon-separated executable names; defaults to
  `KeePass.exe;KeePassXC.exe;1Password.exe;Bitwarden.exe`
- `lastSelected`: `clipboard`, `screenshot`, `quickPastes`, or `settings`
- `openingMonitor`: `active` or `primary`
- `openingPosition`: currently `right`
- `deviceId`: non-secret stable version-4 UUID created with Windows CNG
- `deviceName`: safe user-visible launcher name, 1 through 80 characters
- `workstationUrl`: configured HTTPS Workstation origin; no path or credentials
- `connectedDeviceName` and `connectedAt`: non-sensitive connection display metadata

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

The device credential is not in `settings.json`. It is stored under the current Windows
user's Windows Credential Manager as an Olio Launcher generic credential. Do not export,
copy, screenshot, or include that entry in support diagnostics. Pairing secrets live only
in process memory until the request reaches a terminal state.

Clipboard History itself never creates a file. Its text, image buffers, previews, source
application, and comparisons exist only in process memory and disappear when the launcher
exits. The current limits are 1 MiB per text allocation and 16 MiB per image allocation;
oversized content is skipped with a content-free status message.
