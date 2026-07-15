class ClipboardPreviewWindow {
    static Canvases := Map()
    static CloseButtons := Map()
    static DragTargets := Map()
    static CommandCallback := 0
    static MouseDownCallback := 0
    static Initialized := false

    __New(parentGui, entry, details, closedCallback := 0) {
        if !IsObject(entry) || entry.Kind != "image" || !IsObject(entry.Dib)
            throw ValueError("An image entry is required.")
        if !IsObject(details) || !details.Ok
            throw ValueError("The image entry is invalid.")

        this.ParentHwnd := parentGui.Hwnd
        this.ClosedCallback := closedCallback
        this.Closed := false
        this.Width := entry.Width
        this.Height := entry.Height
        this.BitsOffset := details.BitsOffset
        this.PaintCount := 0
        this.LastPaintResult := 0
        this.Dib := Buffer(entry.Dib.Size)
        DllCall("RtlMoveMemory", "ptr", this.Dib.Ptr, "ptr", entry.Dib.Ptr,
            "uptr", entry.Dib.Size)

        area := WindowsInterop.ForegroundWorkArea()
        dpi := DllCall("GetDpiForWindow", "ptr", parentGui.Hwnd, "uint")
        if !dpi
            dpi := area.Dpi ? area.Dpi : 96
        logicalWidth := Max(360, Min(720,
            Floor((area.Right - area.Left - 32) * 96 / dpi)))
        logicalHeight := Max(300, Min(520,
            Floor((area.Bottom - area.Top - 32) * 96 / dpi)))
        canvasWidth := logicalWidth - 32
        canvasHeight := logicalHeight - 80

        this.Gui := Gui("+Owner" parentGui.Hwnd
            " -Caption +Border +ToolWindow", "Olio Launcher Image Preview")
        this.Gui.BackColor := "020617"
        this.Gui.MarginX := 16
        this.Gui.MarginY := 10
        this.ApplyWindowStyle()

        logoOptions := "x16 y10 w40 h40"
        if A_IsCompiled
            logoOptions .= " Icon1"
        this.Logo := this.Gui.AddPicture(logoOptions, LauncherWindow.BrandIconPath())
        this.Gui.SetFont("s11 bold c818CF8", "Segoe UI Variable Text")
        this.HeaderTitle := this.Gui.AddText("x62 y18 w" (logicalWidth - 126)
            " h28 +0x200", "Image Preview")

        this.CloseButton := this.Gui.Add("Custom", "ClassButton x"
            (logicalWidth - 56) " y12 w40 h36 0x5401000B", "Close image preview")
        TileRenderer.RegisterUtilityButton(this.CloseButton, "Close", "x",
            0xFB7185, true, false)
        this.Canvas := this.Gui.Add("Custom", "ClassStatic x16 y64 w" canvasWidth
            " h" canvasHeight " 0x50000000")

        ClipboardPreviewWindow.Initialize()
        ClipboardPreviewWindow.Canvases[this.Canvas.Hwnd] := this
        this.CanvasSubclassId := this.Canvas.Hwnd
        this.CanvasCallback := CallbackCreate(ObjBindMethod(this, "CanvasWindowProc"),
            "Fast", 6)
        if !DllCall("comctl32\SetWindowSubclass", "ptr", this.Canvas.Hwnd,
            "ptr", this.CanvasCallback, "uptr", this.CanvasSubclassId,
            "uptr", 0)
            throw OSError()
        ClipboardPreviewWindow.CloseButtons[this.CloseButton.Hwnd] := this
        this.DragHwnds := [this.Gui.Hwnd, this.Logo.Hwnd, this.HeaderTitle.Hwnd]
        for hwnd in this.DragHwnds
            ClipboardPreviewWindow.DragTargets[hwnd] := this.Gui.Hwnd

        this.CloseHandler := (*) => this.Close()
        this.Gui.OnEvent("Close", this.CloseHandler)
        this.Gui.OnEvent("Escape", this.CloseHandler)

        this.Gui.Show("Hide w" logicalWidth " h" logicalHeight)
        this.Gui.GetPos(,, &physicalWidth, &physicalHeight)
        x := area.Left + Floor(((area.Right - area.Left) - physicalWidth) / 2)
        y := area.Top + Floor(((area.Bottom - area.Top) - physicalHeight) / 2)
        DllCall("SetWindowPos", "ptr", this.Gui.Hwnd, "ptr", 0,
            "int", x, "int", y, "int", 0, "int", 0,
            "uint", 0x0001 | 0x0040)
        this.CloseButton.Focus()
        DllCall("InvalidateRect", "ptr", this.Canvas.Hwnd, "ptr", 0, "int", true)
    }

    static Initialize() {
        if this.Initialized
            return
        this.Initialized := true
        this.CommandCallback := (w, l, m, h) => this.OnCommand(w, l, m, h)
        this.MouseDownCallback := (w, l, m, h) => this.OnMouseDown(w, l, m, h)
        OnMessage(0x0111, this.CommandCallback) ; WM_COMMAND
        OnMessage(0x0201, this.MouseDownCallback) ; WM_LBUTTONDOWN
    }

    CanvasWindowProc(hwnd, msg, wParam, lParam, subclassId, referenceData) {
        if msg = 0x000F
            return this.PaintCanvas(hwnd)
        return DllCall("comctl32\DefSubclassProc", "ptr", hwnd, "uint", msg,
            "uptr", wParam, "ptr", lParam, "ptr")
    }

    static OnCommand(wParam, lParam, msg, hwnd) {
        notification := (wParam >> 16) & 0xFFFF
        if notification = 0 && this.CloseButtons.Has(lParam) {
            this.CloseButtons[lParam].Close()
            return 0
        }
    }

    static OnMouseDown(wParam, lParam, msg, hwnd) {
        if !this.DragTargets.Has(hwnd)
            return
        rootHwnd := this.DragTargets[hwnd]
        DllCall("ReleaseCapture")
        DllCall("SendMessageW", "ptr", rootHwnd, "uint", 0x00A1,
            "uptr", 2, "ptr", 0) ; WM_NCLBUTTONDOWN, HTCAPTION
        return 0
    }

    PaintCanvas(hwnd) {
        paint := Buffer(A_PtrSize = 8 ? 72 : 64, 0)
        hdc := DllCall("BeginPaint", "ptr", hwnd, "ptr", paint, "ptr")
        if !hdc
            return 0
        try {
            client := Buffer(16, 0)
            DllCall("GetClientRect", "ptr", hwnd, "ptr", client)
            right := NumGet(client, 8, "int")
            bottom := NumGet(client, 12, "int")
            TileRenderer.FillRect(hdc, 0, 0, right, bottom, 0x0B1220)
            availableWidth := Max(1, right - 24)
            availableHeight := Max(1, bottom - 24)
            scale := Min(availableWidth / this.Width, availableHeight / this.Height)
            destinationWidth := Max(1, Round(this.Width * scale))
            destinationHeight := Max(1, Round(this.Height * scale))
            destinationX := Floor((right - destinationWidth) / 2)
            destinationY := Floor((bottom - destinationHeight) / 2)
            TileRenderer.FillRect(hdc, destinationX - 2, destinationY - 2,
                destinationX + destinationWidth + 2,
                destinationY + destinationHeight + 2, 0x293548)
            oldMode := DllCall("SetStretchBltMode", "ptr", hdc, "int", 4, "int")
            try this.LastPaintResult := DllCall("StretchDIBits", "ptr", hdc,
                "int", destinationX, "int", destinationY,
                "int", destinationWidth, "int", destinationHeight,
                "int", 0, "int", 0, "int", this.Width, "int", this.Height,
                "ptr", this.Dib.Ptr + this.BitsOffset, "ptr", this.Dib.Ptr,
                "uint", 0, "uint", 0x00CC0020, "int")
            finally DllCall("SetStretchBltMode", "ptr", hdc, "int", oldMode)
            this.PaintCount += 1
        } finally DllCall("EndPaint", "ptr", hwnd, "ptr", paint)
        return 0
    }

    ApplyWindowStyle() {
        try {
            cornerPreference := 2
            DllCall("dwmapi\DwmSetWindowAttribute", "ptr", this.Gui.Hwnd,
                "uint", 33, "int*", &cornerPreference, "uint", 4)
            borderColor := TileRenderer.ColorRef(0x1E293B)
            DllCall("dwmapi\DwmSetWindowAttribute", "ptr", this.Gui.Hwnd,
                "uint", 34, "uint*", &borderColor, "uint", 4)
            darkMode := 1
            DllCall("dwmapi\DwmSetWindowAttribute", "ptr", this.Gui.Hwnd,
                "uint", 20, "int*", &darkMode, "uint", 4)
        }
    }

    IsVisible() {
        return !this.Closed && DllCall("IsWindowVisible", "ptr", this.Gui.Hwnd)
    }

    Close(notify := true, *) {
        if this.Closed
            return
        this.Closed := true
        canvasHwnd := this.Canvas.Hwnd
        closeHwnd := this.CloseButton.Hwnd
        if this.HasOwnProp("CanvasCallback") && this.CanvasCallback {
            try DllCall("comctl32\RemoveWindowSubclass", "ptr", canvasHwnd,
                "ptr", this.CanvasCallback, "uptr", this.CanvasSubclassId)
            CallbackFree(this.CanvasCallback)
            this.CanvasCallback := 0
        }
        if ClipboardPreviewWindow.Canvases.Has(canvasHwnd)
            ClipboardPreviewWindow.Canvases.Delete(canvasHwnd)
        if ClipboardPreviewWindow.CloseButtons.Has(closeHwnd)
            ClipboardPreviewWindow.CloseButtons.Delete(closeHwnd)
        for hwnd in this.DragHwnds {
            if ClipboardPreviewWindow.DragTargets.Has(hwnd)
                ClipboardPreviewWindow.DragTargets.Delete(hwnd)
        }
        TileRenderer.Unregister(closeHwnd)
        try this.Gui.Destroy()
        this.Dib := 0
        if notify && IsObject(this.ClosedCallback)
            try this.ClosedCallback.Call()
    }

    __Delete() {
        this.Close(false)
    }
}
