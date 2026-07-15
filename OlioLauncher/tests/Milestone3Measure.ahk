#Requires AutoHotkey v2.0.26
#Warn All, StdOut
Persistent

DllCall("SetProcessDpiAwarenessContext", "ptr", -4, "ptr")

#Include ..\src\WindowsInterop.ahk
#Include ..\src\ClipboardManager.ahk
#Include ..\src\ScreenshotManager.ahk

class Milestone3Measure {
    static Run() {
        this.AssertNoResidentLauncher()
        savedClipboard := ClipboardAll()
        manager := ScreenshotManager()
        try {
            A_Clipboard := "Olio Milestone 3 cancellation measurement " A_TickCount
            ClipWait(1)
            ; Warm only the AutoHotkey GUI runtime outside the visible desktop so the
            ; actual overlay measurement excludes one-time class initialization.
            if !manager.Begin(0, {Left: -32000, Top: -32000,
                Right: -31936, Bottom: -31936, Width: 64, Height: 64})
                throw Error("Overlay warmup failed.")
            warmupDc := DllCall("GetDC", "ptr", manager.Overlay.Hwnd, "ptr")
            if warmupDc {
                try manager.PaintOverlay(warmupDc, manager.Overlay.Hwnd)
                finally DllCall("ReleaseDC", "ptr", manager.Overlay.Hwnd,
                    "ptr", warmupDc)
            }
            manager.Cancel()
            Sleep(250)

            clipboardBeforeCancel := ClipboardAll()
            sequenceBeforeCancel := DllCall("GetClipboardSequenceNumber", "uint")
            beforeOverlay := this.ResourceCounts()
            if !manager.Begin()
                throw Error("Full virtual-desktop overlay failed.")
            overlayMs := manager.OverlayLatencyMs
            Sleep(60)
            manager.Cancel()
            Sleep(250)
            afterOverlay := this.ResourceCounts()
            clipboardAfterCancel := ClipboardAll()
            cancellationPreserved := sequenceBeforeCancel
                = DllCall("GetClipboardSequenceNumber", "uint")
                && this.ClipboardEqual(clipboardBeforeCancel, clipboardAfterCancel)
            if !cancellationPreserved
                throw Error("Automated cancellation changed the clipboard.")

            virtual := ScreenshotManager.VirtualDesktopBounds()
            smallWidth := Min(320, virtual.Width)
            smallHeight := Min(180, virtual.Height)
            smallLeft := virtual.Left + Floor((virtual.Width - smallWidth) / 2)
            smallTop := virtual.Top + Floor((virtual.Height - smallHeight) / 2)
            small := {Left: smallLeft, Top: smallTop,
                Right: smallLeft + smallWidth, Bottom: smallTop + smallHeight,
                Width: smallWidth, Height: smallHeight}
            smallMs := this.MeasurePublish(manager, small)

            large := this.RepresentativeLargeRect(virtual, &largeKind, &monitorCount)
            largeMs := this.MeasurePublish(manager, large)
            Sleep(150)
            afterCapture := this.ResourceCounts()
            line := "MILESTONE3_MEASURE`tPASS`tmonitor_count=" monitorCount
                . ";overlay_ms=" Format("{:.3f}", overlayMs)
                . ";small=" small.Width "x" small.Height
                . ";small_ms=" Format("{:.3f}", smallMs)
                . ";large_kind=" largeKind
                . ";large=" large.Width "x" large.Height
                . ";large_ms=" Format("{:.3f}", largeMs)
                . ";cancel_preserved=1"
                . ";overlay_gdi_delta=" (afterOverlay.Gdi - beforeOverlay.Gdi)
                . ";overlay_user_delta=" (afterOverlay.User - beforeOverlay.User)
                . ";capture_gdi_delta=" (afterCapture.Gdi - afterOverlay.Gdi)
                . ";capture_user_delta=" (afterCapture.User - afterOverlay.User)
                . ";capture_handle_delta=" (afterCapture.Handles - afterOverlay.Handles)
                . ";capture_private_delta=" (afterCapture.Private - afterOverlay.Private)
            FileAppend(line "`n", "*", "UTF-8")
        } finally {
            if manager.Active
                manager.Cancel()
            manager.Shutdown(false)
            A_Clipboard := savedClipboard
        }
        ExitApp(0)
    }

    static MeasurePublish(manager, rect) {
        started := ScreenshotManager.Qpc()
        bitmap := ScreenshotManager.CaptureScreenRect(rect)
        if !bitmap
            throw Error("Representative screen capture failed.")
        if !manager.PublishBitmap(bitmap) {
            DllCall("DeleteObject", "ptr", bitmap)
            throw Error("Representative clipboard publish failed.")
        }
        return ScreenshotManager.QpcMs(started)
    }

    static RepresentativeLargeRect(virtual, &kind, &monitorCount) {
        monitorCount := SysGet(80)
        if monitorCount > 1 {
            MonitorGet(1, &left1, &top1, &right1, &bottom1)
            MonitorGet(2, &left2, &top2, &right2, &bottom2)
            centerX1 := Floor((left1 + right1) / 2)
            centerY1 := Floor((top1 + bottom1) / 2)
            centerX2 := Floor((left2 + right2) / 2)
            centerY2 := Floor((top2 + bottom2) / 2)
            left := Max(virtual.Left, Min(centerX1, centerX2) - 200)
            right := Min(virtual.Right, Max(centerX1, centerX2) + 200)
            top := Max(virtual.Top, Min(centerY1, centerY2) - 150)
            bottom := Min(virtual.Bottom, Max(centerY1, centerY2) + 150)
            kind := "multi-monitor"
            return {Left: left, Top: top, Right: right, Bottom: bottom,
                Width: right - left, Height: bottom - top}
        }
        width := Min(1600, virtual.Width)
        height := Min(900, virtual.Height)
        left := virtual.Left + Floor((virtual.Width - width) / 2)
        top := virtual.Top + Floor((virtual.Height - height) / 2)
        kind := "single-monitor-large"
        return {Left: left, Top: top, Right: left + width, Bottom: top + height,
            Width: width, Height: height}
    }

    static AssertNoResidentLauncher() {
        handle := DllCall("OpenMutexW", "uint", 0x00100000, "int", false,
            "str", "Local\OlioLauncher.SingleInstance.v1", "ptr")
        if handle {
            DllCall("CloseHandle", "ptr", handle)
            throw Error("A resident launcher is running; measurement stopped without touching it.")
        }
    }

    static ClipboardEqual(first, second) {
        if !IsObject(first) || !IsObject(second) || first.Size != second.Size
            return false
        return !first.Size || DllCall("msvcrt\memcmp", "ptr", first.Ptr,
            "ptr", second.Ptr, "uptr", first.Size, "int") = 0
    }

    static ResourceCounts() {
        process := DllCall("GetCurrentProcess", "ptr")
        handles := 0
        DllCall("GetProcessHandleCount", "ptr", process, "uint*", &handles)
        counters := Buffer(A_PtrSize = 8 ? 80 : 44, 0)
        NumPut("uint", counters.Size, counters, 0)
        DllCall("psapi\GetProcessMemoryInfo", "ptr", process,
            "ptr", counters, "uint", counters.Size)
        return {
            Gdi: DllCall("GetGuiResources", "ptr", process, "uint", 0, "uint"),
            User: DllCall("GetGuiResources", "ptr", process, "uint", 1, "uint"),
            Handles: handles,
            WorkingSet: NumGet(counters, A_PtrSize = 8 ? 16 : 12, "uptr"),
            Private: NumGet(counters, A_PtrSize = 8 ? 72 : 40, "uptr")
        }
    }
}

try Milestone3Measure.Run()
catch as measurementError {
    detail := SubStr(RegExReplace(measurementError.Message, "[\r\n\t]", " "), 1, 180)
    FileAppend("MILESTONE3_MEASURE`tFAIL`t" detail "`n", "*", "UTF-8")
    ExitApp(1)
}
