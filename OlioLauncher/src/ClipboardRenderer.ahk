class ClipboardRenderer {
    static Lists := Map()

    static Register(control, manager) {
        this.Lists[control.Hwnd] := {Control: control, Manager: manager}
    }

    static DrawItem(drawInfo) {
        if NumGet(drawInfo, 0, "uint") != 2 ; ODT_LISTBOX
            return false
        hwndOffset := A_PtrSize = 8 ? 24 : 20
        itemHwnd := NumGet(drawInfo, hwndOffset, "ptr")
        if !this.Lists.Has(itemHwnd)
            return false
        registration := this.Lists[itemHwnd]
        manager := registration.Manager
        itemId := NumGet(drawInfo, 8, "uint")
        hdc := NumGet(drawInfo, hwndOffset + A_PtrSize, "ptr")
        rectOffset := hwndOffset + (A_PtrSize * 2)
        left := NumGet(drawInfo, rectOffset, "int")
        top := NumGet(drawInfo, rectOffset + 4, "int")
        right := NumGet(drawInfo, rectOffset + 8, "int")
        bottom := NumGet(drawInfo, rectOffset + 12, "int")
        state := NumGet(drawInfo, 16, "uint")

        TileRenderer.FillRect(hdc, left, top, right, bottom, 0x020617)
        if itemId = 0xFFFFFFFF || !IsObject(manager)
            return true
        index := itemId + 1
        if index < 1 || index > manager.Entries.Length
            return true

        entry := manager.Entries[index]
        selected := state & 0x1
        focused := state & 0x10
        cardLeft := left + 2, cardTop := top + 5
        cardRight := right - 7, cardBottom := bottom - 5
        dpi := TileRenderer.WindowDpi(itemHwnd)
        radius := Max(10, Round(14 * dpi / 96))
        background := selected ? 0x101B33 : 0x0B1220
        border := selected ? 0x38BDF8 : 0x293548
        TileRenderer.FillRounded(hdc, cardLeft, cardTop, cardRight, cardBottom,
            radius, background)
        TileRenderer.StrokeRounded(hdc, cardLeft + 1, cardTop + 1,
            cardRight - 1, cardBottom - 1, radius, border,
            Max(1, Round((selected || focused ? 2 : 1) * dpi / 96)))
        ; Violet right-edge accent suggests the reference gradient without extra controls.
        TileRenderer.FillRounded(hdc, cardRight - 3, cardTop + 12,
            cardRight, cardBottom - 12, 3, selected ? 0xA855F7 : 0x4C1D95)

        metaFont := TileRenderer.CreateFont(8, 400, dpi)
        titleFont := TileRenderer.CreateFont(10, 600, dpi)
        previewFont := TileRenderer.CreateFont(9, 400, dpi)
        try {
            if entry.Kind = "image"
                this.DrawImageCard(hdc, entry, manager, cardLeft, cardTop,
                    cardRight, cardBottom, metaFont, titleFont, dpi)
            else
                this.DrawTextCard(hdc, entry, cardLeft, cardTop,
                    cardRight, cardBottom, metaFont, titleFont, previewFont, dpi)
        } finally {
            DllCall("DeleteObject", "ptr", metaFont)
            DllCall("DeleteObject", "ptr", titleFont)
            DllCall("DeleteObject", "ptr", previewFont)
        }
        return true
    }

    static DrawImageCard(hdc, entry, manager, left, top, right, bottom,
        metaFont, titleFont, dpi) {
        imageLeft := left + Round(13 * dpi / 96)
        imageTop := top + Round(13 * dpi / 96)
        imageWidth := Round(86 * dpi / 96)
        imageHeight := Round(58 * dpi / 96)
        TileRenderer.FillRounded(hdc, imageLeft, imageTop,
            imageLeft + imageWidth, imageTop + imageHeight,
            Round(9 * dpi / 96), 0x111827)
        details := manager.ValidateDib(entry.Dib)
        if details.Ok {
            oldMode := DllCall("SetStretchBltMode", "ptr", hdc, "int", 4, "int")
            DllCall("StretchDIBits", "ptr", hdc,
                "int", imageLeft + 2, "int", imageTop + 2,
                "int", imageWidth - 4, "int", imageHeight - 4,
                "int", 0, "int", 0, "int", entry.Width, "int", entry.Height,
                "ptr", entry.Dib.Ptr + details.BitsOffset, "ptr", entry.Dib.Ptr,
                "uint", 0, "uint", 0x00CC0020, "int")
            DllCall("SetStretchBltMode", "ptr", hdc, "int", oldMode)
        }
        textLeft := imageLeft + imageWidth + Round(14 * dpi / 96)
        flags := 0x00000020 | 0x00000004 | 0x00000800 | 0x00008000
        TileRenderer.DrawText(hdc, entry.DisplayTime, metaFont, 0x94A3B8,
            textLeft, top + 12, right - 14, top + 35, flags)
        label := "Image " entry.Width "×" entry.Height
        if entry.Pinned
            label .= "  •  Pinned"
        TileRenderer.DrawText(hdc, label, titleFont, 0xF8FAFC,
            textLeft, top + 38, right - 14, bottom - 12, flags)
    }

    static DrawTextCard(hdc, entry, left, top, right, bottom,
        metaFont, titleFont, previewFont, dpi) {
        iconLeft := left + Round(20 * dpi / 96)
        iconTop := top + Round(31 * dpi / 96)
        lineHeight := Max(3, Round(4 * dpi / 96))
        color := 0x94A3B8
        TileRenderer.FillRounded(hdc, iconLeft, iconTop,
            iconLeft + Round(48 * dpi / 96), iconTop + lineHeight, lineHeight, color)
        TileRenderer.FillRounded(hdc, iconLeft, iconTop + Round(12 * dpi / 96),
            iconLeft + Round(38 * dpi / 96), iconTop + Round(12 * dpi / 96) + lineHeight,
            lineHeight, color)
        TileRenderer.FillRounded(hdc, iconLeft, iconTop + Round(24 * dpi / 96),
            iconLeft + Round(28 * dpi / 96), iconTop + Round(24 * dpi / 96) + lineHeight,
            lineHeight, color)

        textLeft := left + Round(82 * dpi / 96)
        flags := 0x00000020 | 0x00000004 | 0x00000800 | 0x00008000
        TileRenderer.DrawText(hdc, entry.DisplayTime, metaFont, 0x94A3B8,
            textLeft, top + 10, right - 14, top + 32, flags)
        TileRenderer.DrawText(hdc, entry.SafePreview(180), previewFont, 0xF8FAFC,
            textLeft, top + 34, right - 14, top + 61, flags)
        label := entry.Pinned ? "Text  •  Pinned" : "Text"
        TileRenderer.DrawText(hdc, label, titleFont, entry.Pinned ? 0xFBBF24 : 0x38BDF8,
            textLeft, top + 61, right - 14, bottom - 8, flags)
    }
}
