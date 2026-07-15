#Requires AutoHotkey v2.0.26
#SingleInstance Off
#Warn All, StdOut
;@Ahk2Exe-SetMainIcon assets\olio.ico
Persistent

DllCall("SetProcessDpiAwarenessContext", "ptr", -4, "ptr") ; PER_MONITOR_AWARE_V2

#Include src\FlatJson.ahk
#Include src\Logging.ahk
#Include src\SettingsManager.ahk
#Include src\WindowsInterop.ahk
#Include src\InstanceCoordinator.ahk
#Include src\HotkeyManager.ahk
#Include src\StartupManager.ahk
#Include src\ClipboardManager.ahk
#Include src\Navigation.ahk
#Include src\TileRenderer.ahk
#Include src\ClipboardRenderer.ahk
#Include src\LauncherWindow.ahk
#Include src\App.ahk

mode := A_Args.Length ? A_Args[1] : ""
if mode = "--syntax-check"
    ExitApp(0)
OlioApp.Start(mode)
