#Requires AutoHotkey v2.0.26
#Warn All, StdOut
Persistent

DllCall("SetProcessDpiAwarenessContext", "ptr", -4, "ptr")

#Include ..\src\WindowsInterop.ahk
#Include ..\src\ClipboardManager.ahk
#Include ..\src\FocusKeyGesture.ahk
#Include ..\src\ScreenshotManager.ahk

class Milestone3Tests {
    static Passed := 0
    static OverlayLatencyMs := 0.0
    static SmallCaptureMs := 0.0
    static RepeatedCaptureMs := 0.0
    static GdiDelta := 0
    static UserDelta := 0
    static HandleDelta := 0
    static PrivateDelta := 0
    static WorkingSetDelta := 0
    static RapidActivationMs := 0.0
    static PrivacyMarker := ""

    static Assert(condition, message) {
        if !condition
            throw Error(message)
        this.Passed += 1
    }

    static Settings() {
        return Map("clipboardPaused", false, "sensitiveApplications", "")
    }

    static Run() {
        if A_Args.Length && A_Args[1] = "--logic-only" {
            this.TestDirectionalGeometry()
            this.TestCrossMonitorAndNegativeGeometry()
            this.TestDpiScaling()
            this.TestRapidFocusKeyGesture()
            this.WriteResult("PASS", this.Passed " logic-only assertions")
            ExitApp(0)
        }
        this.AssertNoResidentLauncher()
        repositorySnapshot := this.SnapshotFiles(A_ScriptDir "\..")
        savedClipboard := ClipboardAll()
        try {
            this.TestDirectionalGeometry()
            this.TestCrossMonitorAndNegativeGeometry()
            this.TestDpiScaling()
            this.TestRapidFocusKeyGesture()
            this.TestPixelCapture()
            this.TestClipboardPlacementAndSuppression()
            this.TestEscapeCancellation()
            this.TestInvalidSelection()
            this.TestExitCleanup()
            this.TestOverlaySuccessCleanup()
            this.TestClipboardContention()
            this.TestRapidActivation()
            this.TestRepeatedCaptureCleanup()
        } finally {
            A_Clipboard := savedClipboard
        }
        Sleep(75)
        this.TestPrivacy(repositorySnapshot)
        summary := this.Passed " assertions"
            . ";overlay_ms=" Format("{:.3f}", this.OverlayLatencyMs)
            . ";small_capture_ms=" Format("{:.3f}", this.SmallCaptureMs)
            . ";repeat_ms=" Format("{:.3f}", this.RepeatedCaptureMs)
            . ";gdi_delta=" this.GdiDelta ";user_delta=" this.UserDelta
            . ";handle_delta=" this.HandleDelta
            . ";private_delta=" this.PrivateDelta
            . ";working_set_delta=" this.WorkingSetDelta
            . ";rapid_activation_ms=" Format("{:.3f}", this.RapidActivationMs)
        this.WriteResult("PASS", summary)
        ExitApp(0)
    }

    static AssertNoResidentLauncher() {
        handle := DllCall("OpenMutexW", "uint", 0x00100000, "int", false,
            "str", "Local\OlioLauncher.SingleInstance.v1", "ptr")
        if handle {
            DllCall("CloseHandle", "ptr", handle)
            throw Error("A resident Olio Launcher is running; its memory-only history was not disturbed.")
        }
        this.Assert(true, "Resident-launcher isolation check failed.")
    }

    static TestDirectionalGeometry() {
        lr := ScreenshotManager.NormalizeSelection(10, 20, 110, 220)
        rl := ScreenshotManager.NormalizeSelection(110, 20, 10, 220)
        tb := ScreenshotManager.NormalizeSelection(10, 20, 110, 220)
        bt := ScreenshotManager.NormalizeSelection(10, 220, 110, 20)
        for rect in [lr, rl, tb, bt] {
            this.Assert(rect.Left = 10 && rect.Top = 20,
                "Directional selection origin is incorrect.")
            this.Assert(rect.Width = 100 && rect.Height = 200,
                "Directional selection dimensions are incorrect.")
        }
        diagonal := ScreenshotManager.NormalizeSelection(110, 220, 10, 20)
        this.Assert(diagonal.Left = 10 && diagonal.Top = 20
            && diagonal.Width = 100 && diagonal.Height = 200,
            "Reverse diagonal dragging is incorrect.")
    }

    static TestCrossMonitorAndNegativeGeometry() {
        virtual := {Left: -2560, Top: -900, Right: 1920, Bottom: 1440,
            Width: 4480, Height: 2340}
        crossing := ScreenshotManager.NormalizeSelection(-320, 150, 480, 650, virtual)
        this.Assert(crossing.Left = -320 && crossing.Right = 480
            && crossing.Width = 800,
            "A selection crossing the primary-monitor boundary is incorrect.")
        negative := ScreenshotManager.NormalizeSelection(-2100, -700, -400, -100, virtual)
        this.Assert(negative.Left = -2100 && negative.Top = -700
            && negative.Width = 1700 && negative.Height = 600,
            "Negative virtual-desktop coordinates were clamped to zero.")
        clamped := ScreenshotManager.NormalizeSelection(-5000, -2000,
            5000, 3000, virtual)
        this.Assert(clamped.Left = virtual.Left && clamped.Top = virtual.Top
            && clamped.Right = virtual.Right && clamped.Bottom = virtual.Bottom,
            "Out-of-range points were not clamped to the virtual desktop.")
    }

    static TestDpiScaling() {
        this.Assert(ScreenshotManager.ScaleDip(100, 96) = 100,
            "100% DPI scaling is incorrect.")
        this.Assert(ScreenshotManager.ScaleDip(100, 120) = 125,
            "125% DPI scaling is incorrect.")
        this.Assert(ScreenshotManager.ScaleDip(100, 144) = 150,
            "150% DPI scaling is incorrect.")
        this.Assert(ScreenshotManager.ScaleDip(8, 120) = 10
            && ScreenshotManager.ScaleDip(8, 144) = 12,
            "Selection-feedback metrics do not scale by monitor DPI.")
        ; Per-Monitor V2 gives GetCursorPos and the screen DC physical coordinates.
        ; A mixed-DPI boundary must therefore retain physical pixels without rescaling.
        mixed := ScreenshotManager.NormalizeSelection(-125, 300, 150, 700,
            {Left: -2560, Top: 0, Right: 1920, Bottom: 1440,
                Width: 4480, Height: 1440})
        this.Assert(mixed.Left = -125 && mixed.Width = 275 && mixed.Height = 400,
            "Mixed-DPI physical coordinates were virtualized unexpectedly.")
    }

    static TestRapidFocusKeyGesture() {
        gesture := FocusKeyGesture(350)
        this.Assert(!gesture.Press(1000),
            "A single Focus Key press was mistaken for a double press.")
        this.Assert(gesture.LastResult = "first",
            "The first Focus Key press was not marked for deferred single-toggle handling.")
        this.Assert(!gesture.Press(1100),
            "Held-key repeat was mistaken for a released second press.")
        this.Assert(gesture.LastResult = "repeat",
            "Held-key repeat was not distinguished from a new press.")
        gesture.Release()
        this.Assert(gesture.Press(1250),
            "Two released Focus Key presses inside 350 ms were not recognized.")
        this.Assert(gesture.LastResult = "double",
            "The rapid second press was not marked for direct screenshot handling.")
        gesture.Release()
        this.Assert(!gesture.Press(2000),
            "The completed double-press gesture did not reset.")
        gesture.Release()
        this.Assert(!gesture.Press(2400),
            "Two Focus Key presses outside 350 ms were recognized as rapid.")
        gesture.Release()
        this.Assert(gesture.Press(2700),
            "A later valid rapid double press was not recognized.")
    }

    static TestPixelCapture() {
        fixture := this.CreatePatternFixture(4, 3)
        captured := 0
        try {
            captured := ScreenshotManager.CopyPixelsToBitmap(fixture.Dc, 1, 1, 3, 2)
            this.Assert(captured != 0, "The in-memory GDI pixel copy failed.")
            dimensions := this.BitmapDimensions(captured)
            this.Assert(dimensions.Width = 3 && dimensions.Height = 2,
                "Captured bitmap dimensions are not exact.")
            this.Assert(this.BitmapPixel(captured, 0, 0) = 0x112233,
                "Representative left-side capture pixel is incorrect.")
            this.Assert(this.BitmapPixel(captured, 1, 0) = 0xA1B2C3,
                "Representative boundary-crossing capture pixel is incorrect.")
            this.Assert(this.BitmapPixel(captured, 2, 1) = 0xA1B2C3,
                "Representative lower capture pixel is incorrect.")
        } finally {
            if captured
                DllCall("DeleteObject", "ptr", captured)
            this.DestroyPatternFixture(fixture)
        }
    }

    static TestClipboardPlacementAndSuppression() {
        history := ClipboardManager(this.Settings())
        publisher := ScreenshotManager(history)
        history.Start()
        fixture := this.CreatePatternFixture(3, 2)
        bitmap := 0
        try {
            bitmap := ScreenshotManager.CopyPixelsToBitmap(fixture.Dc, 0, 0, 3, 2)
            this.Assert(bitmap != 0, "Clipboard bitmap fixture could not be created.")
            this.Assert(publisher.PublishBitmap(bitmap),
                "A captured bitmap could not be placed on the clipboard.")
            bitmap := 0 ; clipboard owns it
            this.Assert(DllCall("IsClipboardFormatAvailable", "uint", 2),
                "CF_BITMAP is unavailable after a successful screenshot publish.")
            if !DllCall("OpenClipboard", "ptr", A_ScriptHwnd)
                throw Error("The published clipboard bitmap could not be inspected.")
            try clipboardBitmap := DllCall("GetClipboardData", "uint", 2, "ptr")
            finally DllCall("CloseClipboard")
            dimensions := this.BitmapDimensions(clipboardBitmap)
            this.Assert(dimensions.Width = 3 && dimensions.Height = 2,
                "Clipboard bitmap dimensions changed during ownership transfer.")
            this.Assert(history.Entries.Length = 1,
                "The captured screenshot was not added to Clipboard History.")
            entry := history.Entries[1]
            this.Assert(entry.Kind = "image" && entry.Width = 3 && entry.Height = 2,
                "The screenshot history entry has incorrect type or dimensions.")
            this.Assert(this.DibPixel(entry.Dib, 0, 0) = 0x112233
                && this.DibPixel(entry.Dib, 2, 1) = 0xA1B2C3,
                "The screenshot history entry does not retain representative pixels.")
            history.OnClipboardChanged(2)
            Sleep(40)
            this.Assert(history.Entries.Length = 1,
                "The launcher-generated clipboard event duplicated the screenshot history entry.")
            this.Assert(history.MutationDepth = 0 && history.SuppressedSequence != 0,
                "Screenshot clipboard-event suppression did not unwind cleanly.")
        } finally {
            if bitmap
                DllCall("DeleteObject", "ptr", bitmap)
            this.DestroyPatternFixture(fixture)
            publisher.Shutdown(false)
            history.Shutdown()
        }
    }

    static TestEscapeCancellation() {
        this.PrivacyMarker := "olio-m3-private-" DllCall("GetCurrentProcessId", "uint")
            . "-" A_TickCount
        A_Clipboard := this.PrivacyMarker
        ClipWait(1)
        before := ClipboardAll()
        sequence := DllCall("GetClipboardSequenceNumber", "uint")
        callbackStatus := "", callbackPrevious := 0
        manager := ScreenshotManager(0, (status, previous, result) =>
            (callbackStatus := status, callbackPrevious := previous))
        try {
            this.Assert(manager.Begin(24680, this.OffscreenBounds()),
                "The isolated cancellation overlay did not start.")
            this.OverlayLatencyMs := manager.OverlayLatencyMs
            hwnd := manager.Overlay.Hwnd
            manager.OnKeyDown(0x1B, 0, 0, hwnd)
            after := ClipboardAll()
            this.Assert(callbackStatus = "cancelled" && callbackPrevious = 24680,
                "Escape cancellation did not return the prior focus target.")
            this.Assert(DllCall("GetClipboardSequenceNumber", "uint") = sequence,
                "Escape cancellation changed the clipboard sequence.")
            this.Assert(this.ClipboardEqual(before, after),
                "Escape cancellation did not preserve the prior clipboard exactly.")
            this.Assert(!manager.Active && !DllCall("IsWindow", "ptr", hwnd),
                "Escape cancellation left an overlay window active.")
            this.Assert(DllCall("GetCapture", "ptr") != hwnd,
                "Escape cancellation retained mouse capture.")
        } finally manager.Shutdown(false)
    }

    static TestInvalidSelection() {
        sequence := DllCall("GetClipboardSequenceNumber", "uint")
        manager := ScreenshotManager()
        try {
            this.Assert(manager.Begin(0, this.OffscreenBounds()),
                "The invalid-selection overlay did not start.")
            hwnd := manager.Overlay.Hwnd
            result := manager.CompleteSelection({Left: 20, Top: 20, Right: 20,
                Bottom: 25, Width: 0, Height: 5})
            this.Assert(!result && manager.LastResult.Status = "invalid-selection",
                "An empty selection was not rejected safely.")
            this.Assert(DllCall("GetClipboardSequenceNumber", "uint") = sequence,
                "An invalid selection changed the clipboard.")
            this.Assert(!manager.Active && !DllCall("IsWindow", "ptr", hwnd),
                "Invalid-selection cleanup left an overlay window.")
        } finally manager.Shutdown(false)
    }

    static TestExitCleanup() {
        manager := ScreenshotManager()
        this.Assert(manager.Begin(0, this.OffscreenBounds()),
            "The process-exit cleanup overlay did not start.")
        hwnd := manager.Overlay.Hwnd
        manager.OnProcessExit()
        this.Assert(manager.Stopped && !manager.Active,
            "Process-exit cleanup did not stop the screenshot manager.")
        this.Assert(!DllCall("IsWindow", "ptr", hwnd),
            "Process-exit cleanup retained the overlay HWND.")
        this.Assert(DllCall("GetCapture", "ptr") != hwnd,
            "Process-exit cleanup retained mouse capture.")
        this.Assert(!manager.MessagesRegistered,
            "Process-exit cleanup retained screenshot message handlers.")
    }

    static TestOverlaySuccessCleanup() {
        bounds := ScreenshotManager.VirtualDesktopBounds()
        callbackStatus := "", callbackPrevious := 0
        manager := ScreenshotManager(0, (status, previous, result) =>
            (callbackStatus := status, callbackPrevious := previous))
        try {
            this.Assert(manager.Begin(13579, this.OffscreenBounds()),
                "The isolated success overlay did not start.")
            hwnd := manager.Overlay.Hwnd
            rect := {Left: bounds.Left, Top: bounds.Top,
                Right: bounds.Left + 4, Bottom: bounds.Top + 3,
                Width: 4, Height: 3}
            started := ScreenshotManager.Qpc()
            this.Assert(manager.CompleteSelection(rect),
                "A representative small selection did not complete.")
            this.SmallCaptureMs := ScreenshotManager.QpcMs(started)
            this.Assert(callbackStatus = "captured" && callbackPrevious = 13579,
                "Successful capture did not return the prior focus target.")
            this.Assert(!manager.Active && !DllCall("IsWindow", "ptr", hwnd),
                "Successful capture left an overlay window active.")
            this.Assert(DllCall("GetCapture", "ptr") != hwnd,
                "Successful capture retained mouse capture.")
        } finally manager.Shutdown(false)
    }

    static TestClipboardContention() {
        attemptCount := 0
        retryCallback := (index) => (++attemptCount >= 4)
        this.Assert(ScreenshotManager.OpenClipboardWithRetry(0, 5, 0, retryCallback),
            "Recoverable clipboard-open retries did not succeed.")
        this.Assert(attemptCount = 4, "Clipboard-open retry count is incorrect.")
        this.Assert(!ScreenshotManager.OpenClipboardWithRetry(0, 3, 0, (*) => false),
            "Persistent clipboard-open failure was not reported safely.")

        eventName := "Local\OlioLauncher.M3ClipboardReady."
            . DllCall("GetCurrentProcessId", "uint") "." A_TickCount
        eventHandle := DllCall("CreateEventW", "ptr", 0, "int", true,
            "int", false, "str", eventName, "ptr")
        this.Assert(eventHandle != 0, "The contention synchronization event was not created.")
        helperPid := 0, bitmap := 0
        fixture := this.CreatePatternFixture(2, 2)
        publisher := ScreenshotManager()
        try {
            command := '"' A_AhkPath '" "' A_ScriptDir
                . '\ClipboardTestWriter.ahk" "hold" "' eventName '" "180"'
            Run(command, A_ScriptDir, "Hide", &helperPid)
            this.Assert(DllCall("WaitForSingleObject", "ptr", eventHandle,
                "uint", 2000, "uint") = 0,
                "The clipboard-contention holder did not become ready.")
            bitmap := ScreenshotManager.CopyPixelsToBitmap(fixture.Dc, 0, 0, 2, 2)
            started := ScreenshotManager.Qpc()
            published := publisher.PublishBitmap(bitmap, 30, 10)
            elapsed := ScreenshotManager.QpcMs(started)
            this.Assert(published, "Transient clipboard contention was not recovered.")
            if published
                bitmap := 0
            this.Assert(elapsed >= 100 && elapsed < 1200,
                "Clipboard contention retry timing is outside the recoverable window.")
            ProcessWaitClose(helperPid, 2)
            this.Assert(!ProcessExist(helperPid),
                "The clipboard contention helper remained running.")
        } finally {
            if bitmap
                DllCall("DeleteObject", "ptr", bitmap)
            if helperPid && ProcessExist(helperPid)
                ProcessClose(helperPid)
            if eventHandle
                DllCall("CloseHandle", "ptr", eventHandle)
            publisher.Shutdown(false)
            this.DestroyPatternFixture(fixture)
        }
    }

    static TestRapidActivation() {
        manager := ScreenshotManager()
        try {
            ; Establish AutoHotkey's one-time GUI caches before measuring
            ; repeated overlay ownership. The measured cycle must return to this state.
            warmUser := "", warmGdi := ""
            loop 5 {
                this.Assert(manager.Begin(0, this.OffscreenBounds()),
                    "A rapid-activation warmup overlay did not start.")
                manager.Cancel()
                Sleep(25)
                warm := this.ResourceCounts()
                if A_Index = 1
                    warmUser := warm.User, warmGdi := warm.Gdi
                else
                    this.Assert(warm.User = warmUser && warm.Gdi = warmGdi,
                        "Repeated overlay creation showed linear GDI/USER growth.")
            }
            before := this.ResourceCounts()
            started := ScreenshotManager.Qpc()
            this.Assert(manager.Begin(0, this.OffscreenBounds()),
                "The rapid-activation overlay did not start.")
            hwnd := manager.Overlay.Hwnd
            loop 40
                this.Assert(!manager.Begin(0, this.OffscreenBounds()),
                    "Rapid activation created a duplicate overlay.")
            this.RapidActivationMs := ScreenshotManager.QpcMs(started)
            this.Assert(manager.Overlay.Hwnd = hwnd && DllCall("IsWindow", "ptr", hwnd),
                "Rapid activation replaced or froze the active overlay.")
            manager.Cancel()
            this.Assert(this.RapidActivationMs < 500,
                "Rapid repeated activation took too long.")
            Sleep(250)
            after := this.ResourceCounts()
            this.Assert(after.Gdi <= before.Gdi && after.User <= before.User,
                "Rapid-activation overlay cleanup changed GDI/USER counts: gdi="
                    . (after.Gdi - before.Gdi) ";user=" (after.User - before.User) ".")
        } finally manager.Shutdown(false)
    }

    static TestRepeatedCaptureCleanup() {
        bounds := ScreenshotManager.VirtualDesktopBounds()
        rect := {Left: bounds.Left, Top: bounds.Top,
            Right: bounds.Left + 8, Bottom: bounds.Top + 8,
            Width: 8, Height: 8}
        publisher := ScreenshotManager()
        loop 5 {
            warmup := ScreenshotManager.CaptureScreenRect(rect)
            if !warmup || !publisher.PublishBitmap(warmup)
                throw Error("Repeated-capture warmup failed.")
        }
        Sleep(50)
        before := this.ResourceCounts()
        started := ScreenshotManager.Qpc()
        loop 75 {
            bitmap := ScreenshotManager.CaptureScreenRect(rect)
            this.Assert(bitmap != 0, "A repeated GDI capture failed.")
            if !publisher.PublishBitmap(bitmap) {
                DllCall("DeleteObject", "ptr", bitmap)
                throw Error("A repeated clipboard publish failed.")
            }
        }
        this.RepeatedCaptureMs := ScreenshotManager.QpcMs(started)
        Sleep(125)
        after := this.ResourceCounts()
        this.GdiDelta := after.Gdi - before.Gdi
        this.UserDelta := after.User - before.User
        this.HandleDelta := after.Handles - before.Handles
        this.PrivateDelta := after.Private - before.Private
        this.WorkingSetDelta := after.WorkingSet - before.WorkingSet
        this.Assert(this.GdiDelta <= 0, "Repeated captures leaked GDI objects.")
        this.Assert(this.UserDelta <= 0, "Repeated captures leaked USER objects.")
        this.Assert(Abs(this.HandleDelta) <= 1, "Repeated captures leaked process handles.")
        this.Assert(this.PrivateDelta < 2097152,
            "Repeated captures caused unbounded private-memory growth.")
        this.Assert(this.WorkingSetDelta < 8388608,
            "Repeated captures caused excessive working-set growth.")
        publisher.Shutdown(false)
    }

    static TestPrivacy(beforeSnapshot) {
        managerSource := FileRead(A_ScriptDir "\..\src\ScreenshotManager.ahk", "UTF-8")
        banned := "i)(FileAppend|FileOpen|FileWrite|FileMove|FileCopy|FileDelete|"
            . "DirCreate|UrlDownloadToFile|WinHttp|InternetOpen|SnippingTool|"
            . "\.(?:png|jpe?g|bmp)|Run\s*\()"
        this.Assert(!RegExMatch(managerSource, banned),
            "ScreenshotManager contains a file, network, encoder, shell, or Snipping Tool path.")
        afterSnapshot := this.SnapshotFiles(A_ScriptDir "\..")
        this.Assert(this.SnapshotsEqual(beforeSnapshot, afterSnapshot),
            "Screenshot testing created or changed a launcher repository file.")
        roots := [A_ScriptDir "\.."]
        localRoot := EnvGet("LOCALAPPDATA") "\OlioLauncher"
        if DirExist(localRoot)
            roots.Push(localRoot)
        found := false
        for root in roots {
            loop files root "\*", "FR" {
                if !RegExMatch(A_LoopFileExt, "i)^(ahk|md|json|log|txt|tsv|ps1)$")
                    continue
                try {
                    if InStr(FileRead(A_LoopFileFullPath), this.PrivacyMarker) {
                        found := true
                        break
                    }
                }
            }
            if found
                break
        }
        this.Assert(!found,
            "Clipboard content entered a source, settings, result, log, cache, or temporary file.")
    }

    static OffscreenBounds() {
        return {Left: -32000, Top: -32000, Right: -31936, Bottom: -31936,
            Width: 64, Height: 64}
    }

    static CreatePatternFixture(width, height) {
        screenDc := DllCall("GetDC", "ptr", 0, "ptr")
        memoryDc := screenDc ? DllCall("CreateCompatibleDC", "ptr", screenDc, "ptr") : 0
        bitmap := memoryDc ? DllCall("CreateCompatibleBitmap", "ptr", screenDc,
            "int", width, "int", height, "ptr") : 0
        original := bitmap ? DllCall("SelectObject", "ptr", memoryDc,
            "ptr", bitmap, "ptr") : 0
        if !screenDc || !memoryDc || !bitmap || !original || original = -1 {
            if bitmap
                DllCall("DeleteObject", "ptr", bitmap)
            if memoryDc
                DllCall("DeleteDC", "ptr", memoryDc)
            if screenDc
                DllCall("ReleaseDC", "ptr", 0, "ptr", screenDc)
            throw Error("The GDI pattern fixture could not be created.")
        }
        leftRect := Buffer(16, 0)
        NumPut("int", 0, leftRect, 0), NumPut("int", 0, leftRect, 4)
        NumPut("int", 2, leftRect, 8), NumPut("int", height, leftRect, 12)
        rightRect := Buffer(16, 0)
        NumPut("int", 2, rightRect, 0), NumPut("int", 0, rightRect, 4)
        NumPut("int", width, rightRect, 8), NumPut("int", height, rightRect, 12)
        leftBrush := DllCall("CreateSolidBrush", "uint",
            ScreenshotManager.ColorRef(0x112233), "ptr")
        rightBrush := DllCall("CreateSolidBrush", "uint",
            ScreenshotManager.ColorRef(0xA1B2C3), "ptr")
        DllCall("FillRect", "ptr", memoryDc, "ptr", leftRect, "ptr", leftBrush)
        DllCall("FillRect", "ptr", memoryDc, "ptr", rightRect, "ptr", rightBrush)
        DllCall("DeleteObject", "ptr", leftBrush)
        DllCall("DeleteObject", "ptr", rightBrush)
        return {ScreenDc: screenDc, Dc: memoryDc, Bitmap: bitmap,
            Original: original}
    }

    static DestroyPatternFixture(fixture) {
        if !IsObject(fixture)
            return
        if fixture.Dc && fixture.Original && fixture.Original != -1
            DllCall("SelectObject", "ptr", fixture.Dc, "ptr", fixture.Original, "ptr")
        if fixture.Bitmap
            DllCall("DeleteObject", "ptr", fixture.Bitmap)
        if fixture.Dc
            DllCall("DeleteDC", "ptr", fixture.Dc)
        if fixture.ScreenDc
            DllCall("ReleaseDC", "ptr", 0, "ptr", fixture.ScreenDc)
    }

    static BitmapDimensions(bitmap) {
        objectSize := A_PtrSize = 8 ? 32 : 24
        details := Buffer(objectSize, 0)
        if !bitmap || !DllCall("GetObjectW", "ptr", bitmap, "int", objectSize,
            "ptr", details)
            return {Width: 0, Height: 0}
        return {Width: NumGet(details, 4, "int"),
            Height: Abs(NumGet(details, 8, "int"))}
    }

    static BitmapPixel(bitmap, x, y) {
        dimensions := this.BitmapDimensions(bitmap)
        if x < 0 || y < 0 || x >= dimensions.Width || y >= dimensions.Height
            return -1
        bitsSize := dimensions.Width * dimensions.Height * 4
        dib := Buffer(40 + bitsSize, 0)
        NumPut("uint", 40, dib, 0)
        NumPut("int", dimensions.Width, dib, 4)
        NumPut("int", -dimensions.Height, dib, 8)
        NumPut("ushort", 1, dib, 12)
        NumPut("ushort", 32, dib, 14)
        NumPut("uint", bitsSize, dib, 20)
        hdc := DllCall("GetDC", "ptr", 0, "ptr")
        try rows := DllCall("GetDIBits", "ptr", hdc, "ptr", bitmap,
            "uint", 0, "uint", dimensions.Height, "ptr", dib.Ptr + 40,
            "ptr", dib.Ptr, "uint", 0, "int")
        finally DllCall("ReleaseDC", "ptr", 0, "ptr", hdc)
        if rows != dimensions.Height
            return -1
        return NumGet(dib, 40 + (y * dimensions.Width + x) * 4, "uint") & 0xFFFFFF
    }

    static DibPixel(dib, x, y) {
        if !IsObject(dib) || dib.Size < 40
            return -1
        width := Abs(NumGet(dib, 4, "int"))
        signedHeight := NumGet(dib, 8, "int")
        height := Abs(signedHeight)
        bitCount := NumGet(dib, 14, "ushort")
        if bitCount != 32 || x < 0 || y < 0 || x >= width || y >= height
            return -1
        row := signedHeight < 0 ? y : height - y - 1
        offset := 40 + (row * width + x) * 4
        return offset + 4 <= dib.Size ? NumGet(dib, offset, "uint") & 0xFFFFFF : -1
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

    static SnapshotFiles(root) {
        snapshot := Map()
        loop files root "\*", "FR" {
            path := A_LoopFileFullPath
            try snapshot[path] := A_LoopFileSize "|" FileGetTime(path, "M")
        }
        return snapshot
    }

    static SnapshotsEqual(first, second) {
        if first.Count != second.Count
            return false
        for path, metadata in first {
            if !second.Has(path) || second[path] != metadata
                return false
        }
        return true
    }

    static WriteResult(status, detail) {
        FileAppend("MILESTONE3_TEST`t" status "`t" detail "`n", "*", "UTF-8")
    }
}

try Milestone3Tests.Run()
catch as testError {
    detail := testError.Message " @ " testError.File ":" testError.Line
    Milestone3Tests.WriteResult("FAIL",
        SubStr(RegExReplace(detail, "[\r\n\t]", " "), 1, 240))
    ExitApp(1)
}
