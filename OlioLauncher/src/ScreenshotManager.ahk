class ScreenshotManager {
    static CF_BITMAP := 2
    static SRCCOPY := 0x00CC0020
    static CAPTUREBLT := 0x40000000
    static IDC_ARROW := 32512
    static IDC_CROSS := 32515

    __New(clipboardManager := 0, finishedCallback := 0) {
        this.ClipboardManager := clipboardManager
        this.FinishedCallback := finishedCallback
        this.Active := false
        this.Dragging := false
        this.HasSelection := false
        this.Overlay := 0
        this.Bounds := 0
        this.PreviousForeground := 0
        this.StartX := 0
        this.StartY := 0
        this.CurrentX := 0
        this.CurrentY := 0
        this.OverlayLatencyMs := 0.0
        this.LastResult := {Status: "ready", OverlayLatencyMs: 0.0,
            CompletionLatencyMs: 0.0}
        this.MessagesRegistered := false
        this.Stopped := false

        this.MouseDownHandler := ObjBindMethod(this, "OnMouseDown")
        this.MouseMoveHandler := ObjBindMethod(this, "OnMouseMove")
        this.MouseUpHandler := ObjBindMethod(this, "OnMouseUp")
        this.PaintHandler := ObjBindMethod(this, "OnPaint")
        this.EraseHandler := ObjBindMethod(this, "OnEraseBackground")
        this.CursorHandler := ObjBindMethod(this, "OnSetCursor")
        this.KeyHandler := ObjBindMethod(this, "OnKeyDown")
        this.EscapeHandler := ObjBindMethod(this, "CancelFromEscape")
        this.ExitHandler := ObjBindMethod(this, "OnProcessExit")
        this.RegisterMessages()
        OnExit(this.ExitHandler)
    }

    RegisterMessages() {
        if this.MessagesRegistered
            return
        OnMessage(0x0201, this.MouseDownHandler) ; WM_LBUTTONDOWN
        OnMessage(0x0200, this.MouseMoveHandler) ; WM_MOUSEMOVE
        OnMessage(0x0202, this.MouseUpHandler) ; WM_LBUTTONUP
        OnMessage(0x000F, this.PaintHandler) ; WM_PAINT
        OnMessage(0x0014, this.EraseHandler) ; WM_ERASEBKGND
        OnMessage(0x0020, this.CursorHandler) ; WM_SETCURSOR
        OnMessage(0x0100, this.KeyHandler) ; WM_KEYDOWN
        this.MessagesRegistered := true
    }

    Begin(previousForeground := 0, boundsOverride := 0) {
        if this.Active || this.Stopped
            return false
        this.Active := true
        this.PreviousForeground := previousForeground
        this.Bounds := IsObject(boundsOverride)
            ? ScreenshotManager.NormalizeBounds(boundsOverride)
            : ScreenshotManager.VirtualDesktopBounds()
        started := ScreenshotManager.Qpc()
        try {
            if !ScreenshotManager.ValidBounds(this.Bounds)
                throw ValueError("The virtual desktop has no capturable area.")
            this.CreateOverlay()
            this.OverlayLatencyMs := ScreenshotManager.QpcMs(started)
            this.LastResult := {Status: "selecting",
                OverlayLatencyMs: this.OverlayLatencyMs, CompletionLatencyMs: 0.0}
            return true
        } catch {
            this.CleanupOverlay()
            this.Finish("overlay-failed", 0.0)
            return false
        }
    }

    CreateOverlay() {
        bounds := this.Bounds
        overlay := Gui("+AlwaysOnTop -Caption +ToolWindow -DPIScale",
            "Olio Dynamic Screenshot — drag to select; Escape cancels")
        overlay.BackColor := "000000"
        this.Overlay := overlay
        overlay.Show("x" bounds.Left " y" bounds.Top " w" bounds.Width
            " h" bounds.Height)
        ; SetWindowPos uses the physical virtual-desktop rectangle directly. This keeps
        ; negative coordinates and mixed-DPI monitor spans out of AHK's GUI scaling.
        if !DllCall("SetWindowPos", "ptr", overlay.Hwnd, "ptr", -1,
            "int", bounds.Left, "int", bounds.Top, "int", bounds.Width,
            "int", bounds.Height, "uint", 0x0040)
            throw OSError()
        WinSetTransparent(112, "ahk_id " overlay.Hwnd)
        DllCall("SetForegroundWindow", "ptr", overlay.Hwnd)
        DllCall("SetFocus", "ptr", overlay.Hwnd, "ptr")
        DllCall("UpdateWindow", "ptr", overlay.Hwnd)
        cursor := DllCall("LoadCursorW", "ptr", 0, "ptr",
            ScreenshotManager.IDC_CROSS, "ptr")
        if cursor
            DllCall("SetCursor", "ptr", cursor)
    }

    static VirtualDesktopBounds() {
        left := SysGet(76), top := SysGet(77)
        width := SysGet(78), height := SysGet(79)
        return {Left: left, Top: top, Right: left + width,
            Bottom: top + height, Width: width, Height: height}
    }

    static NormalizeBounds(bounds) {
        left := bounds.HasOwnProp("Left") ? bounds.Left : 0
        top := bounds.HasOwnProp("Top") ? bounds.Top : 0
        if bounds.HasOwnProp("Right")
            right := bounds.Right
        else
            right := left + (bounds.HasOwnProp("Width") ? bounds.Width : 0)
        if bounds.HasOwnProp("Bottom")
            bottom := bounds.Bottom
        else
            bottom := top + (bounds.HasOwnProp("Height") ? bounds.Height : 0)
        return {Left: left, Top: top, Right: right, Bottom: bottom,
            Width: right - left, Height: bottom - top}
    }

    static ValidBounds(bounds) {
        return IsObject(bounds) && bounds.Width > 0 && bounds.Height > 0
            && bounds.Right > bounds.Left && bounds.Bottom > bounds.Top
    }

    static NormalizeSelection(startX, startY, endX, endY, bounds := 0) {
        if IsObject(bounds) {
            startX := ScreenshotManager.Clamp(startX, bounds.Left, bounds.Right)
            endX := ScreenshotManager.Clamp(endX, bounds.Left, bounds.Right)
            startY := ScreenshotManager.Clamp(startY, bounds.Top, bounds.Bottom)
            endY := ScreenshotManager.Clamp(endY, bounds.Top, bounds.Bottom)
        }
        left := Min(startX, endX), top := Min(startY, endY)
        right := Max(startX, endX), bottom := Max(startY, endY)
        return {Left: left, Top: top, Right: right, Bottom: bottom,
            Width: right - left, Height: bottom - top}
    }

    static Clamp(value, minimum, maximum) {
        return Min(Max(value, minimum), maximum)
    }

    static IsValidSelection(rect) {
        return ScreenshotManager.ValidBounds(rect)
    }

    static ScaleDip(value, dpi) {
        return Round(value * (dpi > 0 ? dpi : 96) / 96)
    }

    static DpiAtPoint(x, y) {
        packedPoint := (y & 0xFFFFFFFF) << 32 | (x & 0xFFFFFFFF)
        monitor := DllCall("MonitorFromPoint", "int64", packedPoint,
            "uint", 2, "ptr")
        dpiX := 96, dpiY := 96
        if monitor {
            try {
                if DllCall("Shcore\GetDpiForMonitor", "ptr", monitor, "uint", 0,
                    "uint*", &dpiX, "uint*", &dpiY, "uint") != 0
                    dpiX := 96
            }
        }
        return dpiX ? dpiX : 96
    }

    CursorPosition() {
        point := Buffer(8, 0)
        if !DllCall("GetCursorPos", "ptr", point)
            throw OSError()
        return {X: NumGet(point, 0, "int"), Y: NumGet(point, 4, "int")}
    }

    IsOverlayWindow(hwnd) {
        return this.Active && IsObject(this.Overlay) && hwnd
            && WindowsInterop.RootWindow(hwnd) = this.Overlay.Hwnd
    }

    OnMouseDown(wParam, lParam, msg, hwnd) {
        if !this.IsOverlayWindow(hwnd)
            return
        try {
            point := this.CursorPosition()
            point.X := ScreenshotManager.Clamp(point.X,
                this.Bounds.Left, this.Bounds.Right)
            point.Y := ScreenshotManager.Clamp(point.Y,
                this.Bounds.Top, this.Bounds.Bottom)
            this.StartX := point.X, this.StartY := point.Y
            this.CurrentX := point.X, this.CurrentY := point.Y
            this.Dragging := true
            this.HasSelection := true
            DllCall("SetCapture", "ptr", this.Overlay.Hwnd, "ptr")
            this.InvalidateOverlay()
        } catch {
            this.Abort("selection-failed")
        }
        return 0
    }

    OnMouseMove(wParam, lParam, msg, hwnd) {
        if !this.Dragging || !this.Active
            return
        try {
            point := this.CursorPosition()
            this.CurrentX := ScreenshotManager.Clamp(point.X,
                this.Bounds.Left, this.Bounds.Right)
            this.CurrentY := ScreenshotManager.Clamp(point.Y,
                this.Bounds.Top, this.Bounds.Bottom)
            this.InvalidateOverlay()
        } catch {
            this.Abort("selection-failed")
        }
        return 0
    }

    OnMouseUp(wParam, lParam, msg, hwnd) {
        if !this.Dragging || !this.Active
            return
        try {
            point := this.CursorPosition()
            this.CurrentX := ScreenshotManager.Clamp(point.X,
                this.Bounds.Left, this.Bounds.Right)
            this.CurrentY := ScreenshotManager.Clamp(point.Y,
                this.Bounds.Top, this.Bounds.Bottom)
            this.Dragging := false
            if DllCall("GetCapture", "ptr") = this.Overlay.Hwnd
                DllCall("ReleaseCapture")
            rect := ScreenshotManager.NormalizeSelection(this.StartX, this.StartY,
                this.CurrentX, this.CurrentY, this.Bounds)
            this.CompleteSelection(rect)
        } catch {
            this.Abort("capture-failed")
        }
        return 0
    }

    CompleteSelection(rect) {
        if !this.Active
            return false
        started := ScreenshotManager.Qpc()
        if !ScreenshotManager.IsValidSelection(rect) {
            this.CleanupOverlay()
            this.Finish("invalid-selection", ScreenshotManager.QpcMs(started))
            return false
        }

        bitmap := 0
        status := "capture-failed"
        this.CleanupOverlay()
        ; Let DWM remove the dim overlay before reading the physical screen pixels.
        Sleep(20)
        try {
            bitmap := ScreenshotManager.CaptureScreenRect(rect)
            if !bitmap
                throw OSError()
            if this.PublishBitmap(bitmap) {
                bitmap := 0 ; Windows owns the successfully transferred HBITMAP.
                status := "captured"
            } else
                status := "clipboard-busy"
        } catch {
            status := "capture-failed"
        } finally {
            if bitmap
                DllCall("DeleteObject", "ptr", bitmap)
        }
        this.Finish(status, ScreenshotManager.QpcMs(started))
        return status = "captured"
    }

    static CaptureScreenRect(rect) {
        if !ScreenshotManager.IsValidSelection(rect)
            return 0
        screenDc := DllCall("GetDC", "ptr", 0, "ptr")
        if !screenDc
            return 0
        try return ScreenshotManager.CopyPixelsToBitmap(screenDc, rect.Left,
            rect.Top, rect.Width, rect.Height)
        finally DllCall("ReleaseDC", "ptr", 0, "ptr", screenDc)
    }

    static CopyPixelsToBitmap(sourceDc, sourceX, sourceY, width, height) {
        if !sourceDc || width <= 0 || height <= 0
            return 0
        memoryDc := DllCall("CreateCompatibleDC", "ptr", sourceDc, "ptr")
        if !memoryDc
            return 0
        bitmap := 0, original := 0, copied := false
        try {
            bitmap := DllCall("CreateCompatibleBitmap", "ptr", sourceDc,
                "int", width, "int", height, "ptr")
            if !bitmap
                return 0
            original := DllCall("SelectObject", "ptr", memoryDc, "ptr", bitmap, "ptr")
            if !original || original = -1
                return 0
            copied := DllCall("BitBlt", "ptr", memoryDc, "int", 0, "int", 0,
                "int", width, "int", height, "ptr", sourceDc, "int", sourceX,
                "int", sourceY, "uint", ScreenshotManager.SRCCOPY
                    | ScreenshotManager.CAPTUREBLT)
            return copied ? bitmap : 0
        } finally {
            if original && original != -1
                DllCall("SelectObject", "ptr", memoryDc, "ptr", original, "ptr")
            DllCall("DeleteDC", "ptr", memoryDc)
            if bitmap && !copied
                DllCall("DeleteObject", "ptr", bitmap)
        }
    }

    PublishBitmap(bitmap, attempts := 8, retryDelayMs := 15) {
        if !bitmap
            return false
        opened := false, transferred := false, mutationStarted := false
        historyEntry := 0
        try {
            if IsObject(this.ClipboardManager) {
                try {
                    historyEntry := this.ClipboardManager.PrepareBitmapEntry(bitmap)
                    this.ClipboardManager.BeginLauncherMutation()
                    mutationStarted := true
                }
            }
            opened := ScreenshotManager.OpenClipboardWithRetry(A_ScriptHwnd,
                attempts, retryDelayMs)
            if !opened
                return false
            if !DllCall("EmptyClipboard")
                return false
            if !DllCall("SetClipboardData", "uint", ScreenshotManager.CF_BITMAP,
                "ptr", bitmap, "ptr")
                return false
            transferred := true
            return true
        } finally {
            if opened
                DllCall("CloseClipboard")
            if mutationStarted
                try this.ClipboardManager.EndLauncherMutation()
            if IsObject(historyEntry) {
                if transferred {
                    try this.ClipboardManager.CommitPreparedEntry(historyEntry)
                    catch
                        historyEntry.Release()
                } else
                    historyEntry.Release()
            }
        }
    }

    static OpenClipboardWithRetry(ownerHwnd, attempts := 8, retryDelayMs := 15,
        attemptCallback := 0) {
        attempts := Max(1, attempts)
        loop attempts {
            opened := IsObject(attemptCallback)
                ? attemptCallback.Call(A_Index)
                : DllCall("OpenClipboard", "ptr", ownerHwnd)
            if opened
                return true
            if A_Index < attempts && retryDelayMs > 0
                Sleep(retryDelayMs)
        }
        return false
    }

    CancelFromEscape(*) {
        this.Cancel("cancelled")
    }

    Cancel(status := "cancelled") {
        if !this.Active
            return false
        this.CleanupOverlay()
        this.Finish(status, 0.0)
        return true
    }

    Abort(status) {
        if !this.Active
            return
        this.CleanupOverlay()
        this.Finish(status, 0.0)
    }

    Finish(status, completionLatencyMs) {
        previous := this.PreviousForeground
        this.PreviousForeground := 0
        this.Active := false
        this.LastResult := {Status: status, OverlayLatencyMs: this.OverlayLatencyMs,
            CompletionLatencyMs: completionLatencyMs}
        if IsObject(this.FinishedCallback)
            try this.FinishedCallback.Call(status, previous, this.LastResult)
    }

    CleanupOverlay() {
        overlay := this.Overlay
        this.Overlay := 0
        if IsObject(overlay) {
            try {
                if DllCall("GetCapture", "ptr") = overlay.Hwnd
                    DllCall("ReleaseCapture")
            }
            try overlay.Destroy()
        } else {
            try DllCall("ReleaseCapture")
        }
        this.Dragging := false
        this.HasSelection := false
        arrow := DllCall("LoadCursorW", "ptr", 0, "ptr",
            ScreenshotManager.IDC_ARROW, "ptr")
        if arrow
            DllCall("SetCursor", "ptr", arrow)
    }

    InvalidateOverlay() {
        if IsObject(this.Overlay)
            DllCall("InvalidateRect", "ptr", this.Overlay.Hwnd,
                "ptr", 0, "int", false)
    }

    OnEraseBackground(wParam, lParam, msg, hwnd) {
        return this.IsOverlayWindow(hwnd) ? 1 : ""
    }

    OnSetCursor(wParam, lParam, msg, hwnd) {
        if !this.IsOverlayWindow(hwnd)
            return
        cursor := DllCall("LoadCursorW", "ptr", 0, "ptr",
            ScreenshotManager.IDC_CROSS, "ptr")
        if cursor {
            DllCall("SetCursor", "ptr", cursor)
            return true
        }
    }

    OnKeyDown(wParam, lParam, msg, hwnd) {
        if wParam = 0x1B && this.IsOverlayWindow(hwnd) {
            this.CancelFromEscape()
            return 0
        }
    }

    OnPaint(wParam, lParam, msg, hwnd) {
        if !this.IsOverlayWindow(hwnd)
            return
        paint := Buffer(A_PtrSize = 8 ? 72 : 64, 0)
        hdc := DllCall("BeginPaint", "ptr", hwnd, "ptr", paint, "ptr")
        if !hdc
            return 0
        try this.PaintOverlay(hdc, hwnd)
        finally DllCall("EndPaint", "ptr", hwnd, "ptr", paint)
        return 0
    }

    PaintOverlay(hdc, hwnd) {
        client := Buffer(16, 0)
        DllCall("GetClientRect", "ptr", hwnd, "ptr", client)
        black := DllCall("CreateSolidBrush", "uint", ScreenshotManager.ColorRef(0x020617), "ptr")
        try DllCall("FillRect", "ptr", hdc, "ptr", client, "ptr", black)
        finally DllCall("DeleteObject", "ptr", black)

        dpi := ScreenshotManager.DpiAtPoint(this.CurrentX, this.CurrentY)
        instructionFont := ScreenshotManager.CreateFont(11, 600, dpi)
        oldFont := DllCall("SelectObject", "ptr", hdc, "ptr", instructionFont, "ptr")
        oldMode := DllCall("SetBkMode", "ptr", hdc, "int", 1, "int")
        oldColor := DllCall("SetTextColor", "ptr", hdc,
            "uint", ScreenshotManager.ColorRef(0xF8FAFC), "uint")
        instruction := "Drag to select  •  Esc to cancel"
        inset := ScreenshotManager.ScaleDip(18, dpi)
        DllCall("TextOutW", "ptr", hdc, "int", inset, "int", inset,
            "str", instruction, "int", StrLen(instruction))
        DllCall("SetTextColor", "ptr", hdc, "uint", oldColor)
        DllCall("SetBkMode", "ptr", hdc, "int", oldMode)
        DllCall("SelectObject", "ptr", hdc, "ptr", oldFont)
        DllCall("DeleteObject", "ptr", instructionFont)

        if !this.HasSelection
            return
        rect := ScreenshotManager.NormalizeSelection(this.StartX, this.StartY,
            this.CurrentX, this.CurrentY, this.Bounds)
        left := rect.Left - this.Bounds.Left
        top := rect.Top - this.Bounds.Top
        right := rect.Right - this.Bounds.Left
        bottom := rect.Bottom - this.Bounds.Top
        lineWidth := Max(2, ScreenshotManager.ScaleDip(2, dpi))
        pen := DllCall("CreatePen", "int", 0, "int", lineWidth,
            "uint", ScreenshotManager.ColorRef(0x38BDF8), "ptr")
        oldPen := DllCall("SelectObject", "ptr", hdc, "ptr", pen, "ptr")
        hollow := DllCall("GetStockObject", "int", 5, "ptr")
        oldBrush := DllCall("SelectObject", "ptr", hdc, "ptr", hollow, "ptr")
        DllCall("Rectangle", "ptr", hdc, "int", left, "int", top,
            "int", right, "int", bottom)
        DllCall("SelectObject", "ptr", hdc, "ptr", oldBrush)
        DllCall("SelectObject", "ptr", hdc, "ptr", oldPen)
        DllCall("DeleteObject", "ptr", pen)

        label := rect.Width " × " rect.Height " px"
        labelFont := ScreenshotManager.CreateFont(10, 600, dpi)
        oldFont := DllCall("SelectObject", "ptr", hdc, "ptr", labelFont, "ptr")
        size := Buffer(8, 0)
        DllCall("GetTextExtentPoint32W", "ptr", hdc, "str", label,
            "int", StrLen(label), "ptr", size)
        padding := ScreenshotManager.ScaleDip(7, dpi)
        labelWidth := NumGet(size, 0, "int") + padding * 2
        labelHeight := NumGet(size, 4, "int") + padding
        labelLeft := ScreenshotManager.Clamp(left + lineWidth,
            0, Max(0, this.Bounds.Width - labelWidth))
        labelTop := top - labelHeight - lineWidth
        if labelTop < 0
            labelTop := Min(this.Bounds.Height - labelHeight, bottom + lineWidth)
        labelRect := Buffer(16, 0)
        NumPut("int", labelLeft, labelRect, 0)
        NumPut("int", labelTop, labelRect, 4)
        NumPut("int", labelLeft + labelWidth, labelRect, 8)
        NumPut("int", labelTop + labelHeight, labelRect, 12)
        labelBrush := DllCall("CreateSolidBrush", "uint",
            ScreenshotManager.ColorRef(0x0F172A), "ptr")
        DllCall("FillRect", "ptr", hdc, "ptr", labelRect, "ptr", labelBrush)
        DllCall("DeleteObject", "ptr", labelBrush)
        oldMode := DllCall("SetBkMode", "ptr", hdc, "int", 1, "int")
        oldColor := DllCall("SetTextColor", "ptr", hdc,
            "uint", ScreenshotManager.ColorRef(0xF8FAFC), "uint")
        DllCall("TextOutW", "ptr", hdc, "int", labelLeft + padding,
            "int", labelTop + Floor(padding / 2), "str", label, "int", StrLen(label))
        DllCall("SetTextColor", "ptr", hdc, "uint", oldColor)
        DllCall("SetBkMode", "ptr", hdc, "int", oldMode)
        DllCall("SelectObject", "ptr", hdc, "ptr", oldFont)
        DllCall("DeleteObject", "ptr", labelFont)
    }

    static CreateFont(points, weight, dpi) {
        height := -DllCall("MulDiv", "int", points, "int", dpi, "int", 72, "int")
        return DllCall("CreateFontW", "int", height, "int", 0, "int", 0,
            "int", 0, "int", weight, "uint", 0, "uint", 0, "uint", 0,
            "uint", 1, "uint", 0, "uint", 0, "uint", 5, "uint", 0,
            "str", "Segoe UI Variable Text", "ptr")
    }

    static ColorRef(rgb) {
        return ((rgb & 0xFF) << 16) | (rgb & 0xFF00) | ((rgb >> 16) & 0xFF)
    }

    Shutdown(notify := false) {
        if this.Stopped
            return
        this.Stopped := true
        wasActive := this.Active
        previous := this.PreviousForeground
        this.CleanupOverlay()
        this.Active := false
        this.PreviousForeground := 0
        if this.MessagesRegistered {
            try OnMessage(0x0201, this.MouseDownHandler, 0)
            try OnMessage(0x0200, this.MouseMoveHandler, 0)
            try OnMessage(0x0202, this.MouseUpHandler, 0)
            try OnMessage(0x000F, this.PaintHandler, 0)
            try OnMessage(0x0014, this.EraseHandler, 0)
            try OnMessage(0x0020, this.CursorHandler, 0)
            try OnMessage(0x0100, this.KeyHandler, 0)
            this.MessagesRegistered := false
        }
        try OnExit(this.ExitHandler, 0)
        if notify && wasActive && IsObject(this.FinishedCallback)
            try this.FinishedCallback.Call("cancelled", previous,
                {Status: "cancelled", OverlayLatencyMs: this.OverlayLatencyMs,
                    CompletionLatencyMs: 0.0})
    }

    OnProcessExit(*) => this.Shutdown(false)

    __Delete() {
        try this.Shutdown(false)
    }

    static Qpc() {
        value := 0
        DllCall("QueryPerformanceCounter", "int64*", &value)
        return value
    }

    static QpcMs(start) {
        now := 0, frequency := 0
        DllCall("QueryPerformanceCounter", "int64*", &now)
        DllCall("QueryPerformanceFrequency", "int64*", &frequency)
        return frequency ? (now - start) * 1000.0 / frequency : 0.0
    }
}
