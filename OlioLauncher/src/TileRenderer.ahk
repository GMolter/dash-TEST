class TileRenderer {
    static Tiles := Map()
    static HoveredHwnd := 0
    static Initialized := false
    static LastDrawError := ""

    static Initialize() {
        if this.Initialized
            return
        this.Initialized := true
        OnMessage(0x002B, (w, l, m, h) => this.OnDrawItem(w, l, m, h)) ; WM_DRAWITEM
        OnMessage(0x0200, (w, l, m, h) => this.OnMouseMove(w, l, m, h)) ; WM_MOUSEMOVE
        OnMessage(0x02A3, (w, l, m, h) => this.OnMouseLeave(w, l, m, h)) ; WM_MOUSELEAVE
    }

    static Register(control, title, subtitle, accentRgb, enabled := true) {
        this.Initialize()
        this.Tiles[control.Hwnd] := {
            Title: title, Subtitle: subtitle, Accent: accentRgb,
            Enabled: enabled, Selected: false, Icon: false, IconKind: ""
        }
        control.Enabled := enabled
    }

    static RegisterSettingsButton(control, accentRgb := 0xFBBF24, enabled := true) {
        return this.RegisterUtilityButton(control, "Settings", "settings-2",
            accentRgb, enabled, false)
    }

    static RegisterUtilityButton(control, title, iconKind, accentRgb,
        enabled := true, drawLabel := true) {
        this.Initialize()
        this.Tiles[control.Hwnd] := {
            Title: title, Subtitle: "", Accent: accentRgb,
            Enabled: enabled, Selected: false, Icon: true, IconKind: iconKind,
            DrawLabel: drawLabel
        }
        control.Enabled := enabled
    }

    static SetSelected(hwnd) {
        for tileHwnd, tile in this.Tiles {
            selected := tileHwnd = hwnd
            if tile.Selected != selected {
                tile.Selected := selected
                DllCall("InvalidateRect", "ptr", tileHwnd, "ptr", 0, "int", true)
            }
        }
    }

    static SetTitle(hwnd, title) {
        if !this.Tiles.Has(hwnd) || this.Tiles[hwnd].Title = title
            return
        this.Tiles[hwnd].Title := title
        DllCall("InvalidateRect", "ptr", hwnd, "ptr", 0, "int", true)
    }

    static SetEnabled(control, enabled) {
        hwnd := IsObject(control) ? control.Hwnd : control
        if !this.Tiles.Has(hwnd)
            return
        enabled := !!enabled
        this.Tiles[hwnd].Enabled := enabled
        DllCall("EnableWindow", "ptr", hwnd, "int", enabled)
        DllCall("InvalidateRect", "ptr", hwnd, "ptr", 0, "int", true)
    }

    static Unregister(control) {
        hwnd := IsObject(control) ? control.Hwnd : control
        if this.Tiles.Has(hwnd)
            this.Tiles.Delete(hwnd)
        if this.HoveredHwnd = hwnd
            this.HoveredHwnd := 0
    }

    static RefreshAll() {
        for hwnd in this.Tiles
            DllCall("RedrawWindow", "ptr", hwnd, "ptr", 0, "ptr", 0,
                "uint", 0x0001 | 0x0004 | 0x0100)
    }

    static OnDrawItem(wParam, lParam, msg, hwnd) {
        try {
            result := this.DrawItem(lParam)
            if result
                return result
            result := ClipboardRenderer.DrawItem(lParam)
            return result ? result : QuickPastesRenderer.DrawItem(lParam)
        }
        catch as drawError {
            this.LastDrawError := Type(drawError) ": " drawError.Message
            return false
        }
    }

    static DrawItem(drawInfo) {
        if NumGet(drawInfo, 0, "uint") != 4 ; ODT_BUTTON
            return false
        hwndOffset := A_PtrSize = 8 ? 24 : 20
        itemHwnd := NumGet(drawInfo, hwndOffset, "ptr")
        if !this.Tiles.Has(itemHwnd)
            return false
        tile := this.Tiles[itemHwnd]
        hdc := NumGet(drawInfo, hwndOffset + A_PtrSize, "ptr")
        rectOffset := hwndOffset + (A_PtrSize * 2)
        left := NumGet(drawInfo, rectOffset, "int")
        top := NumGet(drawInfo, rectOffset + 4, "int")
        right := NumGet(drawInfo, rectOffset + 8, "int")
        bottom := NumGet(drawInfo, rectOffset + 12, "int")
        state := NumGet(drawInfo, 16, "uint")

        disabled := !tile.Enabled || (state & 0x4)
        pressed := state & 0x1
        focused := state & 0x10
        hovered := itemHwnd = this.HoveredHwnd
        background := disabled ? 0x070D1A
            : pressed ? 0x1E1B4B
            : tile.Selected ? 0x171B46
            : hovered ? 0x0F172A
            : 0x0B1220
        if tile.Icon && !disabled
            background := pressed ? 0x2A2108
                : tile.Selected ? 0x241E0C
                : hovered ? 0x172033
                : 0x0B1220
        if (tile.IconKind = "settings-2" || tile.IconKind = "arrow-left") && !disabled
            background := 0x0B1220
        parentBackground := 0x020617

        this.FillRect(hdc, left, top, right, bottom, parentBackground)
        radius := tile.Icon ? Max(10, Floor((bottom - top) / 2))
            : Max(10, Round(16 * this.WindowDpi(itemHwnd) / 96))
        this.FillRounded(hdc, left, top, right, bottom, radius, background)

        dpi := this.WindowDpi(itemHwnd)
        borderColor := disabled ? 0x111827 : tile.Selected ? 0x6366F1 : hovered ? 0x39445A : 0x1E293B
        if tile.Icon && !disabled
            borderColor := (focused || tile.Selected) ? tile.Accent
                : hovered ? this.BlendRgb(tile.Accent, 0x1E293B, 0.45)
                : 0x293548
        this.StrokeRounded(hdc, left + 1, top + 1, right - 1, bottom - 1,
            radius, borderColor, Max(1, Round(dpi / 96)))

        if tile.Icon {
            iconColor := disabled ? 0x475569 : tile.Accent
            iconLeft := left + Round(11 * dpi / 96)
            iconTop := top + Round(8 * dpi / 96)
            iconSize := Round(20 * dpi / 96)
            switch tile.IconKind {
                case "settings-2":
                    this.DrawSettings2(hdc, iconLeft, iconTop, iconSize, iconColor)
                case "arrow-left":
                    this.DrawArrowLeft(hdc, iconLeft, iconTop, iconSize, iconColor)
                case "x":
                    this.DrawX(hdc, iconLeft, iconTop, iconSize, iconColor)
            }
            if tile.DrawLabel {
                labelFont := this.CreateFont(9, 600, dpi)
                try this.DrawUtilityLabel(hdc, tile.Title, labelFont,
                    disabled ? 0x64748B : 0xF8FAFC,
                    left + Round(40 * dpi / 96), top, dpi)
                finally DllCall("DeleteObject", "ptr", labelFont)
            }
            if focused && !disabled
                this.StrokeRounded(hdc, left + 1, top + 1, right - 1, bottom - 1,
                    radius, tile.Accent, Max(1, Round(2 * dpi / 96)))
            return true
        }

        accentWidth := Max(3, Round(3 * dpi / 96))
        inset := Round(12 * dpi / 96)
        this.FillRounded(hdc, left + inset, top + inset, left + inset + accentWidth,
            bottom - inset, accentWidth,
            disabled ? this.BlendRgb(tile.Accent, 0x334155, 0.42) : tile.Accent)

        titleFont := this.CreateFont(10, 600, dpi)
        subtitleFont := this.CreateFont(8, 400, dpi)
        textLeft := left + Round(25 * dpi / 96)
        textRight := right - Round(9 * dpi / 96)
        try {
            titleColor := disabled ? 0x64748B : 0xF8FAFC
            subtitleColor := disabled ? 0x475569 : 0x94A3B8
            if tile.Subtitle {
                this.DrawText(hdc, tile.Title, titleFont, titleColor, textLeft,
                    top + Round(8 * dpi / 96), textRight, top + Round(32 * dpi / 96))
                this.DrawText(hdc, tile.Subtitle, subtitleFont, subtitleColor, textLeft,
                    top + Round(31 * dpi / 96), textRight, bottom - Round(6 * dpi / 96))
            } else {
                this.DrawText(hdc, tile.Title, titleFont, titleColor, textLeft, top,
                    textRight, bottom, 0x00000004 | 0x00000020 | 0x00000800)
            }
        } finally {
            DllCall("DeleteObject", "ptr", titleFont)
            DllCall("DeleteObject", "ptr", subtitleFont)
        }

        if focused && !disabled
            this.StrokeRounded(hdc, left + 1, top + 1, right - 1, bottom - 1,
                radius, tile.Accent, Max(1, Round(2 * dpi / 96)))
        return true
    }

    static OnMouseMove(wParam, lParam, msg, hwnd) {
        if !this.Tiles.Has(hwnd) || !this.Tiles[hwnd].Enabled
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
        NumPut("uint", 0x2, tracking, 4) ; TME_LEAVE
        NumPut("ptr", hwnd, tracking, 8)
        DllCall("TrackMouseEvent", "ptr", tracking)
    }

    static OnMouseLeave(wParam, lParam, msg, hwnd) {
        if hwnd = this.HoveredHwnd {
            this.HoveredHwnd := 0
            DllCall("InvalidateRect", "ptr", hwnd, "ptr", 0, "int", true)
        }
    }

    static WindowDpi(hwnd) {
        dpi := DllCall("GetDpiForWindow", "ptr", hwnd, "uint")
        return dpi ? dpi : 96
    }

    static CreateFont(points, weight, dpi, family := "Segoe UI Variable Text") {
        height := -DllCall("MulDiv", "int", points, "int", dpi, "int", 72, "int")
        return DllCall("CreateFontW", "int", height, "int", 0, "int", 0, "int", 0,
            "int", weight, "uint", 0, "uint", 0, "uint", 0, "uint", 1,
            "uint", 0, "uint", 0, "uint", 5, "uint", 0, "str", family, "ptr")
    }

    static DrawSettings2(hdc, left, top, size, rgb) {
        ; Lucide settings-2: M20 7h-9, M14 17H5, circles at (7,7) and (17,17), r=3.
        scale := size / 24
        px := (value) => Round(left + value * scale)
        py := (value) => Round(top + value * scale)
        penWidth := Max(2, Round(2 * scale))
        pen := DllCall("CreatePen", "int", 0, "int", penWidth,
            "uint", this.ColorRef(rgb), "ptr")
        oldPen := DllCall("SelectObject", "ptr", hdc, "ptr", pen, "ptr")
        oldBrush := DllCall("SelectObject", "ptr", hdc,
            "ptr", DllCall("GetStockObject", "int", 5, "ptr"), "ptr")

        DllCall("MoveToEx", "ptr", hdc, "int", px(11), "int", py(7), "ptr", 0)
        DllCall("LineTo", "ptr", hdc, "int", px(20), "int", py(7))
        DllCall("MoveToEx", "ptr", hdc, "int", px(5), "int", py(17), "ptr", 0)
        DllCall("LineTo", "ptr", hdc, "int", px(14), "int", py(17))
        DllCall("Ellipse", "ptr", hdc, "int", px(4), "int", py(4),
            "int", px(10), "int", py(10))
        DllCall("Ellipse", "ptr", hdc, "int", px(14), "int", py(14),
            "int", px(20), "int", py(20))

        DllCall("SelectObject", "ptr", hdc, "ptr", oldBrush)
        DllCall("SelectObject", "ptr", hdc, "ptr", oldPen)
        DllCall("DeleteObject", "ptr", pen)
    }

    static DrawArrowLeft(hdc, left, top, size, rgb) {
        scale := size / 24
        px := (value) => Round(left + value * scale)
        py := (value) => Round(top + value * scale)
        pen := DllCall("CreatePen", "int", 0, "int", Max(2, Round(2 * scale)),
            "uint", this.ColorRef(rgb), "ptr")
        oldPen := DllCall("SelectObject", "ptr", hdc, "ptr", pen, "ptr")
        DllCall("MoveToEx", "ptr", hdc, "int", px(19), "int", py(12), "ptr", 0)
        DllCall("LineTo", "ptr", hdc, "int", px(5), "int", py(12))
        DllCall("MoveToEx", "ptr", hdc, "int", px(12), "int", py(19), "ptr", 0)
        DllCall("LineTo", "ptr", hdc, "int", px(5), "int", py(12))
        DllCall("LineTo", "ptr", hdc, "int", px(12), "int", py(5))
        DllCall("SelectObject", "ptr", hdc, "ptr", oldPen)
        DllCall("DeleteObject", "ptr", pen)
    }

    static DrawX(hdc, left, top, size, rgb) {
        scale := size / 24
        px := (value) => Round(left + value * scale)
        py := (value) => Round(top + value * scale)
        pen := DllCall("CreatePen", "int", 0, "int", Max(2, Round(2 * scale)),
            "uint", this.ColorRef(rgb), "ptr")
        oldPen := DllCall("SelectObject", "ptr", hdc, "ptr", pen, "ptr")
        DllCall("MoveToEx", "ptr", hdc, "int", px(6), "int", py(6), "ptr", 0)
        DllCall("LineTo", "ptr", hdc, "int", px(18), "int", py(18))
        DllCall("MoveToEx", "ptr", hdc, "int", px(18), "int", py(6), "ptr", 0)
        DllCall("LineTo", "ptr", hdc, "int", px(6), "int", py(18))
        DllCall("SelectObject", "ptr", hdc, "ptr", oldPen)
        DllCall("DeleteObject", "ptr", pen)
    }

    static BlendRgb(foreground, background, amount) {
        red := Round(((foreground >> 16) & 0xFF) * amount
            + ((background >> 16) & 0xFF) * (1 - amount))
        green := Round(((foreground >> 8) & 0xFF) * amount
            + ((background >> 8) & 0xFF) * (1 - amount))
        blue := Round((foreground & 0xFF) * amount + (background & 0xFF) * (1 - amount))
        return (red << 16) | (green << 8) | blue
    }

    static DrawText(hdc, text, font, rgb, left, top, right, bottom,
        flags := 0x00000004 | 0x00000020 | 0x00000800) {
        oldFont := DllCall("SelectObject", "ptr", hdc, "ptr", font, "ptr")
        oldMode := DllCall("SetBkMode", "ptr", hdc, "int", 1, "int")
        oldColor := DllCall("SetTextColor", "ptr", hdc, "uint", this.ColorRef(rgb), "uint")
        rect := Buffer(16, 0)
        NumPut("int", left, rect, 0), NumPut("int", top, rect, 4)
        NumPut("int", right, rect, 8), NumPut("int", bottom, rect, 12)
        DllCall("DrawTextW", "ptr", hdc, "str", text, "int", -1, "ptr", rect, "uint", flags)
        DllCall("SetTextColor", "ptr", hdc, "uint", oldColor)
        DllCall("SetBkMode", "ptr", hdc, "int", oldMode)
        DllCall("SelectObject", "ptr", hdc, "ptr", oldFont)
    }

    static DrawUtilityLabel(hdc, text, font, rgb, left, top, dpi) {
        oldFont := DllCall("SelectObject", "ptr", hdc, "ptr", font, "ptr")
        oldMode := DllCall("SetBkMode", "ptr", hdc, "int", 1, "int")
        oldColor := DllCall("SetTextColor", "ptr", hdc,
            "uint", this.ColorRef(rgb), "uint")
        textY := top + Round(11 * dpi / 96)
        DllCall("gdi32\TextOutW", "ptr", hdc, "int", left, "int", textY,
            "str", text, "int", StrLen(text))
        DllCall("SetTextColor", "ptr", hdc, "uint", oldColor)
        DllCall("SetBkMode", "ptr", hdc, "int", oldMode)
        DllCall("SelectObject", "ptr", hdc, "ptr", oldFont)
    }

    static FillRect(hdc, left, top, right, bottom, rgb) {
        rect := Buffer(16, 0)
        NumPut("int", left, rect, 0), NumPut("int", top, rect, 4)
        NumPut("int", right, rect, 8), NumPut("int", bottom, rect, 12)
        brush := DllCall("CreateSolidBrush", "uint", this.ColorRef(rgb), "ptr")
        DllCall("FillRect", "ptr", hdc, "ptr", rect, "ptr", brush)
        DllCall("DeleteObject", "ptr", brush)
    }

    static FillRounded(hdc, left, top, right, bottom, radius, rgb) {
        region := DllCall("CreateRoundRectRgn", "int", left, "int", top, "int", right + 1,
            "int", bottom + 1, "int", radius, "int", radius, "ptr")
        brush := DllCall("CreateSolidBrush", "uint", this.ColorRef(rgb), "ptr")
        DllCall("FillRgn", "ptr", hdc, "ptr", region, "ptr", brush)
        DllCall("DeleteObject", "ptr", brush)
        DllCall("DeleteObject", "ptr", region)
    }

    static StrokeRounded(hdc, left, top, right, bottom, radius, rgb, width) {
        pen := DllCall("CreatePen", "int", 0, "int", width, "uint", this.ColorRef(rgb), "ptr")
        oldPen := DllCall("SelectObject", "ptr", hdc, "ptr", pen, "ptr")
        oldBrush := DllCall("SelectObject", "ptr", hdc,
            "ptr", DllCall("GetStockObject", "int", 5, "ptr"), "ptr")
        DllCall("RoundRect", "ptr", hdc, "int", left, "int", top, "int", right,
            "int", bottom, "int", radius, "int", radius)
        DllCall("SelectObject", "ptr", hdc, "ptr", oldBrush)
        DllCall("SelectObject", "ptr", hdc, "ptr", oldPen)
        DllCall("DeleteObject", "ptr", pen)
    }

    static ColorRef(rgb) {
        return ((rgb & 0xFF) << 16) | (rgb & 0xFF00) | ((rgb >> 16) & 0xFF)
    }
}
