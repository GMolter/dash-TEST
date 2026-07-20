class QuickPastesRenderer {
    static Lists := Map()

    static Register(control, window) {
        this.Lists[control.Hwnd] := {Control: control, Window: window}
    }

    static DrawItem(drawInfo) {
        if NumGet(drawInfo, 0, "uint") != 2
            return false
        hwndOffset := A_PtrSize = 8 ? 24 : 20
        itemHwnd := NumGet(drawInfo, hwndOffset, "ptr")
        if !this.Lists.Has(itemHwnd)
            return false
        registration := this.Lists[itemHwnd]
        itemId := NumGet(drawInfo, 8, "uint")
        hdc := NumGet(drawInfo, hwndOffset + A_PtrSize, "ptr")
        rectOffset := hwndOffset + (A_PtrSize * 2)
        left := NumGet(drawInfo, rectOffset, "int")
        top := NumGet(drawInfo, rectOffset + 4, "int")
        right := NumGet(drawInfo, rectOffset + 8, "int")
        bottom := NumGet(drawInfo, rectOffset + 12, "int")
        state := NumGet(drawInfo, 16, "uint")
        TileRenderer.FillRect(hdc, left, top, right, bottom,
            ThemeManager.Color("Window"))
        if itemId = 0xFFFFFFFF
            return true
        index := itemId + 1
        if index < 1 || index > registration.Window.QuickVisibleItems.Length
            return true

        item := registration.Window.QuickVisibleItems[index]
        selected := state & 0x1
        focused := state & 0x10
        dpi := TileRenderer.WindowDpi(itemHwnd)
        cardLeft := left + 2, cardTop := top + 5
        cardRight := right - 7, cardBottom := bottom - 5
        radius := Max(10, Round(13 * dpi / 96))
        background := selected ? ThemeManager.Color("SurfaceSelected")
            : ThemeManager.Color("Surface")
        border := selected ? (ThemeManager.HighContrast
            ? ThemeManager.Color("Text") : 0x38BDF8) : ThemeManager.Color("Border")
        TileRenderer.FillRounded(hdc, cardLeft, cardTop, cardRight, cardBottom,
            radius, background)
        TileRenderer.StrokeRounded(hdc, cardLeft + 1, cardTop + 1,
            cardRight - 1, cardBottom - 1, radius,
            border,
            Max(1, Round((selected || focused ? 2 : 1) * dpi / 96)))
        TileRenderer.FillRounded(hdc, cardRight - 3, cardTop + 12,
            cardRight, cardBottom - 12, 3, ThemeManager.HighContrast
                ? ThemeManager.Color("Text") : (selected ? 0xA855F7 : 0x4C1D95))

        metaFont := TileRenderer.CreateFont(8, 400, dpi)
        titleFont := TileRenderer.CreateFont(10, 600, dpi)
        contentFont := TileRenderer.CreateFont(9, 400, dpi)
        try {
            iconLeft := cardLeft + Round(20 * dpi / 96)
            iconTop := cardTop + Round(31 * dpi / 96)
            lineHeight := Max(3, Round(4 * dpi / 96))
            iconColor := ThemeManager.HighContrast ? ThemeManager.Color("Text")
                : (item.IsFavorite ? 0xFBBF24 : ThemeManager.Color("MutedText"))
            TileRenderer.FillRounded(hdc, iconLeft, iconTop,
                iconLeft + Round(48 * dpi / 96), iconTop + lineHeight,
                lineHeight, iconColor)
            TileRenderer.FillRounded(hdc, iconLeft, iconTop + Round(12 * dpi / 96),
                iconLeft + Round(38 * dpi / 96),
                iconTop + Round(12 * dpi / 96) + lineHeight,
                lineHeight, iconColor)
            TileRenderer.FillRounded(hdc, iconLeft, iconTop + Round(24 * dpi / 96),
                iconLeft + Round(28 * dpi / 96),
                iconTop + Round(24 * dpi / 96) + lineHeight,
                lineHeight, iconColor)

            textLeft := cardLeft + Round(82 * dpi / 96)
            textRight := cardRight - Round(14 * dpi / 96)
            flags := 0x00000020 | 0x00000004 | 0x00000800 | 0x00008000
            meta := item.Category ? item.SafeCategory(50) : "Uncategorized"
            if item.IsFavorite
                meta .= "  •  Favorite"
            TileRenderer.DrawText(hdc, meta, metaFont,
                ThemeManager.Color("MutedText"), textLeft, cardTop + 10,
                textRight, cardTop + 30, flags)
            TileRenderer.DrawText(hdc, item.SafeTitle(100), titleFont,
                ThemeManager.Color("Text"), textLeft, cardTop + 32,
                textRight, cardTop + 57, flags)
            TileRenderer.DrawText(hdc, item.SafeContent(180), contentFont,
                ThemeManager.Color("MutedText"), textLeft, cardTop + 59, textRight,
                cardBottom - 7, flags)
        } finally {
            DllCall("DeleteObject", "ptr", titleFont)
            DllCall("DeleteObject", "ptr", metaFont)
            DllCall("DeleteObject", "ptr", contentFont)
        }
        return true
    }
}
