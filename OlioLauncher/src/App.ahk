class OlioApp {
    static Window := 0
    static Settings := 0
    static Clipboard := 0
    static PendingActivation := false
    static FocusCallback := 0

    static Start(mode := "") {
        activation := (*) => this.OnSecondaryActivation()
        instanceNamespace := mode = "--visual-test" ? ".VisualTest" : ""
        if !InstanceCoordinator.BecomePrimary(activation, instanceNamespace)
            ExitApp(0)

        this.Settings := SettingsManager.Load()
        RedactedLogger.Configure(this.Settings["loggingEnabled"])
        RedactedLogger.Write("app-start", "primary")
        for warning in SettingsManager.Warnings
            RedactedLogger.Write("settings-warning", warning)

        startup := StartupManager.Apply(this.Settings["startWithWindows"])
        RedactedLogger.Write("startup-registration", startup.Status)

        this.Clipboard := ClipboardManager(this.Settings)
        this.Window := LauncherWindow(this.Settings, (key) => this.OnNavigate(key),
            mode = "--visual-test", this.Clipboard)
        this.Clipboard.ChangedCallback := (status) => this.Window.OnClipboardHistoryChanged(status)
        this.Clipboard.Start()
        this.FocusCallback := (*) => this.Toggle()
        hotkeyResult := HotkeyManager.Register(this.Settings["focusKey"], this.FocusCallback)
        if !hotkeyResult.Ok && this.Settings["focusKey"] != "#+F23" {
            fallback := HotkeyManager.Register("#+F23", this.FocusCallback)
            if fallback.Ok
                hotkeyResult := {Ok: true, Status: "Configured Focus Key failed; using #+F23"}
        }
        status := hotkeyResult.Status
        if SettingsManager.Warnings.Length
            status .= " | Settings recovered: " SettingsManager.Warnings.Length
        if !startup.Ok
            status .= " | Startup registration failed"
        this.Window.SetStatus(status)
        RedactedLogger.Write("focus-key-registration", hotkeyResult.Ok ? "ok" : "error")
        this.ConfigureTray()

        if mode != "--background" || this.PendingActivation
            this.Window.Show()
    }

    static OnSecondaryActivation(*) {
        if IsObject(this.Window)
            this.Toggle()
        else
            this.PendingActivation := true
        return 0
    }

    static Toggle(*) {
        if IsObject(this.Window)
            this.Window.Toggle()
    }

    static OnNavigate(key) {
        try {
            SettingsManager.Update("lastSelected", key)
            RedactedLogger.Write("navigation", key)
        } catch as settingsError {
            RedactedLogger.Write("settings-write", "error")
            this.Window.SetStatus("Settings write failed; defaults remain active")
        }
    }

    static ConfigureTray() {
        A_IconTip := "Olio Launcher"
        try {
            if A_IsCompiled
                TraySetIcon(A_ScriptFullPath, 1)
            else
                TraySetIcon(LauncherWindow.BrandIconPath())
        }
        A_TrayMenu.Delete()
        A_TrayMenu.Add("Open / Hide", (*) => this.Toggle())
        A_TrayMenu.Add()
        A_TrayMenu.Add("Exit", (*) => this.Shutdown())
        A_TrayMenu.Default := "Open / Hide"
    }

    static Shutdown(*) {
        RedactedLogger.Write("app-stop", "user")
        if IsObject(this.Clipboard)
            this.Clipboard.Shutdown()
        HotkeyManager.Unregister()
        ExitApp(0)
    }
}
