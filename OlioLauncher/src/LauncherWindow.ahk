class LauncherWindow {
    __New(settings, navigateCallback, visualTestMode := false, clipboardManager := 0) {
        this.Settings := settings
        this.NavigateCallback := navigateCallback
        this.ClipboardManager := clipboardManager
        this.PreviousForeground := 0
        ; Settings is a utility, not the launcher's default destination.
        this.CurrentView := settings["lastSelected"] = "settings"
            ? "clipboard" : settings["lastSelected"]
        this.EnabledButtons := []
        this.Buttons := Map()
        this.ButtonKeysByHwnd := Map()
        this.HomeControls := []
        this.PageKey := ""
        this.DesiredLogicalHeight := 286
        this.HasVisibleStatus := false
        this.AutoCloseOnDeactivate := !visualTestMode
        this.PreviewWindow := 0
        this.PreviewPriorAutoClose := this.AutoCloseOnDeactivate
        this.LastPreviewError := ""
        this.DirectScreenshotActive := false
        this.DirectScreenshotPriorAutoClose := this.AutoCloseOnDeactivate

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

        logoOptions := "x16 y10 w40 h40"
        if A_IsCompiled
            logoOptions .= " Icon1"
        this.Logo := this.Gui.AddPicture(logoOptions, LauncherWindow.BrandIconPath())

        ; The logo carries the Olio brand; the adjacent label names this app.
        this.Gui.SetFont("s11 bold c818CF8", "Segoe UI Variable Text")
        this.Wordmark := this.Gui.AddText("x62 y18 w150 h28 +0x200", "Launcher")

        settingsButton := this.Gui.Add("Custom", "ClassButton x232 y14 w112 h36 0x5401000B", "Settings")
        this.Buttons["settings"] := settingsButton
        this.ButtonKeysByHwnd[settingsButton.Hwnd] := "settings"
        TileRenderer.RegisterSettingsButton(settingsButton, 0xFBBF24)
        this.HomeControls.Push(settingsButton)
        this.Gui.SetFont("s9 bold cF8FAFC", "Segoe UI Variable Text")
        this.SettingsLabel := this.Gui.AddText(
            "x272 y16 w62 h32 +0x200 +0x100 Background0B1220", "Settings")
        this.SettingsLabel.OnEvent("Click", (*) => this.Activate("settings"))
        this.HomeControls.Push(this.SettingsLabel)

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
            this.HomeControls.Push(button)
            if definition.Enabled
                this.EnabledButtons.Push(button)
        }
        this.EnabledButtons.Push(settingsButton)

        this.PageDefinitions := Map(
            "clipboard", {Title: "Clipboard History", Subtitle: "History will appear here.", Accent: 0x38BDF8},
            "screenshot", {Title: "Dynamic Screenshot", Subtitle: "Drag to select an area.", Accent: 0x8B5CF6},
            "quickPastes", {Title: "Quick Pastes", Subtitle: "Connected pastes will appear here.", Accent: 0x34D399},
            "settings", {Title: "Settings", Subtitle: "Launcher preferences will appear here.", Accent: 0xFBBF24}
        )
        this.BackButton := this.Gui.Add("Custom",
            "ClassButton x232 y14 w112 h36 Hidden 0x5401000B", "Back to tools")
        this.ButtonKeysByHwnd[this.BackButton.Hwnd] := "__back"
        TileRenderer.RegisterUtilityButton(this.BackButton, "Back", "arrow-left",
            0x818CF8, true, false)
        this.Gui.SetFont("s9 bold cF8FAFC", "Segoe UI Variable Text")
        this.BackLabel := this.Gui.AddText(
            "x272 y16 w62 h32 +0x200 +0x100 Background0B1220 Hidden", "Back")
        this.BackLabel.OnEvent("Click", (*) => this.ShowHome())

        this.Gui.SetFont("s16 bold cF8FAFC", "Segoe UI Variable Text")
        this.PageTitle := this.Gui.AddText("x16 y62 w328 h34 +0x200 Hidden", "")
        this.Gui.SetFont("s10 c94A3B8", "Segoe UI Variable Text")
        this.PageSubtitle := this.Gui.AddText("x16 y124 w328 h60 +Wrap Hidden", "")
        this.PageControls := [this.BackButton, this.BackLabel, this.PageTitle, this.PageSubtitle]
        this.CreateClipboardControls()

        this.Gui.SetFont("s8 cFCA5A5", "Segoe UI Variable Text")
        this.StatusText := this.Gui.AddText("x16 y278 w328 h28 +Wrap Hidden", "")

        this.Gui.OnEvent("Close", (*) => this.Hide(true))
        this.Gui.OnEvent("Escape", (*) => this.HandleEscape())
        this.Navigation := Navigation(this.Gui, this.EnabledButtons, (*) => this.HandleEscape())
        this.NavigationContext := (*) => WinActive("ahk_id " this.Gui.Hwnd)
            && this.PageKey != "clipboard"
        this.LeftHandler := (*) => this.Navigation.MoveDirectional(-1, 0)
        this.RightHandler := (*) => this.Navigation.MoveDirectional(1, 0)
        this.UpHandler := (*) => this.Navigation.MoveDirectional(0, -1)
        this.DownHandler := (*) => this.Navigation.MoveDirectional(0, 1)
        this.EnterHandler := (*) => this.Navigation.ActivateFocused()
        HotIf(this.NavigationContext)
        Hotkey("Left", this.LeftHandler)
        Hotkey("Right", this.RightHandler)
        Hotkey("Up", this.UpHandler)
        Hotkey("Down", this.DownHandler)
        Hotkey("Enter", this.EnterHandler)
        HotIf()
        this.ClipboardEnterContext := (*) => WinActive("ahk_id " this.Gui.Hwnd)
            && this.PageKey = "clipboard"
        this.ClipboardEnterHandler := (*) => this.ActivateClipboardFocused()
        HotIf(this.ClipboardEnterContext)
        Hotkey("Enter", this.ClipboardEnterHandler)
        HotIf()
        this.Activate(this.CurrentView, false)

        this.ActivateHandler := ObjBindMethod(this, "OnWindowActivate")
        this.DpiHandler := ObjBindMethod(this, "OnDpiChanged")
        this.CommandHandler := ObjBindMethod(this, "OnCommand")
        this.ClipboardMouseHandler := ObjBindMethod(this, "OnClipboardListMouseUp")
        OnMessage(0x0006, this.ActivateHandler)
        OnMessage(0x02E0, this.DpiHandler)
        OnMessage(0x0111, this.CommandHandler)
        OnMessage(0x0202, this.ClipboardMouseHandler) ; WM_LBUTTONUP
    }

    CreateClipboardControls() {
        this.ClipboardControls := []
        this.Gui.SetFont("s9 c94A3B8", "Segoe UI Variable Text")
        this.ClipboardStatus := this.Gui.AddText(
            "x16 y102 w328 h28 +0x200 Hidden", "History is empty")
        this.ClipboardControls.Push(this.ClipboardStatus)

        this.ClipboardClearButton := this.AddClipboardButton(
            "x238 y62 w106 h34 Hidden", "Clear all", 0xF87171)
        this.ButtonKeysByHwnd[this.ClipboardClearButton.Hwnd] := "__clip_clear"
        this.Gui.SetFont("s9 cE2E8F0", "Segoe UI Variable Text")
        this.ClipboardList := this.Gui.Add("Custom",
            "ClassListBox x16 y130 w328 h290 Hidden Background020617 cE2E8F0 0x50211051")
        ClipboardRenderer.Register(this.ClipboardList, this.ClipboardManager)
        this.ClipboardControls.Push(this.ClipboardList)

        this.ClipboardOpenButton := this.AddClipboardButton(
            "x128 y438 w104 h42 Hidden", "Open", 0x38BDF8)
        this.ButtonKeysByHwnd[this.ClipboardOpenButton.Hwnd] := "__clip_open"
        TileRenderer.SetEnabled(this.ClipboardOpenButton, false)

        this.ClipboardDeleteButton := this.AddClipboardButton(
            "x240 y438 w104 h42 Hidden", "Delete", 0xFB7185)
        this.ButtonKeysByHwnd[this.ClipboardDeleteButton.Hwnd] := "__clip_delete"

        this.ClipboardActionControls := [this.BackButton, this.ClipboardClearButton,
            this.ClipboardList, this.ClipboardOpenButton, this.ClipboardDeleteButton]
    }

    AddClipboardButton(options, title, accent) {
        button := this.Gui.Add("Custom", "ClassButton " options " 0x5001000B", title)
        TileRenderer.Register(button, title, "", accent, true)
        this.ClipboardControls.Push(button)
        return button
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

    IsVisible() {
        try return DllCall("IsWindowVisible", "ptr", this.Gui.Hwnd)
        catch
            return false
    }

    static CenteredY(areaTop, areaBottom, height) {
        return areaTop + Max(0, Floor(((areaBottom - areaTop) - height) / 2))
    }

    static BrandIconPath() {
        if A_IsCompiled
            return A_ScriptFullPath
        candidates := [A_ScriptDir "\assets\olio.ico", A_ScriptDir "\..\assets\olio.ico"]
        for candidate in candidates {
            if FileExist(candidate)
                return candidate
        }
        return candidates[1]
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
        requestedHeight := this.PageKey = "clipboard" ? 500
            : (this.HasVisibleStatus ? 318 : this.DesiredLogicalHeight)
        height := Min(requestedHeight, workHeight)
        y := LauncherWindow.CenteredY(area.Top, area.Bottom, height)
        x := area.Right - width
        this.Gui.Show("x" x " y" y " w" width " h" height)
        DllCall("RedrawWindow", "ptr", this.Gui.Hwnd, "ptr", 0, "ptr", 0,
            "uint", 0x0001 | 0x0004 | 0x0080 | 0x0100)
        TileRenderer.RefreshAll()
        this.RaiseUtilityLabels()
        if this.Buttons.Has(this.CurrentView) && this.Buttons[this.CurrentView].Enabled
            this.Buttons[this.CurrentView].Focus()
    }

    Hide(restoreFocus := true) {
        if !this.IsVisible()
            return
        this.CloseClipboardPreview(false)
        foreground := DllCall("GetForegroundWindow", "ptr")
        launcherOwnedFocus := LauncherWindow.ShouldRestoreFocus(foreground, this.Gui.Hwnd)
        this.Gui.Hide()
        this.ShowHome(false)
        if restoreFocus && launcherOwnedFocus
            WindowsInterop.RestoreForeground(this.PreviousForeground)
    }

    PrepareScreenshotCapture(hideLauncher := true) {
        if !hideLauncher {
            this.DirectScreenshotActive := true
            this.DirectScreenshotPriorAutoClose := this.AutoCloseOnDeactivate
            this.AutoCloseOnDeactivate := false
            return DllCall("GetForegroundWindow", "ptr")
        }
        previous := this.PreviousForeground
        if this.IsVisible() {
            this.Gui.Hide()
            this.ShowHome(false)
        }
        return previous
    }

    RestoreAfterScreenshot(previousForeground) {
        if this.DirectScreenshotActive {
            this.DirectScreenshotActive := false
            this.AutoCloseOnDeactivate := this.DirectScreenshotPriorAutoClose
        }
        if previousForeground && DllCall("IsWindow", "ptr", previousForeground) {
            WindowsInterop.RestoreForeground(previousForeground)
            return
        }
        this.Show()
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
        if notify {
            if key != "screenshot"
                this.ShowPage(key)
            this.NavigateCallback.Call(key)
        }
    }

    ShowPage(key) {
        if !this.PageDefinitions.Has(key)
            return
        page := this.PageDefinitions[key]
        for control in this.HomeControls
            control.Visible := false
        this.StatusText.Visible := false
        this.PageTitle.Text := page.Title
        this.PageTitle.SetFont("s16 bold c" Format("{:06X}", page.Accent),
            "Segoe UI Variable Text")
        this.PageSubtitle.Text := page.Subtitle
        for control in this.PageControls
            control.Visible := true
        for control in this.ClipboardControls
            control.Visible := false
        this.PageKey := key
        if key = "clipboard" {
            this.PageSubtitle.Visible := false
            for control in this.ClipboardControls
                control.Visible := true
            this.Navigation.Controls := this.ClipboardActionControls
            this.RefreshClipboardHistory()
            if IsObject(this.ClipboardManager) && this.ClipboardManager.Entries.Length
                this.ClipboardList.Focus()
            else
                this.ClipboardClearButton.Focus()
        } else {
            this.Navigation.Controls := [this.BackButton]
            this.BackButton.Focus()
        }
        this.ResizeForCurrentView()
        TileRenderer.RefreshAll()
        this.RaiseUtilityLabels()
    }

    ShowHome(focusSelected := true) {
        this.CloseClipboardPreview(false)
        if IsObject(this.ClipboardManager)
            this.ClipboardManager.ReleasePreviews()
        for control in this.ClipboardControls
            control.Visible := false
        for control in this.PageControls
            control.Visible := false
        for control in this.HomeControls
            control.Visible := true
        this.StatusText.Visible := this.HasVisibleStatus
        this.PageKey := ""
        this.Navigation.Controls := this.EnabledButtons
        this.ResizeForCurrentView()
        if focusSelected && this.Buttons.Has(this.CurrentView)
            && this.Buttons[this.CurrentView].Enabled
            this.Buttons[this.CurrentView].Focus()
        TileRenderer.RefreshAll()
        this.RaiseUtilityLabels()
    }

    ResizeForCurrentView() {
        if !this.IsVisible()
            return
        area := WindowsInterop.ForegroundWorkArea(this.Settings["openingMonitor"] = "primary")
        dpi := DllCall("GetDpiForWindow", "ptr", this.Gui.Hwnd, "uint")
        if !dpi
            dpi := area.Dpi
        width := Round(this.Settings["panelWidth"] * dpi / 96)
        logicalHeight := this.PageKey = "clipboard" ? 500
            : (this.HasVisibleStatus ? 318 : this.DesiredLogicalHeight)
        height := Min(logicalHeight, area.Bottom - area.Top)
        y := LauncherWindow.CenteredY(area.Top, area.Bottom, height)
        x := area.Right - width
        this.Gui.Show("x" x " y" y " w" width " h" height)
    }

    OnClipboardHistoryChanged(status) {
        if this.PageKey = "clipboard"
            this.RefreshClipboardHistory(status)
    }

    RefreshClipboardHistory(status := "") {
        selected := this.SelectedClipboardIndex()
        DllCall("SendMessageW", "ptr", this.ClipboardList.Hwnd,
            "uint", 0x0184, "uptr", 0, "ptr", 0) ; LB_RESETCONTENT
        entries := IsObject(this.ClipboardManager) ? this.ClipboardManager.Entries : []
        for entry in entries {
            accessible := (entry.Kind = "text" ? "Text: " entry.SafePreview(160)
                : "Image " entry.Width " by " entry.Height)
                . ", " entry.DisplayTime
            if entry.Pinned
                accessible .= ", pinned"
            DllCall("SendMessageW", "ptr", this.ClipboardList.Hwnd,
                "uint", 0x0180, "uptr", 0, "str", accessible, "ptr") ; LB_ADDSTRING
        }
        if entries.Length {
            selected := Min(Max(selected, 1), entries.Length)
            DllCall("SendMessageW", "ptr", this.ClipboardList.Hwnd,
                "uint", 0x0186, "uptr", selected - 1, "ptr", 0) ; LB_SETCURSEL
        }
        dpi := DllCall("GetDpiForWindow", "ptr", this.Gui.Hwnd, "uint")
        if !dpi
            dpi := 96
        DllCall("SendMessageW", "ptr", this.ClipboardList.Hwnd,
            "uint", 0x01A0, "uptr", 0, "ptr", Round(98 * dpi / 96)) ; LB_SETITEMHEIGHT
        countText := entries.Length " item" (entries.Length = 1 ? "" : "s")
        if status = "oversized-text"
            countText := "Text was too large and was not saved"
        else if status = "oversized-image" || status = "invalid-image"
            countText := "Image was too large or unsupported"
        else if status = "excluded"
            countText := "Copy ignored for a sensitive application"
        else if IsObject(this.ClipboardManager) && this.ClipboardManager.Paused
            countText := "Capture paused"
        this.ClipboardStatus.Text := countText
        DllCall("InvalidateRect", "ptr", this.ClipboardList.Hwnd, "ptr", 0, "int", true)
        this.UpdateClipboardOpenState()
        TileRenderer.RefreshAll()
    }

    SelectedClipboardIndex() {
        if !IsObject(this.ClipboardList)
            return 0
        selected := DllCall("SendMessageW", "ptr", this.ClipboardList.Hwnd,
            "uint", 0x0188, "uptr", 0, "ptr", 0, "ptr") ; LB_GETCURSEL
        return selected < 0 || selected > 10000 ? 0 : selected + 1
    }

    UpdateClipboardOpenState() {
        index := this.SelectedClipboardIndex()
        enabled := IsObject(this.ClipboardManager) && index
            && index <= this.ClipboardManager.Entries.Length
            && this.ClipboardManager.Entries[index].Kind = "image"
        TileRenderer.SetEnabled(this.ClipboardOpenButton, enabled)
        return enabled
    }

    OpenClipboardPreview() {
        index := this.SelectedClipboardIndex()
        if !IsObject(this.ClipboardManager) || !index
            return false
        entry := this.ClipboardManager.Entries[index]
        if entry.Kind != "image" || !IsObject(entry.Dib)
            return false
        details := this.ClipboardManager.ValidateDib(entry.Dib)
        if !details.Ok
            return false
        this.CloseClipboardPreview(false)
        this.PreviewPriorAutoClose := this.AutoCloseOnDeactivate
        this.LastPreviewError := ""
        this.AutoCloseOnDeactivate := false
        this.Gui.Opt("+Disabled")
        try {
            this.PreviewWindow := ClipboardPreviewWindow(this.Gui, entry, details,
                (*) => this.OnClipboardPreviewClosed())
            return true
        } catch as previewError {
            this.PreviewWindow := 0
            this.Gui.Opt("-Disabled")
            this.AutoCloseOnDeactivate := this.PreviewPriorAutoClose
            this.LastPreviewError := previewError.Message
            this.ClipboardStatus.Text := "Image preview could not be opened"
            return false
        }
    }

    OnClipboardPreviewClosed() {
        this.PreviewWindow := 0
        try this.Gui.Opt("-Disabled")
        this.AutoCloseOnDeactivate := this.PreviewPriorAutoClose
        if this.IsVisible() {
            DllCall("SetForegroundWindow", "ptr", this.Gui.Hwnd)
            if this.ClipboardOpenButton.Enabled
                this.ClipboardOpenButton.Focus()
            else
                this.ClipboardList.Focus()
        }
    }

    CloseClipboardPreview(restoreParent := true) {
        if !IsObject(this.PreviewWindow)
            return
        preview := this.PreviewWindow
        this.PreviewWindow := 0
        preview.Close(false)
        try this.Gui.Opt("-Disabled")
        this.AutoCloseOnDeactivate := this.PreviewPriorAutoClose
        if restoreParent && this.IsVisible()
            DllCall("SetForegroundWindow", "ptr", this.Gui.Hwnd)
    }

    ActivateClipboardFocused() {
        focused := DllCall("GetFocus", "ptr")
        if focused = this.ClipboardList.Hwnd {
            this.ActivateClipboardSelection()
            return
        }
        for control in this.ClipboardActionControls {
            if control.Hwnd = focused {
                DllCall("SendMessageW", "ptr", focused, "uint", 0x00F5,
                    "uptr", 0, "ptr", 0) ; BM_CLICK
                return
            }
        }
    }

    ConfirmClearClipboard() {
        if !IsObject(this.ClipboardManager) || !this.ClipboardManager.Entries.Length
            return
        this.AutoCloseOnDeactivate := false
        this.Gui.Opt("+OwnDialogs")
        try answer := MsgBox("Clear every clipboard-history item?`n`nThis cannot be undone.",
            "Clear clipboard history", "YesNo Icon! Default2")
        finally this.AutoCloseOnDeactivate := true
        if answer = "Yes"
            this.ClipboardManager.Clear()
    }

    ActivateClipboardSelection(index := 0) {
        if !index
            index := this.SelectedClipboardIndex()
        if !IsObject(this.ClipboardManager) || !index
            return
        if !this.ClipboardManager.RestoreAndPromote(index) {
            this.ClipboardStatus.Text := "Clipboard is temporarily unavailable"
            return
        }
        DllCall("SendMessageW", "ptr", this.ClipboardList.Hwnd,
            "uint", 0x0186, "uptr", 0, "ptr", 0) ; promoted item is selected
    }

    OnClipboardListMouseUp(wParam, lParam, msg, hwnd) {
        if this.PageKey != "clipboard" || hwnd != this.ClipboardList.Hwnd
            return
        hit := DllCall("SendMessageW", "ptr", hwnd, "uint", 0x01A9,
            "uptr", 0, "ptr", lParam, "ptr") ; LB_ITEMFROMPOINT
        if ((hit >> 16) & 0xFFFF)
            return
        index := (hit & 0xFFFF) + 1
        if !IsObject(this.ClipboardManager) || index > this.ClipboardManager.Entries.Length
            return
        DllCall("SendMessageW", "ptr", hwnd, "uint", 0x0186,
            "uptr", index - 1, "ptr", 0)
        this.UpdateClipboardOpenState()
        SetTimer(() => this.ActivateClipboardSelection(index), -1)
    }

    DeleteClipboardSelection() {
        index := this.SelectedClipboardIndex()
        if IsObject(this.ClipboardManager) && index
            this.ClipboardManager.Delete(index)
    }

    RaiseUtilityLabels() {
        for label in [this.SettingsLabel, this.BackLabel] {
            if !label.Visible
                continue
            DllCall("SetWindowPos", "ptr", label.Hwnd, "ptr", 0,
                "int", 0, "int", 0, "int", 0, "int", 0,
                "uint", 0x0001 | 0x0002 | 0x0010)
            DllCall("RedrawWindow", "ptr", label.Hwnd, "ptr", 0, "ptr", 0,
                "uint", 0x0001 | 0x0100)
        }
    }

    HandleEscape() {
        if this.PageKey
            this.ShowHome()
        else
            this.Hide(true)
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
        try guiHwnd := this.Gui.Hwnd
        catch
            return
        if hwnd != guiHwnd || !lParam
            return
        notification := (wParam >> 16) & 0xFFFF
        if lParam = this.ClipboardList.Hwnd && notification = 1 {
            this.UpdateClipboardOpenState()
            return 0
        }
        if notification = 0 && this.ButtonKeysByHwnd.Has(lParam) {
            key := this.ButtonKeysByHwnd[lParam]
            if key = "__back" {
                this.ShowHome()
                return 0
            }
            switch key {
                case "__clip_clear": this.ConfirmClearClipboard()
                case "__clip_open": this.OpenClipboardPreview()
                case "__clip_delete": this.DeleteClipboardSelection()
                default:
                    if this.Buttons[key].Enabled
                        this.Activate(key)
            }
            return 0
        }
    }

    OnWindowActivate(wParam, lParam, msg, hwnd) {
        try guiHwnd := this.Gui.Hwnd
        catch
            return
        if hwnd != guiHwnd || !this.AutoCloseOnDeactivate
            return
        if (wParam & 0xFFFF) = 0 && this.IsVisible()
            SetTimer((*) => this.Hide(false), -100)
    }

    OnDpiChanged(wParam, lParam, msg, hwnd) {
        try guiHwnd := this.Gui.Hwnd
        catch
            return
        if hwnd != guiHwnd
            return
        left := NumGet(lParam, 0, "int"), top := NumGet(lParam, 4, "int")
        right := NumGet(lParam, 8, "int"), bottom := NumGet(lParam, 12, "int")
        DllCall("SetWindowPos", "ptr", hwnd, "ptr", 0, "int", left, "int", top,
            "int", right - left, "int", bottom - top, "uint", 0x0014)
        return 0
    }
}
