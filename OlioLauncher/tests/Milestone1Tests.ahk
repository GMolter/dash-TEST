#Requires AutoHotkey v2.0.26
#Warn All, StdOut

#Include ..\src\FlatJson.ahk
#Include ..\src\Logging.ahk
#Include ..\src\SettingsManager.ahk
#Include ..\src\WindowsInterop.ahk
#Include ..\src\HotkeyManager.ahk
#Include ..\src\StartupManager.ahk
#Include ..\src\Navigation.ahk
#Include ..\src\TileRenderer.ahk
#Include ..\src\LauncherWindow.ahk

class Milestone1Tests {
    static Passed := 0

    static Assert(condition, message) {
        if !condition
            throw Error(message)
        this.Passed += 1
    }

    static Run() {
        parsed := FlatJson.Parse('{"name":"Olio\\Launcher","enabled":true,"width":360}')
        this.Assert(parsed["name"] = "Olio\Launcher", "JSON string escaping failed.")
        this.Assert(parsed["enabled"] = true, "JSON Boolean parsing failed.")
        this.Assert(parsed["width"] = 360, "JSON number parsing failed.")

        defaults := SettingsManager.Defaults()
        this.Assert(defaults["focusKey"] = "#+F23", "Unexpected default Focus Key.")
        this.Assert(defaults["startWithWindows"] = false, "Startup must default off.")
        this.Assert(defaults["loggingEnabled"] = false, "Logging must default off.")

        SettingsManager.Warnings := []
        invalid := Map("panelWidth", 9999, "focusKey", "", "alwaysOnTop", "yes")
        recovered := SettingsManager.Validate(invalid)
        this.Assert(recovered["panelWidth"] = 360, "Invalid panel width did not recover.")
        this.Assert(recovered["focusKey"] = "#+F23", "Invalid Focus Key did not recover.")
        this.Assert(recovered["alwaysOnTop"] = true, "Invalid Boolean did not recover.")
        this.Assert(SettingsManager.Warnings.Length = 3, "Expected three validation warnings.")

        serialized := SettingsManager.Serialize(defaults)
        roundTrip := FlatJson.Parse(serialized)
        this.Assert(roundTrip["openingMonitor"] = "active", "Settings round trip failed.")
        this.Assert(roundTrip["panelWidth"] = 360, "Numeric round trip failed.")
        trailingRejected := false
        try FlatJson.Parse("{} unexpected")
        catch
            trailingRejected := true
        this.Assert(trailingRejected, "Trailing JSON data was accepted.")

        originalDir := SettingsManager.SettingsDir
        originalPath := SettingsManager.SettingsPath
        testDir := A_ScriptDir "\generated-settings-" DllCall("GetCurrentProcessId", "uint")
        try {
            SettingsManager.SettingsDir := testDir
            SettingsManager.SettingsPath := testDir "\settings.json"
            SettingsManager.Values := defaults
            SettingsManager.Save()
            this.Assert(FileExist(SettingsManager.SettingsPath), "Atomic settings save produced no file.")
            saved := FlatJson.Parse(FileRead(SettingsManager.SettingsPath, "UTF-8"))
            this.Assert(saved["focusKey"] = "#+F23", "Saved settings could not be parsed.")
            FileDelete(SettingsManager.SettingsPath)
            FileAppend("{not-json", SettingsManager.SettingsPath, "UTF-8")
            loaded := SettingsManager.Load()
            this.Assert(loaded["panelWidth"] = 360, "Malformed settings did not recover.")
            this.Assert(SettingsManager.Warnings.Length = 1, "Malformed JSON warning was not recorded.")
        } finally {
            try FileDelete(SettingsManager.SettingsPath)
            try DirDelete(testDir)
            SettingsManager.SettingsDir := originalDir
            SettingsManager.SettingsPath := originalPath
        }

        startupCommand := StartupManager.Command()
        this.Assert(InStr(startupCommand, "--background") > 0, "Startup command is not background-safe.")
        this.Assert(InStr(startupCommand, A_AhkPath) > 0, "Source startup command omits AutoHotkey.")

        hotkeyCallback := (*) => 0
        hotkeyResult := HotkeyManager.Register("^!F24", hotkeyCallback)
        this.Assert(hotkeyResult.Ok, "Valid Focus Key registration failed.")
        HotkeyManager.Unregister()
        invalidHotkey := HotkeyManager.Register("DefinitelyNotAKey", hotkeyCallback)
        this.Assert(!invalidHotkey.Ok, "Invalid Focus Key was accepted.")

        originalValueName := StartupManager.ValueName
        StartupManager.ValueName := "OlioLauncher-M1-Test-" DllCall("GetCurrentProcessId", "uint")
        try {
            startupEnabled := StartupManager.Apply(true)
            this.Assert(startupEnabled.Ok, "Per-user startup registration failed.")
            this.Assert(RegRead(StartupManager.RegistryPath, StartupManager.ValueName) = StartupManager.Command(),
                "Per-user startup command did not round trip.")
            startupDisabled := StartupManager.Apply(false)
            this.Assert(startupDisabled.Ok, "Per-user startup removal failed.")
            removed := false
            try RegRead(StartupManager.RegistryPath, StartupManager.ValueName)
            catch
                removed := true
            this.Assert(removed, "Per-user startup value was not removed.")
        } finally {
            try RegDelete(StartupManager.RegistryPath, StartupManager.ValueName)
            StartupManager.ValueName := originalValueName
        }

        settings := SettingsManager.Defaults()
        window := LauncherWindow(settings, (*) => 0)
        this.Assert(!window.IsVisible(), "Launcher must be hidden before Show.")
        this.Assert(window.Buttons["sendToPhone"].Enabled = false, "Send to Phone must be disabled.")
        this.Assert(window.Buttons["networkAnalyzer"].Enabled = false, "Network Analyzer must be disabled.")
        this.Assert(window.Buttons["clipboard"].Enabled = true, "Foundation navigation must be enabled.")
        this.Assert(window.DesiredLogicalHeight = 286, "Compact panel height changed unexpectedly.")
        this.Assert(LauncherWindow.CenteredY(0, 1080, 286) = 397,
            "Panel is not vertically centered in its work area.")
        accents := Map()
        for key in ["clipboard", "screenshot", "quickPastes", "sendToPhone", "networkAnalyzer"]
            accents[TileRenderer.Tiles[window.Buttons[key].Hwnd].Accent] := true
        this.Assert(accents.Count = 5, "Tool accents must remain visually distinct.")
        settingsRect := Buffer(16, 0), clipboardRect := Buffer(16, 0)
        DllCall("GetWindowRect", "ptr", window.Buttons["settings"].Hwnd, "ptr", settingsRect)
        DllCall("GetWindowRect", "ptr", window.Buttons["clipboard"].Hwnd, "ptr", clipboardRect)
        settingsWidth := NumGet(settingsRect, 8, "int") - NumGet(settingsRect, 0, "int")
        clipboardWidth := NumGet(clipboardRect, 8, "int") - NumGet(clipboardRect, 0, "int")
        this.Assert(settingsWidth < clipboardWidth, "Settings must remain a compact utility pill.")
        settingsTile := TileRenderer.Tiles[window.Buttons["settings"].Hwnd]
        this.Assert(settingsTile.IconKind = "settings-2", "Settings must use Lucide settings-2 geometry.")
        this.Assert(settingsTile.Title = "Settings", "Settings pill must retain its visible label.")
        this.Assert(LauncherWindow.ShouldRestoreFocus(window.Buttons["clipboard"].Hwnd, window.Gui.Hwnd),
            "Launcher-owned focus was not recognized.")
        this.Assert(!LauncherWindow.ShouldRestoreFocus(0, window.Gui.Hwnd),
            "Unrelated foreground focus must not trigger restoration.")
        buttonStyle := DllCall("User32\GetWindowLongW", "ptr", window.Buttons["clipboard"].Hwnd, "int", -16, "uint")
        this.Assert((buttonStyle & 0xF) = 0xB,
            "Tool tile is not using BS_OWNERDRAW; style=" Format("0x{:X}", buttonStyle) ".")
        window.Gui.Show("NA x-10000 y-10000 w360 h600")
        DllCall("UpdateWindow", "ptr", window.Gui.Hwnd)
        Sleep(100)
        this.Assert(TileRenderer.LastDrawError = "", "Tile draw failed: " TileRenderer.LastDrawError)
        window.OnCommand(0, window.Buttons["quickPastes"].Hwnd, 0, window.Gui.Hwnd)
        this.Assert(window.CurrentView = "quickPastes", "Native tile WM_COMMAND did not activate its view.")
        window.Gui.Destroy()

        settings["lastSelected"] := "settings"
        settingsWindow := LauncherWindow(settings, (*) => 0)
        this.Assert(settingsWindow.CurrentView = "clipboard",
            "Settings must not receive initial launcher selection.")
        settingsWindow.Gui.Destroy()

        this.WriteResult("PASS", this.Passed " assertions")
        ExitApp(0)
    }

    static WriteResult(status, detail) {
        resultDir := A_ScriptDir "\results"
        DirCreate(resultDir)
        FileAppend(FormatTime(, "yyyy-MM-dd'T'HH:mm:ss") "`t" status "`t" detail "`n",
            resultDir "\milestone1-tests.tsv", "UTF-8")
    }
}

try Milestone1Tests.Run()
catch as testError {
    Milestone1Tests.WriteResult("FAIL", SubStr(RegExReplace(testError.Message, "[\r\n\t]", " "), 1, 200))
    ExitApp(1)
}
