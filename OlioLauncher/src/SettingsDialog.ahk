class SettingsTooltips {
    __New(gui) {
        this.Gui := gui
        this.Buffers := []
        this.Tools := []
        this.Descriptions := []
        this.Hwnd := DllCall("CreateWindowExW", "uint", 0x8,
            "str", "tooltips_class32", "ptr", 0, "uint", 0x80000003,
            "int", 0, "int", 0, "int", 0, "int", 0,
            "ptr", gui.Hwnd, "ptr", 0, "ptr", 0, "ptr", 0, "ptr")
        if this.Hwnd {
            DllCall("SendMessageW", "ptr", this.Hwnd, "uint", 0x0418,
                "ptr", 0, "ptr", 380)
            DllCall("SetWindowPos", "ptr", this.Hwnd, "ptr", -1,
                "int", 0, "int", 0, "int", 0, "int", 0,
                "uint", 0x0001 | 0x0002 | 0x0010)
        }
    }

    Add(control, text) {
        if !this.Hwnd
            return
        textBuffer := Buffer((StrLen(text) + 1) * 2, 0)
        StrPut(text, textBuffer, "UTF-16")
        toolSize := A_PtrSize = 8 ? 72 : 48
        tool := Buffer(toolSize, 0)
        NumPut("uint", toolSize, tool, 0)
        NumPut("uint", 0x0011, tool, 4) ; TTF_IDISHWND | TTF_SUBCLASS
        NumPut("ptr", this.Gui.Hwnd, tool, 8)
        NumPut("uptr", control.Hwnd, tool, A_PtrSize = 8 ? 16 : 12)
        NumPut("ptr", textBuffer.Ptr, tool, A_PtrSize = 8 ? 48 : 36)
        this.Buffers.Push(textBuffer)
        this.Tools.Push(tool)
        this.Descriptions.Push(text)
        DllCall("SendMessageW", "ptr", this.Hwnd, "uint", 0x0432,
            "ptr", 0, "ptr", tool.Ptr)
    }

    Destroy() {
        if this.Hwnd
            try DllCall("DestroyWindow", "ptr", this.Hwnd)
        this.Hwnd := 0
        this.Tools := []
        this.Buffers := []
        this.Descriptions := []
    }
}

class SettingsRenderer {
    static Items := Map()
    static HoveredHwnd := 0

    static Register(control, kind, title, subtitle := "", accent := 0x38BDF8,
        state := false, selected := false, enabled := true) {
        TileRenderer.Initialize()
        this.Items[control.Hwnd] := {
            Kind: kind, Title: title, Subtitle: subtitle, Accent: accent,
            State: !!state, Selected: !!selected, Enabled: !!enabled
        }
        control.Enabled := enabled
    }

    static SetState(control, state) {
        if !this.Items.Has(control.Hwnd)
            return
        item := this.Items[control.Hwnd]
        item.State := !!state
        control.Text := item.Title " — " (item.State ? "On" : "Off")
        DllCall("InvalidateRect", "ptr", control.Hwnd, "ptr", 0, "int", true)
    }

    static SetSelected(control, selected) {
        if !this.Items.Has(control.Hwnd)
            return
        this.Items[control.Hwnd].Selected := !!selected
        DllCall("InvalidateRect", "ptr", control.Hwnd, "ptr", 0, "int", true)
    }

    static SetEnabled(control, enabled) {
        if !this.Items.Has(control.Hwnd)
            return
        this.Items[control.Hwnd].Enabled := !!enabled
        control.Enabled := enabled
        DllCall("InvalidateRect", "ptr", control.Hwnd, "ptr", 0, "int", true)
    }

    static Unregister(control) {
        hwnd := IsObject(control) ? control.Hwnd : control
        if this.Items.Has(hwnd)
            this.Items.Delete(hwnd)
        if this.HoveredHwnd = hwnd
            this.HoveredHwnd := 0
    }

    static DrawItem(drawInfo) {
        if NumGet(drawInfo, 0, "uint") != 4
            return false
        hwndOffset := A_PtrSize = 8 ? 24 : 20
        itemHwnd := NumGet(drawInfo, hwndOffset, "ptr")
        if !this.Items.Has(itemHwnd)
            return false
        item := this.Items[itemHwnd]
        hdc := NumGet(drawInfo, hwndOffset + A_PtrSize, "ptr")
        rectOffset := hwndOffset + (A_PtrSize * 2)
        left := NumGet(drawInfo, rectOffset, "int")
        top := NumGet(drawInfo, rectOffset + 4, "int")
        right := NumGet(drawInfo, rectOffset + 8, "int")
        bottom := NumGet(drawInfo, rectOffset + 12, "int")
        state := NumGet(drawInfo, 16, "uint")
        disabled := !item.Enabled || (state & 0x4)
        pressed := state & 0x1
        focused := state & 0x10
        hovered := itemHwnd = this.HoveredHwnd
        dpi := TileRenderer.WindowDpi(itemHwnd)
        accent := ThemeManager.HighContrast ? ThemeManager.Color("Text") : item.Accent
        TileRenderer.FillRect(hdc, left, top, right, bottom,
            ThemeManager.Color("Window"))

        switch item.Kind {
            case "toggle":
                background := disabled ? ThemeManager.Color("DisabledSurface")
                    : pressed ? ThemeManager.Color("SurfacePressed")
                    : hovered ? ThemeManager.Color("SurfaceHover")
                    : ThemeManager.Color("Surface")
                TileRenderer.FillRounded(hdc, left, top, right, bottom,
                    Round(12 * dpi / 96), background)
                border := focused ? accent : hovered
                    ? ThemeManager.Color("Border") : ThemeManager.Color("MutedBorder")
                TileRenderer.StrokeRounded(hdc, left + 1, top + 1, right - 1,
                    bottom - 1, Round(12 * dpi / 96), border,
                    focused ? Max(2, Round(2 * dpi / 96)) : 1)
                this.DrawToggle(hdc, item, left, top, right, bottom, dpi, disabled,
                    accent)
            case "tab":
                background := item.Selected ? ThemeManager.Color("SurfaceSelected")
                    : hovered ? ThemeManager.Color("SurfaceHover")
                    : ThemeManager.Color("Window")
                TileRenderer.FillRounded(hdc, left, top, right, bottom,
                    Round(10 * dpi / 96), background)
                if item.Selected
                    TileRenderer.FillRounded(hdc, left + Round(12 * dpi / 96),
                        bottom - Max(3, Round(3 * dpi / 96)),
                        right - Round(12 * dpi / 96), bottom,
                        Max(2, Round(2 * dpi / 96)), accent)
                this.DrawCentered(hdc, item.Title, left, top, right, bottom, dpi,
                    item.Selected ? accent : ThemeManager.Color("MutedText"), 600)
                if focused
                    TileRenderer.StrokeRounded(hdc, left + 1, top + 1, right - 1,
                        bottom - 1, Round(10 * dpi / 96), accent,
                        Max(2, Round(2 * dpi / 96)))
            case "more":
                background := hovered ? ThemeManager.Color("SurfaceHover")
                    : ThemeManager.Color("Window")
                TileRenderer.FillRounded(hdc, left, top, right, bottom,
                    Round(12 * dpi / 96), background)
                this.DrawCentered(hdc, "•••", left, top - Round(4 * dpi / 96),
                    right, bottom, dpi, ThemeManager.Color("MutedText"), 600)
                if focused
                    TileRenderer.StrokeRounded(hdc, left + 1, top + 1, right - 1,
                        bottom - 1, Round(12 * dpi / 96), accent,
                        Max(2, Round(2 * dpi / 96)))
            default:
                background := disabled ? ThemeManager.Color("DisabledSurface")
                    : pressed ? ThemeManager.Color("SurfacePressed")
                    : item.Selected ? accent
                    : hovered ? ThemeManager.Color("SurfaceHover")
                    : ThemeManager.Color("Surface")
                TileRenderer.FillRounded(hdc, left, top, right, bottom,
                    Round(10 * dpi / 96), background)
                textColor := disabled ? ThemeManager.Color("DisabledText")
                    : item.Selected ? ThemeManager.Color("Window")
                    : ThemeManager.Color("Text")
                this.DrawCentered(hdc, item.Title, left, top, right, bottom,
                    dpi, textColor, 600)
                border := focused ? accent : ThemeManager.Color("MutedBorder")
                TileRenderer.StrokeRounded(hdc, left + 1, top + 1, right - 1,
                    bottom - 1, Round(10 * dpi / 96), border,
                    focused ? Max(2, Round(2 * dpi / 96)) : 1)
        }
        return true
    }

    static DrawToggle(hdc, item, left, top, right, bottom, dpi, disabled, accent) {
        titleFont := TileRenderer.CreateFont(10, 600, dpi)
        subtitleFont := TileRenderer.CreateFont(8, 400, dpi)
        textLeft := left + Round(16 * dpi / 96)
        textRight := right - Round(74 * dpi / 96)
        titleColor := disabled ? ThemeManager.Color("DisabledText")
            : ThemeManager.Color("Text")
        subtitleColor := disabled ? ThemeManager.Color("DisabledText")
            : ThemeManager.Color("MutedText")
        try {
            TileRenderer.DrawText(hdc, item.Title, titleFont, titleColor,
                textLeft, top + Round(8 * dpi / 96), textRight,
                top + Round(30 * dpi / 96))
            TileRenderer.DrawText(hdc, item.Subtitle, subtitleFont, subtitleColor,
                textLeft, top + Round(30 * dpi / 96), textRight,
                bottom - Round(5 * dpi / 96),
                0x00000010 | 0x00000800) ; DT_WORDBREAK | DT_NOPREFIX
        } finally {
            DllCall("DeleteObject", "ptr", titleFont)
            DllCall("DeleteObject", "ptr", subtitleFont)
        }
        switchWidth := Round(42 * dpi / 96)
        switchHeight := Round(23 * dpi / 96)
        switchRight := right - Round(16 * dpi / 96)
        switchLeft := switchRight - switchWidth
        switchTop := top + Floor((bottom - top - switchHeight) / 2)
        switchColor := item.State && !disabled ? accent
            : ThemeManager.Color("DisabledSurface")
        TileRenderer.FillRounded(hdc, switchLeft, switchTop, switchRight,
            switchTop + switchHeight, switchHeight, switchColor)
        knobSize := switchHeight - Round(6 * dpi / 96)
        knobLeft := item.State
            ? switchRight - knobSize - Round(3 * dpi / 96)
            : switchLeft + Round(3 * dpi / 96)
        TileRenderer.FillRounded(hdc, knobLeft,
            switchTop + Round(3 * dpi / 96), knobLeft + knobSize,
            switchTop + Round(3 * dpi / 96) + knobSize, knobSize,
            disabled ? ThemeManager.Color("DisabledText") : 0xFFFFFF)
    }

    static DrawCentered(hdc, text, left, top, right, bottom, dpi, color, weight) {
        font := TileRenderer.CreateFont(9, weight, dpi)
        try TileRenderer.DrawText(hdc, text, font, color, left, top, right, bottom,
            0x00000001 | 0x00000004 | 0x00000020 | 0x00000800)
        finally DllCall("DeleteObject", "ptr", font)
    }

    static OnMouseMove(hwnd) {
        if !this.Items.Has(hwnd) || !this.Items[hwnd].Enabled
            return
        if this.HoveredHwnd != hwnd {
            old := this.HoveredHwnd
            this.HoveredHwnd := hwnd
            if old
                DllCall("InvalidateRect", "ptr", old, "ptr", 0, "int", true)
            DllCall("InvalidateRect", "ptr", hwnd, "ptr", 0, "int", true)
        }
        tracking := Buffer(A_PtrSize = 8 ? 24 : 16, 0)
        NumPut("uint", tracking.Size, tracking, 0)
        NumPut("uint", 0x2, tracking, 4)
        NumPut("ptr", hwnd, tracking, 8)
        DllCall("TrackMouseEvent", "ptr", tracking)
    }

    static OnMouseLeave(hwnd) {
        if hwnd = this.HoveredHwnd {
            this.HoveredHwnd := 0
            DllCall("InvalidateRect", "ptr", hwnd, "ptr", 0, "int", true)
        }
    }
}

class SettingsDialog {
    static LogicalWidth := 620
    static LogicalHeight := 460

    __New(parentGui, settings, applyCallback, closedCallback := 0,
        testMode := false, connectionManager := 0) {
        this.ParentGui := parentGui
        this.Settings := settings
        this.ApplyCallback := applyCallback
        this.ClosedCallback := closedCallback
        this.ConnectionManager := connectionManager
        this.Closed := false
        this.TestMode := testMode
        this.Loading := true
        this.PendingSave := false
        this.RevertFailedSave := false
        this.CurrentSection := "general"
        this.AccessibleNames := Map()
        this.TextControls := []
        this.InputControls := []
        this.DrawnControls := []
        this.ActionCallbacks := Map()
        this.Pages := Map("general", [], "clipboard", [], "account", [], "advanced", [])
        this.Tabs := Map()
        this.ToggleValues := Map()
        this.ToggleControls := Map()
        this.AutoSaveTimer := ObjBindMethod(this, "AutoSave")
        this.Gui := Gui("", "Olio Launcher Settings")
        this.Gui.MarginX := 0
        this.Gui.MarginY := 0
        this.Gui.OnEvent("Close", (*) => this.Close())
        this.Gui.OnEvent("Escape", (*) => this.Close())
        this.CommandHandler := ObjBindMethod(this, "OnCommand")
        OnMessage(0x0111, this.CommandHandler)
        this.Tooltips := SettingsTooltips(this.Gui)
        this.CreateControls()
        this.LoadValues(settings)
        this.ApplyTheme()
        this.ShowSection("general")
        this.Show()
        this.Loading := false
    }

    CreateControls() {
        this.Gui.SetFont("s18 bold", "Segoe UI Variable Display")
        this.Heading := this.AddText("x24 y18 w260 h34", "Settings")
        this.Gui.SetFont("s9 norm", "Segoe UI Variable Text")
        this.Intro := this.AddText("x24 y50 w310 h22", "Changes save automatically.")

        for item in [
            {Key: "general", Text: "General", X: 24, W: 96},
            {Key: "clipboard", Text: "Clipboard & paste", X: 128, W: 152},
            {Key: "account", Text: "Account", X: 288, W: 94}
        ] {
            tab := this.AddDrawnButton("x" item.X " y76 w" item.W " h34",
                "tab", item.Text, "", 0x38BDF8, item.Text " settings")
            this.BindAction(tab, ObjBindMethod(this, "ShowSection", item.Key))
            this.Tabs[item.Key] := tab
        }
        this.MoreButton := this.AddDrawnButton("x564 y22 w32 h32",
            "more", "More", "", 0x818CF8, "More settings options")
        this.BindAction(this.MoreButton, (*) => this.ShowMoreMenu())
        this.Tooltips.Add(this.MoreButton, "More options")

        this.CreateGeneralPage()
        this.CreateClipboardPage()
        this.CreateAccountPage()
        this.CreateAdvancedPage()

        this.Status := this.AddText("x24 y410 w420 h30 +Wrap", "")
        this.CloseButton := this.AddDrawnButton("x500 y406 w96 h34",
            "action", "Close", "", 0x38BDF8, "Close Settings")
        this.BindAction(this.CloseButton, (*) => this.Close())
    }

    CreateGeneralPage() {
        page := "general"
        this.PageHeading(page, "General", "The essentials.")
        this.FocusKeyLabel := this.PageText(page, "x24 y166 w220 h20", "Focus Key")
        focusHelp := "Keyboard shortcut that opens or hides the launcher. Press it twice "
            . "quickly to start Dynamic Screenshot."
        this.FocusKeyEdit := this.PageControl(page,
            this.Gui.AddEdit("x24 y190 w242 h32", ""))
        this.Name(this.FocusKeyEdit, "Focus Key")
        this.Tooltips.Add(this.FocusKeyLabel, focusHelp)
        this.Tooltips.Add(this.FocusKeyEdit, focusHelp)
        this.TestFocusKeyButton := this.PageControl(page,
            this.AddDrawnButton("x278 y190 w150 h32", "action",
                "Check shortcut", "", 0x818CF8, "Check Focus Key availability"))
        this.BindAction(this.TestFocusKeyButton, (*) => this.TestFocusKey())
        this.ThemeLabel := this.PageText(page, "x448 y166 w148 h20", "Appearance")
        themeHelp := "Follow Windows uses your app light or dark preference. High "
            . "contrast always uses Windows system colors."
        this.ThemeList := this.PageControl(page,
            this.Gui.AddDropDownList("x448 y190 w148",
                ["Follow Windows", "Dark", "Light"]))
        this.Name(this.ThemeList, "Launcher appearance")
        this.Tooltips.Add(this.ThemeLabel, themeHelp)
        this.Tooltips.Add(this.ThemeList, themeHelp)

        this.StartWithWindowsCheck := this.CreateToggle(page,
            "x24 y238 w572 h62", "startWithWindows",
            "Open when I sign in",
            "Starts for your Windows user. Never requires administrator access.",
            "Starts Olio Launcher after you sign in using a per-user Windows startup entry.")
        this.ReducedMotionCheck := this.CreateToggle(page,
            "x24 y310 w572 h62", "reducedMotion",
            "Reduce motion",
            "Minimizes nonessential hover effects without disabling features.",
            "Reduces nonessential visual motion while keeping every feature available.")

        this.RegisterAutoSave(this.FocusKeyEdit)
        this.RegisterAutoSave(this.ThemeList, true)
    }

    CreateClipboardPage() {
        page := "clipboard"
        this.PageHeading(page, "Clipboard and paste", "Capture and selection behavior.")
        this.CloseOnFocusLostCheck := this.CreateToggle(page,
            "x24 y166 w276 h82", "closeOnFocusLost",
            "Hide when I click away",
            "Closes the launcher when another window becomes active.",
            "Hides the launcher when you click another window. The separate Settings "
            "window stays open.")
        this.HideOnClickAwayCheck := this.CloseOnFocusLostCheck
        this.CloseAfterSelectionCheck := this.CreateToggle(page,
            "x320 y166 w276 h82", "closeAfterSelection",
            "Hide after choosing",
            "Closes after a successful copy.",
            "Hides after a Clipboard History or Quick Paste item is copied successfully.")
        this.AutoPasteCheck := this.CreateToggle(page,
            "x24 y258 w276 h82", "autoPasteAfterSelection",
            "Paste automatically",
            "Only into the app active before the launcher.",
            "Copies the item, hides the launcher, and attempts to paste only into the "
            "previously active app. It never elevates.")
        this.ClipboardPausedCheck := this.CreateToggle(page,
            "x320 y258 w276 h82", "clipboardPaused",
            "Pause history",
            "Stops new capture; existing items still work.",
            "Stops new Clipboard History capture. Existing Clipboard History and Quick "
            "Paste items still work.")
        this.ClipboardNote := this.PageText(page, "x24 y354 w572 h38 +Wrap",
            "Automatic paste always fails safely: if Windows blocks the target, the item "
            "stays copied for manual paste.")
    }

    CreateAccountPage() {
        page := "account"
        this.PageHeading(page, "Olio account", "Protected device connection.")
        this.DeviceNameLabel := this.PageText(page, "x24 y166 w220 h20", "Device name")
        deviceHelp := "Name shown for this launcher in Olio Workstation. It does not "
            . "contain your account name or email."
        this.DeviceNameEdit := this.PageControl(page,
            this.Gui.AddEdit("x24 y190 w300 h32", ""))
        this.Name(this.DeviceNameEdit, "Olio Launcher device name")
        this.Tooltips.Add(this.DeviceNameLabel, deviceHelp)
        this.Tooltips.Add(this.DeviceNameEdit, deviceHelp)
        this.RegisterAutoSave(this.DeviceNameEdit)
        this.ConnectionStatus := this.PageText(page,
            "x24 y238 w572 h56 +Wrap", "Connect without entering your Olio password.")
        connectionHelp := "Connection uses one-time browser approval. The protected "
            . "device credential stays in Windows Credential Manager, not settings."
        this.Tooltips.Add(this.ConnectionStatus, connectionHelp)
        this.ConnectButton := this.PageControl(page,
            this.AddDrawnButton("x24 y306 w572 h38", "action",
                "Connect Olio account", "", 0x38BDF8, "Connect an Olio account"))
        this.CancelConnectionButton := this.PageControl(page,
            this.AddDrawnButton("x24 y306 w572 h38", "action",
                "Cancel connection", "", 0xF59E0B, "Cancel Olio account connection"))
        this.RetryConnectionButton := this.PageControl(page,
            this.AddDrawnButton("x24 y306 w276 h38", "action",
                "Retry", "", 0x38BDF8, "Retry Olio account connection"))
        this.DisconnectButton := this.PageControl(page,
            this.AddDrawnButton("x320 y306 w276 h38", "action",
                "Disconnect account", "", 0xF87171, "Disconnect Olio account"))
        this.BindAction(this.ConnectButton, (*) => this.StartConnection())
        this.BindAction(this.CancelConnectionButton,
            (*) => this.ConnectionManager.CancelPairing())
        this.BindAction(this.RetryConnectionButton,
            (*) => this.ConnectionManager.Retry())
        this.BindAction(this.DisconnectButton, (*) => this.ConfirmDisconnect())
        this.AccountNote := this.PageText(page, "x24 y358 w572 h36 +Wrap",
            "Disconnect is confirmed separately. Resetting settings never disconnects "
            "your account.")
    }

    CreateAdvancedPage() {
        page := "advanced"
        this.PageHeading(page, "Advanced", "Less common controls.")
        monitorHelp := "Active follows the app you were using. Primary uses the Windows "
            . "primary display. Remembered returns to the last display used."
        this.MonitorLabel := this.PageText(page, "x24 y166 w180 h20", "Open on")
        this.MonitorList := this.PageControl(page,
            this.Gui.AddDropDownList("x24 y190 w180",
                ["Active monitor", "Primary monitor", "Remembered monitor"]))
        this.Name(this.MonitorList, "Opening monitor")
        this.Tooltips.Add(this.MonitorLabel, monitorHelp)
        this.Tooltips.Add(this.MonitorList, monitorHelp)
        positionHelp := "Right edge uses the display work area. Remembered returns to "
            . "the last position where you moved the launcher."
        this.PositionLabel := this.PageText(page, "x220 y166 w180 h20", "Place it at")
        this.PositionList := this.PageControl(page,
            this.Gui.AddDropDownList("x220 y190 w180",
                ["Right edge", "Remembered position"]))
        this.Name(this.PositionList, "Opening position")
        this.Tooltips.Add(this.PositionLabel, positionHelp)
        this.Tooltips.Add(this.PositionList, positionHelp)
        this.PanelWidthLabel := this.PageText(page,
            "x416 y166 w180 h20", "Panel width")
        this.PanelWidthEdit := this.PageControl(page,
            this.Gui.AddEdit("x416 y190 w180 h32 Number", ""))
        this.Name(this.PanelWidthEdit, "Panel width from 280 through 640")
        this.Tooltips.Add(this.PanelWidthLabel,
            "Launcher width in logical pixels, from 280 through 640.")
        this.Tooltips.Add(this.PanelWidthEdit,
            "Launcher width in logical pixels, from 280 through 640.")

        this.AlwaysOnTopCheck := this.CreateToggle(page,
            "x24 y238 w276 h66", "alwaysOnTop",
            "Always on top", "Keeps the launcher above ordinary windows.",
            "Keeps the launcher visible above ordinary windows while it is open.")
        this.DiagnosticsCheck := this.CreateToggle(page,
            "x320 y238 w276 h66", "loggingEnabled",
            "Redacted diagnostics", "Saves only allowlisted status tokens.",
            "Never logs credentials, identities, clipboard or Quick Paste content, "
            "screenshots, emails, headers, or request bodies.")

        this.SensitiveLabel := this.PageText(page,
            "x24 y318 w320 h20", "Apps ignored by Clipboard History")
        exclusionsHelp := "Content copied while a listed executable is active is not "
            . "added to Clipboard History. Separate file names with semicolons."
        this.SensitiveEdit := this.PageControl(page,
            this.Gui.AddEdit("x24 y342 w420 h32", ""))
        this.Name(this.SensitiveEdit, "Apps ignored by Clipboard History")
        this.Tooltips.Add(this.SensitiveLabel, exclusionsHelp)
        this.Tooltips.Add(this.SensitiveEdit, exclusionsHelp)
        this.ResetButton := this.PageControl(page,
            this.AddDrawnButton("x456 y342 w140 h32", "action",
                "Reset settings", "", 0xF87171, "Reset launcher settings"))
        this.BindAction(this.ResetButton, (*) => this.ConfirmReset())
        this.Tooltips.Add(this.ResetButton, "Restores safe defaults while preserving "
            "the Olio account connection and protected credential.")

        this.RegisterAutoSave(this.MonitorList, true)
        this.RegisterAutoSave(this.PositionList, true)
        this.RegisterAutoSave(this.PanelWidthEdit)
        this.RegisterAutoSave(this.SensitiveEdit)
    }

    PageHeading(page, title, subtitle) {
        this.Gui.SetFont("s14 bold", "Segoe UI Variable Display")
        this.PageText(page, "x24 y118 w572 h28", title)
        this.Gui.SetFont("s9 norm", "Segoe UI Variable Text")
        this.PageText(page, "x24 y144 w572 h20", subtitle)
    }

    CreateToggle(page, options, key, title, subtitle, tooltip) {
        control := this.AddDrawnButton(options, "toggle", title, subtitle,
            0x38BDF8, title)
        this.PageControl(page, control)
        this.ToggleControls[key] := control
        this.BindAction(control, ObjBindMethod(this, "ToggleSetting", key, control))
        this.Tooltips.Add(control, tooltip)
        return control
    }

    AddDrawnButton(options, kind, title, subtitle, accent, accessibleName) {
        button := this.Gui.Add("Custom",
            "ClassButton " options " 0x5001000B", accessibleName)
        this.DrawnControls.Push(button)
        this.Name(button, accessibleName)
        SettingsRenderer.Register(button, kind, title, subtitle, accent)
        return button
    }

    BindAction(control, callback) {
        this.ActionCallbacks[control.Hwnd] := callback
    }

    OnCommand(wParam, lParam, msg, hwnd) {
        try guiHwnd := this.Gui.Hwnd
        catch
            return
        if hwnd != guiHwnd || !lParam || ((wParam >> 16) & 0xFFFF) != 0
            return
        if this.ActionCallbacks.Has(lParam) {
            this.ActionCallbacks[lParam].Call()
            return 0
        }
    }

    PageText(page, options, text) {
        control := this.AddText(options " Hidden", text)
        this.Pages[page].Push(control)
        return control
    }

    PageControl(page, control) {
        control.Visible := false
        this.Pages[page].Push(control)
        if control.Type = "Edit" || control.Type = "DropDownList"
            this.InputControls.Push(control)
        return control
    }

    AddText(options, text) {
        control := this.Gui.AddText(options, text)
        this.TextControls.Push(control)
        return control
    }

    Name(control, accessibleName) {
        this.AccessibleNames[control.Hwnd] := accessibleName
    }

    RegisterAutoSave(control, immediate := false) {
        control.OnEvent("Change", (*) => this.QueueAutoSave(immediate))
    }

    ToggleSetting(key, control, *) {
        this.ToggleValues[key] := !this.ToggleValues[key]
        SettingsRenderer.SetState(control, this.ToggleValues[key])
        this.QueueAutoSave(true)
    }

    LoadValues(settings) {
        this.Loading := true
        this.Settings := settings
        this.FocusKeyEdit.Value := settings["focusKey"]
        this.ThemeList.Choose(Map("system", 1, "dark", 2, "light", 3)[settings["theme"]])
        this.MonitorList.Choose(Map("active", 1, "primary", 2, "remembered", 3)[
            settings["openingMonitor"]])
        this.PositionList.Choose(settings["openingPosition"] = "remembered" ? 2 : 1)
        this.PanelWidthEdit.Value := settings["panelWidth"]
        this.SensitiveEdit.Value := settings["sensitiveApplications"]
        this.DeviceNameEdit.Value := settings.Has("deviceName")
            ? settings["deviceName"] : SubStr(A_ComputerName " Launcher", 1, 80)
        for key, control in this.ToggleControls {
            this.ToggleValues[key] := settings[key]
            SettingsRenderer.SetState(control, settings[key])
        }
        this.Status.Text := ""
        this.PendingSave := false
        this.RefreshConnectionControls()
        this.Loading := false
    }

    Candidate() {
        widthText := Trim(this.PanelWidthEdit.Value, " `t")
        if !RegExMatch(widthText, "^\d+$")
            return {Ok: false, Message: "Enter a panel width from 280 through 640."}
        width := Integer(widthText)
        if width < SettingsManager.MinimumPanelWidth
            || width > SettingsManager.MaximumPanelWidth
            return {Ok: false, Message: "Enter a panel width from 280 through 640."}
        exclusions := SettingsManager.NormalizeSensitiveApplications(
            this.SensitiveEdit.Value)
        if !exclusions.Ok
            return {Ok: false,
                Message: "Enter app file names ending in .exe, separated by semicolons."}
        deviceName := RegExReplace(Trim(this.DeviceNameEdit.Value), "\s+", " ")
        if StrLen(deviceName) < 1 || StrLen(deviceName) > 80
            || RegExMatch(deviceName, "[\x00-\x1F\x7F]")
            return {Ok: false, Message: "Enter a device name from 1 to 80 characters."}
        monitorValues := ["active", "primary", "remembered"]
        positionValues := ["right", "remembered"]
        themeValues := ["system", "dark", "light"]
        return {Ok: true, Values: Map(
            "focusKey", Trim(this.FocusKeyEdit.Value, " `t"),
            "startWithWindows", this.ToggleValues["startWithWindows"],
            "openingMonitor", monitorValues[this.MonitorList.Value],
            "openingPosition", positionValues[this.PositionList.Value],
            "panelWidth", width,
            "alwaysOnTop", this.ToggleValues["alwaysOnTop"],
            "closeOnFocusLost", this.ToggleValues["closeOnFocusLost"],
            "closeAfterSelection", this.ToggleValues["closeAfterSelection"],
            "autoPasteAfterSelection", this.ToggleValues["autoPasteAfterSelection"],
            "clipboardPaused", this.ToggleValues["clipboardPaused"],
            "sensitiveApplications", exclusions.Value,
            "theme", themeValues[this.ThemeList.Value],
            "reducedMotion", this.ToggleValues["reducedMotion"],
            "loggingEnabled", this.ToggleValues["loggingEnabled"],
            "deviceName", deviceName
        )}
    }

    QueueAutoSave(immediate := false) {
        if this.Loading || this.Closed
            return
        this.PendingSave := true
        this.RevertFailedSave := immediate
        try SetTimer(this.AutoSaveTimer, 0)
        if immediate
            this.AutoSave()
        else
            SetTimer(this.AutoSaveTimer, -350)
    }

    AutoSave(*) {
        if this.Loading || this.Closed || !this.PendingSave
            return true
        try SetTimer(this.AutoSaveTimer, 0)
        this.PendingSave := false
        revertFailedSave := this.RevertFailedSave
        this.RevertFailedSave := false
        candidate := this.Candidate()
        if !candidate.Ok {
            if revertFailedSave
                this.LoadValues(this.Settings)
            this.SetStatus(candidate.Message, true)
            return false
        }
        oldTheme := this.Settings["theme"]
        result := this.ApplyCallback.Call("save", candidate.Values)
        if !IsObject(result) || !result.Ok {
            if revertFailedSave
                this.LoadValues(this.Settings)
            this.SetStatus(IsObject(result) && result.HasOwnProp("Message")
                ? result.Message : "This change could not be saved.", true)
            return false
        }
        if result.HasOwnProp("Values") {
            this.Settings := result.Values
            if IsObject(this.ConnectionManager)
                this.ConnectionManager.Settings := result.Values
            if result.Values["theme"] != oldTheme {
                ThemeManager.Configure(result.Values)
                this.ApplyTheme()
            }
        }
        this.SetStatus("Saved")
        return true
    }

    TestFocusKey() {
        result := HotkeyManager.Validate(Trim(this.FocusKeyEdit.Value, " `t"))
        this.SetStatus(result.Ok ? "Shortcut is available."
            : "This shortcut is invalid, reserved, or unavailable.", !result.Ok)
    }

    ShowMoreMenu() {
        advancedMenu := Menu()
        advancedMenu.Add("Advanced settings", (*) => this.ShowSection("advanced"))
        advancedMenu.Show()
    }

    ConfirmReset() {
        this.Gui.Opt("+OwnDialogs")
        answer := MsgBox(
            "Reset launcher settings to safe defaults?`n`n"
            "Your Olio account connection and protected credential will be preserved.",
            "Reset Olio Launcher settings", "YesNo Icon! Default2")
        if answer != "Yes"
            return false
        result := this.ApplyCallback.Call("reset", Map())
        if !IsObject(result) || !result.Ok {
            this.SetStatus("Settings could not be reset. Nothing changed.", true)
            return false
        }
        ThemeManager.Configure(result.Values)
        this.LoadValues(result.Values)
        this.ApplyTheme()
        this.SetStatus("Reset complete. Your account connection was preserved.")
        return true
    }

    StartConnection() {
        if !IsObject(this.ConnectionManager)
            return false
        if this.PendingSave && !this.AutoSave()
            return false
        started := this.ConnectionManager.StartPairing(this.DeviceNameEdit.Value)
        this.RefreshConnectionControls()
        return started
    }

    ConfirmDisconnect() {
        if !IsObject(this.ConnectionManager) || !this.ConnectionManager.Credential
            return false
        this.Gui.Opt("+OwnDialogs")
        answer := MsgBox("Disconnect this Olio Launcher?`n`n"
            "Workstation access will be revoked and the protected local credential removed.",
            "Disconnect Olio account", "YesNo Icon! Default2")
        if answer = "Yes"
            return this.ConnectionManager.Disconnect()
        return false
    }

    OnConnectionChanged(*) {
        if !this.Closed
            this.RefreshConnectionControls()
    }

    RefreshConnectionControls() {
        manager := this.ConnectionManager
        state := IsObject(manager) ? manager.State : "unavailable"
        this.ConnectionStatus.Text := IsObject(manager) ? manager.Detail
            : "Account controls are unavailable in this isolated test window."
        waiting := state = "starting" || state = "waiting" || state = "exchanging"
        connected := state = "connected" || state = "checking"
            || state = "disconnecting"
        hasCredential := IsObject(manager) && manager.Credential
        hasPairing := IsObject(manager) && manager.RequestId && manager.PairingSecret
        recoveryPairing := hasPairing && !waiting
        recoveryCredential := hasCredential && !waiting && !connected
        accountVisible := this.CurrentSection = "account"
        this.ConnectButton.Visible := accountVisible && !waiting && !connected
            && !hasCredential && !hasPairing
        this.CancelConnectionButton.Visible := accountVisible
            && (waiting || recoveryPairing)
        this.RetryConnectionButton.Visible := accountVisible
            && (recoveryCredential || recoveryPairing)
        this.DisconnectButton.Visible := accountVisible
            && (connected || recoveryCredential)
        busy := IsObject(manager) && manager.RequestBusy
        for control in [this.ConnectButton, this.CancelConnectionButton,
            this.RetryConnectionButton, this.DisconnectButton]
            SettingsRenderer.SetEnabled(control, IsObject(manager) && !busy)
        this.DeviceNameEdit.Enabled := !waiting && !connected
        if recoveryPairing {
            this.RetryConnectionButton.Move(24, 306, 276, 38)
            this.CancelConnectionButton.Move(320, 306, 276, 38)
        } else if recoveryCredential {
            this.RetryConnectionButton.Move(24, 306, 276, 38)
            this.DisconnectButton.Move(320, 306, 276, 38)
        } else {
            this.ConnectButton.Move(24, 306, 572, 38)
            this.CancelConnectionButton.Move(24, 306, 572, 38)
            this.DisconnectButton.Move(24, 306, 572, 38)
        }
        if !this.Loading
            WindowsInterop.AnnounceStatus(this.ConnectionStatus)
    }

    ShowSection(section, *) {
        if !this.Pages.Has(section)
            section := "general"
        this.CurrentSection := section
        ; Avoid the old full-window theme pass and suppress intermediate layout paints.
        DllCall("SendMessageW", "ptr", this.Gui.Hwnd, "uint", 0x000B,
            "ptr", 0, "ptr", 0)
        for pageName, controls in this.Pages {
            visible := pageName = section
            for control in controls
                control.Visible := visible
        }
        for key, tab in this.Tabs
            SettingsRenderer.SetSelected(tab, key = section)
        this.RefreshConnectionControls()
        DllCall("SendMessageW", "ptr", this.Gui.Hwnd, "uint", 0x000B,
            "ptr", 1, "ptr", 0)
        DllCall("RedrawWindow", "ptr", this.Gui.Hwnd, "ptr", 0, "ptr", 0,
            "uint", 0x0001 | 0x0004 | 0x0080 | 0x0100)
        firstControl := section = "general" ? this.FocusKeyEdit
            : section = "clipboard" ? this.CloseOnFocusLostCheck
            : section = "account" ? this.DeviceNameEdit : this.MonitorList
        if this.IsVisible()
            firstControl.Focus()
    }

    SetStatus(text, isError := false) {
        this.Status.SetFont("s9 c" ThemeManager.Hex(
            isError ? "ErrorText" : "SuccessText"), "Segoe UI Variable Text")
        this.Status.Text := text
        WindowsInterop.AnnounceStatus(this.Status)
    }

    ApplyTheme() {
        this.Gui.BackColor := ThemeManager.Hex("Window")
        for control in this.TextControls
            control.SetFont("c" ThemeManager.Hex("Text"), "Segoe UI Variable Text")
        for control in [this.Intro, this.ClipboardNote, this.ConnectionStatus,
            this.AccountNote]
            control.SetFont("c" ThemeManager.Hex("MutedText"),
                "Segoe UI Variable Text")
        for control in this.InputControls
            try control.Opt("Background" ThemeManager.Hex("Input")
                " c" ThemeManager.Hex("Text"))
        dark := ThemeManager.Mode = "dark"
        darkValue := dark ? 1 : 0
        try DllCall("dwmapi\DwmSetWindowAttribute", "ptr", this.Gui.Hwnd,
            "uint", 20, "int*", &darkValue, "uint", 4)
        themeName := dark ? "DarkMode_Explorer" : "Explorer"
        for control in this.InputControls
            try DllCall("uxtheme\SetWindowTheme", "ptr", control.Hwnd,
                "str", themeName, "ptr", 0)
        for control in this.DrawnControls
            DllCall("InvalidateRect", "ptr", control.Hwnd, "ptr", 0, "int", true)
    }

    Show() {
        area := WindowsInterop.ForegroundWorkArea()
        showWidth := this.TestMode
            ? Round(SettingsDialog.LogicalWidth * A_ScreenDPI / 96)
            : SettingsDialog.LogicalWidth
        showHeight := this.TestMode
            ? Round(SettingsDialog.LogicalHeight * A_ScreenDPI / 96)
            : SettingsDialog.LogicalHeight
        this.Gui.Show("Hide x" area.Left " y" area.Top
            " w" showWidth " h" showHeight)
        this.Gui.GetPos(,, &width, &height)
        geometry := WindowsInterop.ClampWindowPosition(area,
            area.Left + Floor(((area.Right - area.Left) - width) / 2),
            area.Top + Floor(((area.Bottom - area.Top) - height) / 2),
            width, height)
        DllCall("SetWindowPos", "ptr", this.Gui.Hwnd, "ptr", 0,
            "int", this.TestMode ? -10000 : geometry.X,
            "int", this.TestMode ? -10000 : geometry.Y,
            "int", 0, "int", 0,
            "uint", 0x0001 | 0x0040 | (this.TestMode ? 0x0010 : 0))
        this.FocusKeyEdit.Focus()
    }

    IsVisible() {
        return !this.Closed && DllCall("IsWindowVisible", "ptr", this.Gui.Hwnd)
    }

    Focus() {
        if this.IsVisible()
            DllCall("SetForegroundWindow", "ptr", this.Gui.Hwnd)
    }

    Close(*) {
        if this.Closed
            return
        try SetTimer(this.AutoSaveTimer, 0)
        if this.PendingSave
            this.AutoSave()
        this.Closed := true
        this.Tooltips.Destroy()
        try OnMessage(0x0111, this.CommandHandler, 0)
        for control in this.DrawnControls
            SettingsRenderer.Unregister(control)
        try this.Gui.Destroy()
        if IsObject(this.ClosedCallback)
            this.ClosedCallback.Call()
    }
}
