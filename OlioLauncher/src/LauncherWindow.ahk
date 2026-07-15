class LauncherWindow {
    __New(settings, navigateCallback, visualTestMode := false) {
        this.Settings := settings
        this.NavigateCallback := navigateCallback
        this.PreviousForeground := 0
        ; Settings is a utility, not the launcher's default destination.
        this.CurrentView := settings["lastSelected"] = "settings"
            ? "clipboard" : settings["lastSelected"]
        this.EnabledButtons := []
        this.Buttons := Map()
        this.ButtonKeysByHwnd := Map()
        this.DesiredLogicalHeight := 286
        this.HasVisibleStatus := false

        options := "-Caption +Border"
        if !visualTestMode
            options .= " +ToolWindow"
        if settings["alwaysOnTop"]
            options .= " +AlwaysOnTop"
        this.Gui := Gui(options, "Olio Launcher")
        this.Gui.BackColor := "020617"
        this.Gui.MarginX := 16
        this.Gui.MarginY := 14
        this.ApplyWorkstationWindowStyle()

        ; Workstation wordmark treatment: compact uppercase indigo/cyan accent.
        this.Gui.SetFont("s11 bold c818CF8", "Segoe UI Variable Text")
        this.Gui.AddText("x16 y18 w220 h28 +0x200", "OLIO")

        settingsButton := this.Gui.Add("Custom", "ClassButton x232 y14 w112 h36 0x5001000B", "Settings")
        this.Buttons["settings"] := settingsButton
        this.ButtonKeysByHwnd[settingsButton.Hwnd] := "settings"
        TileRenderer.RegisterSettingsButton(settingsButton, 0xFBBF24)

        definitions := [
            {Key: "clipboard", Accessible: "Clipboard History", Title: "Clipboard", Subtitle: "", Accent: 0x38BDF8, X: 16, Y: 64, W: 160, H: 64, Enabled: true},
            {Key: "screenshot", Accessible: "Dynamic Screenshot", Title: "Screenshot", Subtitle: "", Accent: 0x8B5CF6, X: 184, Y: 64, W: 160, H: 64, Enabled: true},
            {Key: "quickPastes", Accessible: "Quick Pastes", Title: "Quick Pastes", Subtitle: "", Accent: 0x34D399, X: 16, Y: 136, W: 328, H: 64, Enabled: true},
            {Key: "sendToPhone", Accessible: "Send to Phone — Planning", Title: "Send to Phone", Subtitle: "Planning", Accent: 0xF59E0B, X: 16, Y: 208, W: 160, H: 56, Enabled: false},
            {Key: "networkAnalyzer", Accessible: "Network Analyzer — Coming later", Title: "Network", Subtitle: "Later", Accent: 0x64748B, X: 184, Y: 208, W: 160, H: 56, Enabled: false}
        ]

        for definition in definitions {
            button := this.Gui.Add("Custom", "ClassButton x" definition.X " y" definition.Y
                " w" definition.W " h" definition.H " 0x5001000B", definition.Accessible)
            this.Buttons[definition.Key] := button
            this.ButtonKeysByHwnd[button.Hwnd] := definition.Key
            TileRenderer.Register(button, definition.Title, definition.Subtitle,
                definition.Accent, definition.Enabled)
            if definition.Enabled
                this.EnabledButtons.Push(button)
        }
        this.EnabledButtons.Push(settingsButton)

        this.Gui.SetFont("s8 cFCA5A5", "Segoe UI Variable Text")
        this.StatusText := this.Gui.AddText("x16 y278 w328 h28 +Wrap Hidden", "")

        this.Gui.OnEvent("Close", (*) => this.Hide(true))
        this.Gui.OnEvent("Escape", (*) => this.Hide(true))
        this.Navigation := Navigation(this.Gui, this.EnabledButtons, (*) => this.Hide(true))
        this.NavigationContext := (*) => WinActive("ahk_id " this.Gui.Hwnd)
        this.UpHandler := (*) => this.Navigation.MoveFocus(-1)
        this.DownHandler := (*) => this.Navigation.MoveFocus(1)
        this.EnterHandler := (*) => this.Navigation.ActivateFocused()
        HotIf(this.NavigationContext)
        Hotkey("Up", this.UpHandler)
        Hotkey("Down", this.DownHandler)
        Hotkey("Enter", this.EnterHandler)
        HotIf()
        this.Activate(this.CurrentView, false)

        this.ActivateHandler := ObjBindMethod(this, "OnWindowActivate")
        this.DpiHandler := ObjBindMethod(this, "OnDpiChanged")
        this.CommandHandler := ObjBindMethod(this, "OnCommand")
        OnMessage(0x0006, this.ActivateHandler)
        OnMessage(0x02E0, this.DpiHandler)
        OnMessage(0x0111, this.CommandHandler)
    }

    ApplyWorkstationWindowStyle() {
        try {
            cornerPreference := 2 ; DWMWCP_ROUND
            DllCall("dwmapi\DwmSetWindowAttribute", "ptr", this.Gui.Hwnd, "uint", 33,
                "int*", &cornerPreference, "uint", 4)
            borderColor := TileRenderer.ColorRef(0x1E293B)
            DllCall("dwmapi\DwmSetWindowAttribute", "ptr", this.Gui.Hwnd, "uint", 34,
                "uint*", &borderColor, "uint", 4)
        }
    }

    IsVisible() => DllCall("IsWindowVisible", "ptr", this.Gui.Hwnd)

    static CenteredY(areaTop, areaBottom, height) {
        return areaTop + Max(0, Floor(((areaBottom - areaTop) - height) / 2))
    }

    static ShouldRestoreFocus(currentForeground, launcherHwnd) {
        return currentForeground && WindowsInterop.RootWindow(currentForeground) = launcherHwnd
    }

    Show() {
        if this.CurrentView = "settings"
            this.Activate("clipboard", false)
        area := WindowsInterop.ForegroundWorkArea(this.Settings["openingMonitor"] = "primary")
        if area.Foreground != this.Gui.Hwnd
            this.PreviousForeground := area.Foreground
        width := Round(this.Settings["panelWidth"] * area.Dpi / 96)
        workHeight := area.Bottom - area.Top
        requestedHeight := this.HasVisibleStatus ? 318 : this.DesiredLogicalHeight
        height := Min(requestedHeight, workHeight)
        y := LauncherWindow.CenteredY(area.Top, area.Bottom, height)
        x := area.Right - width
        this.Gui.Show("x" x " y" y " w" width " h" height)
        DllCall("RedrawWindow", "ptr", this.Gui.Hwnd, "ptr", 0, "ptr", 0,
            "uint", 0x0001 | 0x0004 | 0x0080 | 0x0100)
        TileRenderer.RefreshAll()
        if this.Buttons.Has(this.CurrentView) && this.Buttons[this.CurrentView].Enabled
            this.Buttons[this.CurrentView].Focus()
    }

    Hide(restoreFocus := true) {
        if !this.IsVisible()
            return
        foreground := DllCall("GetForegroundWindow", "ptr")
        launcherOwnedFocus := LauncherWindow.ShouldRestoreFocus(foreground, this.Gui.Hwnd)
        this.Gui.Hide()
        if restoreFocus && launcherOwnedFocus
            WindowsInterop.RestoreForeground(this.PreviousForeground)
    }

    Toggle() {
        if this.IsVisible()
            this.Hide(true)
        else
            this.Show()
    }

    Activate(key, notify := true, *) {
        if !this.Buttons.Has(key) || !this.Buttons[key].Enabled
            key := "clipboard"
        this.CurrentView := key
        TileRenderer.SetSelected(this.Buttons[key].Hwnd)
        if notify
            this.NavigateCallback.Call(key)
    }

    SetStatus(text) {
        routine := InStr(text, "Focus Key:") = 1 && !InStr(text, "error") && !InStr(text, "failed")
        if routine {
            this.HasVisibleStatus := false
            this.StatusText.Visible := false
            return
        }
        this.HasVisibleStatus := true
        this.StatusText.Text := text
        this.StatusText.Visible := true
    }

    OnCommand(wParam, lParam, msg, hwnd) {
        if hwnd != this.Gui.Hwnd || !lParam
            return
        notification := (wParam >> 16) & 0xFFFF
        if notification = 0 && this.ButtonKeysByHwnd.Has(lParam) {
            key := this.ButtonKeysByHwnd[lParam]
            if this.Buttons[key].Enabled
                this.Activate(key)
            return 0
        }
    }

    OnWindowActivate(wParam, lParam, msg, hwnd) {
        if hwnd != this.Gui.Hwnd || !this.Settings["closeOnFocusLost"]
            return
        if (wParam & 0xFFFF) = 0 && this.IsVisible()
            SetTimer((*) => this.Hide(false), -100)
    }

    OnDpiChanged(wParam, lParam, msg, hwnd) {
        if hwnd != this.Gui.Hwnd
            return
        left := NumGet(lParam, 0, "int"), top := NumGet(lParam, 4, "int")
        right := NumGet(lParam, 8, "int"), bottom := NumGet(lParam, 12, "int")
        DllCall("SetWindowPos", "ptr", hwnd, "ptr", 0, "int", left, "int", top,
            "int", right - left, "int", bottom - top, "uint", 0x0014)
        return 0
    }
}
