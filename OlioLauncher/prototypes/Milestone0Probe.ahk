#Requires AutoHotkey v2.0
#SingleInstance Ignore
#Warn All, StdOut

; Milestone 0 diagnostic harness only. This is deliberately not the application entry point.
DllCall("SetProcessDpiAwarenessContext", "ptr", -4, "ptr") ; PER_MONITOR_AWARE_V2
SetWorkingDir(A_ScriptDir)
InstallKeybdHook()

class Probe {
    static ResultDir := A_ScriptDir "\results"
    static LogFile := Probe.ResultDir "\events.tsv"
    static Panel := 0
    static Overlay := 0
    static PriorForeground := 0
    static Dragging := false
    static StartX := 0
    static StartY := 0
    static SawClipboardText := false
    static SawClipboardBitmap := false
    static EscapeHandler := 0
    static ExitAfterCapture := false

    static Init() {
        DirCreate(this.ResultDir)
        OnExit((*) => this.Cleanup())
        OnMessage(0x02E0, (wParam, lParam, msg, hwnd) => this.OnDpiChanged(wParam, lParam, hwnd))
        OnMessage(0x0201, (w, l, m, h) => this.CaptureMouseDown(w, l, m, h))
        OnMessage(0x0200, (w, l, m, h) => this.CaptureMouseMove(w, l, m, h))
        OnMessage(0x0202, (w, l, m, h) => this.CaptureMouseUp(w, l, m, h))
        this.EscapeHandler := (*) => this.CancelCapture()
        Hotkey("Escape", this.EscapeHandler, "Off")
    }

    static Timestamp() => FormatTime(, "yyyy-MM-dd'T'HH:mm:ss")

    static Append(kind, detail) {
        ; Metadata only: never record clipboard contents, keystrokes, or captured pixels.
        FileAppend(this.Timestamp() "`t" kind "`t" detail "`n", this.LogFile, "UTF-8")
    }

    static BuildPanel() {
        if this.Panel
            return
        panel := Gui("+AlwaysOnTop -Caption +ToolWindow +Border", "Olio M0 panel probe")
        panel.BackColor := "20242B"
        panel.SetFont("s10 cFFFFFF", "Segoe UI")
        panel.AddText("xm ym", "Milestone 0 diagnostic panel")
        panel.AddText("xm y+8 vMetrics w320", "Not measured")
        panel.OnEvent("Escape", (*) => panel.Hide())
        this.Panel := panel
    }

    static ForegroundWorkArea() {
        hwnd := DllCall("GetForegroundWindow", "ptr")
        monitor := DllCall("MonitorFromWindow", "ptr", hwnd, "uint", 2, "ptr")
        info := Buffer(40, 0)
        NumPut("uint", 40, info, 0)
        if !DllCall("GetMonitorInfoW", "ptr", monitor, "ptr", info)
            throw OSError()
        dpi := hwnd ? DllCall("GetDpiForWindow", "ptr", hwnd, "uint") : 96
        if !dpi
            dpi := 96
        return {
            Left: NumGet(info, 20, "int"), Top: NumGet(info, 24, "int"),
            Right: NumGet(info, 28, "int"), Bottom: NumGet(info, 32, "int"),
            Dpi: dpi, Hwnd: hwnd
        }
    }

    static ShowPanel(measure := true) {
        this.BuildPanel()
        area := this.ForegroundWorkArea()
        this.PriorForeground := area.Hwnd
        width := Round(360 * area.Dpi / 96)
        height := area.Bottom - area.Top
        x := area.Right - width
        start := this.Qpc()
        this.Panel.Show("x" x " y" area.Top " w" width " h" height)
        ; UpdateWindow is bounded in disconnected/locked sessions, unlike DwmFlush.
        ; This measures the hotkey handler through synchronous client-area painting.
        DllCall("UpdateWindow", "ptr", this.Panel.Hwnd)
        elapsed := this.QpcMs(start)
        this.Panel["Metrics"].Text := "DPI " area.Dpi " (" Round(area.Dpi / 96 * 100) "%)`n"
            . "Work area " area.Left "," area.Top " - " area.Right "," area.Bottom "`n"
            . "Show-to-UpdateWindow " Format("{:.3f}", elapsed) " ms"
        if measure
            this.Append("panel", "dpi=" area.Dpi ";work=" area.Left "," area.Top "," area.Right "," area.Bottom ";show_to_update_ms=" Format("{:.3f}", elapsed))
        return elapsed
    }

    static TogglePanel(*) {
        this.BuildPanel()
        if DllCall("IsWindowVisible", "ptr", this.Panel.Hwnd)
            this.Panel.Hide()
        else
            this.ShowPanel()
    }

    static OnDpiChanged(wParam, lParam, hwnd) {
        if !this.Panel || hwnd != this.Panel.Hwnd
            return
        left := NumGet(lParam, 0, "int"), top := NumGet(lParam, 4, "int")
        right := NumGet(lParam, 8, "int"), bottom := NumGet(lParam, 12, "int")
        DllCall("SetWindowPos", "ptr", hwnd, "ptr", 0, "int", left, "int", top,
            "int", right - left, "int", bottom - top, "uint", 0x0014)
        this.Append("dpi-change", "dpi=" (wParam & 0xFFFF) ";rect=" left "," top "," right "," bottom)
        return 0
    }

    static ClipboardChanged(type) {
        text := DllCall("IsClipboardFormatAvailable", "uint", 13) ; CF_UNICODETEXT
        bitmap := DllCall("IsClipboardFormatAvailable", "uint", 2)
            || DllCall("IsClipboardFormatAvailable", "uint", 8)
            || DllCall("IsClipboardFormatAvailable", "uint", 17)
        hasText := text ? 1 : 0
        hasBitmap := bitmap ? 1 : 0
        this.SawClipboardText := this.SawClipboardText || hasText
        this.SawClipboardBitmap := this.SawClipboardBitmap || hasBitmap
        this.Append("clipboard", "callback_type=" type ";text=" hasText ";bitmap=" hasBitmap)
        ToolTip("Clipboard callback: type=" type " text=" hasText " bitmap=" hasBitmap)
        SetTimer(() => ToolTip(), -1200)
    }

    static StartClipboardProbe() {
        OnClipboardChange((type) => this.ClipboardChanged(type), 1)
        this.Append("clipboard-probe", "started")
        MsgBox("Clipboard callback probe is active.`n`nCopy text and an image, then inspect prototypes\results\events.tsv. Clipboard content is never logged.`n`nPress Ctrl+Alt+Q to exit.", "Olio Milestone 0")
    }

    static RunClipboardSelfTest() {
        savedClipboard := ClipboardAll()
        this.SawClipboardText := false
        this.SawClipboardBitmap := false
        callback := (type) => this.ClipboardChanged(type)
        OnClipboardChange(callback, 1)
        try {
            A_Clipboard := "Olio Milestone 0 callback marker " A_TickCount
            ClipWait(1)
            Sleep(100)
            area := this.ForegroundWorkArea()
            this.CopyScreenRectToClipboard(area.Left, area.Top, 16, 16)
            Sleep(100)
        } finally {
            OnClipboardChange(callback, -1)
            A_Clipboard := savedClipboard
        }
        filePath := this.ResultDir "\clipboard-self-test.tsv"
        if !FileExist(filePath)
            FileAppend("timestamp`ttext_callback`tbitmap_callback`tclipboard_restored`tcontent_logged`n", filePath, "UTF-8")
        FileAppend(this.Timestamp() "`t" (this.SawClipboardText ? 1 : 0) "`t" (this.SawClipboardBitmap ? 1 : 0)
            "`t1`tno`n", filePath, "UTF-8")
        ExitApp(this.SawClipboardText && this.SawClipboardBitmap ? 0 : 1)
    }

    static SuppressF23(direction) {
        leftWin := GetKeyState("LWin", "P") ? 1 : 0
        leftShift := GetKeyState("LShift", "P") ? 1 : 0
        rightWin := GetKeyState("RWin", "P") ? 1 : 0
        rightShift := GetKeyState("RShift", "P") ? 1 : 0
        this.Append("focus-key", "key=F23;direction=" direction ";vk=86;sc=06E;lwin=" leftWin
            ";lshift=" leftShift ";rwin=" rightWin ";rshift=" rightShift ";suppressed=1")
        ToolTip("Suppressed F23 " direction " (Win=" (leftWin || rightWin) " Shift=" (leftShift || rightShift) ")")
        SetTimer(() => ToolTip(), -1200)
    }

    static StartHotkeyProbe() {
        this.Append("hotkey-probe", "started;ahk=" A_AhkVersion ";os=" A_OSVersion)
        MsgBox("Hotkey probe is active.`n`nPress the laptop Copilot key several times. F23 down/up events and physical Win/Shift state are timestamped and suppressed, so Windows Settings should not open. Press F8 to inspect key history.`n`nPress Ctrl+Alt+Q to exit.", "Olio Milestone 0")
    }

    static BeginCapture(*) {
        if IsObject(this.Overlay)
            return
        try {
            vx := SysGet(76), vy := SysGet(77), vw := SysGet(78), vh := SysGet(79)
            ; Milestone 0 needs to prove drag bounds and clipboard-only capture. A
            ; separate visual border window added re-entrancy without proving more.
            overlay := Gui("+AlwaysOnTop -Caption +ToolWindow", "Olio M0 capture overlay")
            overlay.BackColor := "000000"
            this.Overlay := overlay
            overlay.Show("x" vx " y" vy " w" vw " h" vh)
            WinSetTransparent(90, "ahk_id " overlay.Hwnd)
            Hotkey("Escape", "On")
            this.Append("capture", "selection-started;virtual=" vx "," vy "," vw "," vh)
        } catch as error {
            this.FailCapture(error)
        }
    }

    static CursorPos() {
        point := Buffer(8, 0)
        DllCall("GetCursorPos", "ptr", point)
        return {X: NumGet(point, 0, "int"), Y: NumGet(point, 4, "int")}
    }

    static CaptureMouseDown(wParam, lParam, msg, hwnd) {
        if !IsObject(this.Overlay) || hwnd != this.Overlay.Hwnd
            return
        try {
            point := this.CursorPos()
            this.StartX := point.X, this.StartY := point.Y, this.Dragging := true
        } catch as error {
            this.FailCapture(error)
        }
    }

    static CaptureMouseMove(wParam, lParam, msg, hwnd) {
        if !this.Dragging || !IsObject(this.Overlay) || hwnd != this.Overlay.Hwnd
            return
        ; Bounds are read on mouse-up. The production selection outline is Milestone 3.
    }

    static CaptureMouseUp(wParam, lParam, msg, hwnd) {
        if !this.Dragging || !IsObject(this.Overlay) || hwnd != this.Overlay.Hwnd
            return
        try {
            this.Dragging := false
            point := this.CursorPos()
            x := Min(this.StartX, point.X), y := Min(this.StartY, point.Y)
            w := Abs(point.X - this.StartX), h := Abs(point.Y - this.StartY)
            this.DestroyCaptureWindows()
            if w < 2 || h < 2 {
                this.Append("capture", "cancelled;reason=empty-selection")
                this.FinishOneShotCapture()
                return
            }
            Sleep(50)
            this.CopyScreenRectToClipboard(x, y, w, h)
            this.Append("capture", "completed;rect=" x "," y "," w "," h ";clipboard_format=CF_BITMAP;file_output=none")
            this.FinishOneShotCapture()
        } catch as error {
            this.FailCapture(error)
        }
    }

    static CopyScreenRectToClipboard(x, y, width, height) {
        screenDC := DllCall("GetDC", "ptr", 0, "ptr")
        memoryDC := DllCall("CreateCompatibleDC", "ptr", screenDC, "ptr")
        bitmap := DllCall("CreateCompatibleBitmap", "ptr", screenDC, "int", width, "int", height, "ptr")
        old := DllCall("SelectObject", "ptr", memoryDC, "ptr", bitmap, "ptr")
        try {
            if !DllCall("BitBlt", "ptr", memoryDC, "int", 0, "int", 0, "int", width, "int", height,
                "ptr", screenDC, "int", x, "int", y, "uint", 0x00CC0020 | 0x40000000)
                throw OSError()
        } finally {
            DllCall("SelectObject", "ptr", memoryDC, "ptr", old)
            DllCall("DeleteDC", "ptr", memoryDC)
            DllCall("ReleaseDC", "ptr", 0, "ptr", screenDC)
        }
        if !DllCall("OpenClipboard", "ptr", A_ScriptHwnd)
            throw OSError()
        transferred := false
        try {
            DllCall("EmptyClipboard")
            if !DllCall("SetClipboardData", "uint", 2, "ptr", bitmap, "ptr")
                throw OSError()
            transferred := true ; Clipboard now owns the HBITMAP.
        } finally {
            DllCall("CloseClipboard")
            if !transferred
                DllCall("DeleteObject", "ptr", bitmap)
        }
    }

    static CancelCapture(*) {
        if !IsObject(this.Overlay)
            return
        this.DestroyCaptureWindows()
        this.Append("capture", "cancelled;clipboard=unchanged")
        this.FinishOneShotCapture()
    }

    static FailCapture(error) {
        this.DestroyCaptureWindows()
        try this.Append("capture-error", "type=" Type(error) ";message=" error.Message)
        MsgBox("The capture probe stopped safely and released its overlay.`n`n" error.Message,
            "Olio Milestone 0 capture error", "Iconx")
        this.FinishOneShotCapture()
    }

    static FinishOneShotCapture() {
        if this.ExitAfterCapture
            ExitApp(0)
    }

    static RunCaptureSelfTest(iterations := 25) {
        ; Preserve the user's clipboard while proving that repeated GDI capture stays
        ; in memory and publishes a bitmap format without an encoder or file path.
        savedClipboard := ClipboardAll()
        beforeGdi := DllCall("GetGuiResources", "ptr", DllCall("GetCurrentProcess", "ptr"), "uint", 0, "uint")
        area := this.ForegroundWorkArea()
        try {
            Loop iterations
                this.CopyScreenRectToClipboard(area.Left, area.Top, 16, 16)
            bitmapAvailable := DllCall("IsClipboardFormatAvailable", "uint", 2) ? 1 : 0
        } finally {
            A_Clipboard := savedClipboard
        }
        Sleep(100)
        afterGdi := DllCall("GetGuiResources", "ptr", DllCall("GetCurrentProcess", "ptr"), "uint", 0, "uint")
        filePath := this.ResultDir "\capture-self-test.tsv"
        if !FileExist(filePath)
            FileAppend("timestamp`titerations`tcf_bitmap_available`tgdi_before`tgdi_after`tgdi_delta`tfile_output`n", filePath, "UTF-8")
        FileAppend(this.Timestamp() "`t" iterations "`t" bitmapAvailable "`t" beforeGdi "`t" afterGdi
            "`t" (afterGdi - beforeGdi) "`tnone`n", filePath, "UTF-8")
        ExitApp(bitmapAvailable && afterGdi <= beforeGdi + 1 ? 0 : 1)
    }

    static DestroyCaptureWindows() {
        try Hotkey("Escape", "Off")
        overlay := this.Overlay
        this.Overlay := 0
        this.Dragging := false
        if IsObject(overlay) {
            try overlay.Destroy()
        }
        ToolTip()
    }

    static RunBenchmark(iterations := 50) {
        this.Append("benchmark-phase", "start;iterations=" iterations)
        this.BuildPanel()
        this.Append("benchmark-phase", "panel-built")
        times := []
        Loop iterations {
            times.Push(this.ShowPanel(false))
            this.Panel.Hide()
        }
        this.Append("benchmark-phase", "iterations-complete")
        times := this.SortNumbers(times)
        workingSet := this.WorkingSetBytes()
        line := this.Timestamp() "`t" A_AhkVersion "`t" A_OSVersion "`t" A_Is64bitOS
            . "`t" iterations "`t" Format("{:.3f}", this.Average(times))
            . "`t" Format("{:.3f}", times[Ceil(times.Length * 0.95)])
            . "`t" workingSet "`n"
        filePath := this.ResultDir "\runtime-baseline.tsv"
        if !FileExist(filePath)
            FileAppend("timestamp`tahk_version`tos_version`tos_64bit`titerations`tshow_mean_ms`tshow_p95_ms`tworking_set_bytes`n", filePath, "UTF-8")
        FileAppend(line, filePath, "UTF-8")
        this.Panel.Destroy()
        this.Panel := 0
        ExitApp(0)
    }

    static RunColdStartProbe() {
        ; Exercise runtime startup, script parsing, native GUI construction, and active-
        ; monitor geometry without ever showing a window. Visible latency is measured
        ; separately by the interactive benchmark mode.
        this.BuildPanel()
        area := this.ForegroundWorkArea()
        width := Round(360 * area.Dpi / 96)
        unusedGeometry := area.Right - width + area.Top + area.Bottom
        ExitApp(this.Panel.Hwnd && unusedGeometry != "" ? 0 : 1)
    }

    static StartHiddenResidentProbe() {
        ; A resident launcher is normally hidden while idle. Keep the native GUI and
        ; hotkey hook allocated, but never call Gui.Show during CPU/memory sampling.
        this.BuildPanel()
        this.Append("resident-probe", "started;window_visible=0")
    }

    static SortNumbers(values) {
        sorted := []
        for value in values {
            inserted := false
            for index, existing in sorted {
                if value < existing {
                    sorted.InsertAt(index, value)
                    inserted := true
                    break
                }
            }
            if !inserted
                sorted.Push(value)
        }
        return sorted
    }

    static WorkingSetBytes() {
        counters := Buffer(A_PtrSize = 8 ? 80 : 40, 0)
        NumPut("uint", counters.Size, counters, 0)
        if !DllCall("psapi\GetProcessMemoryInfo", "ptr", DllCall("GetCurrentProcess", "ptr"), "ptr", counters, "uint", counters.Size)
            throw OSError()
        return NumGet(counters, A_PtrSize = 8 ? 16 : 12, "uptr")
    }

    static Average(values) {
        sum := 0.0
        for value in values
            sum += value
        return sum / values.Length
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
        return (now - start) * 1000.0 / frequency
    }

    static Cleanup() {
        if this.Overlay
            this.DestroyCaptureWindows()
    }
}

Probe.Init()

; The Copilot key is LWin+LShift+F23 on the target laptop. The wildcard keeps the
; physical modifier state observable while the absence of '~' suppresses F23 from
; reaching Windows. Suppress both edges so the native Settings action cannot trigger.
*F23::Probe.SuppressF23("down")
*F23 Up::Probe.SuppressF23("up")
F8::KeyHistory()
^!q::ExitApp()
^!F12::Probe.TogglePanel()
^!s::Probe.BeginCapture()

mode := A_Args.Length ? A_Args[1] : "help"
switch mode {
    case "hotkey": Probe.StartHotkeyProbe()
    case "panel": Probe.ShowPanel()
    case "clipboard": Probe.StartClipboardProbe()
    case "clipboard-test": Probe.RunClipboardSelfTest()
    case "capture":
        Probe.ExitAfterCapture := true
        Probe.BeginCapture()
    case "capture-test": Probe.RunCaptureSelfTest(A_Args.Length > 1 ? Integer(A_Args[2]) : 25)
    case "benchmark": Probe.RunBenchmark(A_Args.Length > 1 ? Integer(A_Args[2]) : 50)
    case "cold-start": Probe.RunColdStartProbe()
    case "resident": Probe.StartHiddenResidentProbe()
    case "syntax-check": ExitApp(0)
    default:
        MsgBox("Milestone 0 diagnostic harness`n`nModes: hotkey | panel | clipboard | capture | benchmark | cold-start | resident`n`nGlobal exit: Ctrl+Alt+Q", "Olio Launcher")
}
