#Requires AutoHotkey v2.0.26
#Warn All, StdOut

#Include ..\src\ClipboardManager.ahk

class Milestone2Tests {
    static Passed := 0
    static RapidMilliseconds := 0
    static EventMilliseconds := 0
    static GdiDelta := 0

    static Assert(condition, message) {
        if !condition
            throw Error(message)
        this.Passed += 1
    }

    static Settings(exclusions := "") {
        return Map("clipboardPaused", false, "sensitiveApplications", exclusions)
    }

    static MakeDib(width := 2, height := 2, color := 0x004080FF) {
        bitsSize := width * height * 4
        dib := Buffer(40 + bitsSize, 0)
        NumPut("uint", 40, dib, 0)
        NumPut("int", width, dib, 4)
        NumPut("int", height, dib, 8)
        NumPut("ushort", 1, dib, 12)
        NumPut("ushort", 32, dib, 14)
        NumPut("uint", bitsSize, dib, 20)
        loop width * height
            NumPut("uint", color, dib, 40 + (A_Index - 1) * 4)
        return dib
    }

    static RunWriter(mode, argument := "") {
        command := '"' A_AhkPath '" "' A_ScriptDir '\ClipboardTestWriter.ahk" "' mode '"'
        if argument != ""
            command .= ' "' StrReplace(argument, '"', '""') '"'
        RunWait(command, A_ScriptDir, "Hide")
        return A_LastError
    }

    static WaitForCount(manager, minimum, timeoutMs := 1500) {
        started := A_TickCount
        while manager.Entries.Length < minimum && A_TickCount - started < timeoutMs
            Sleep(15)
        return manager.Entries.Length >= minimum
    }

    static Run() {
        savedClipboard := ClipboardAll()
        activeManager := 0
        try {
            this.TestMaximumAndDeduplication()
            this.TestPinning()
            this.TestPauseAndExclusions()
            this.TestOversizedPayloads()
            this.TestEventDrivenTextAndBitmap(&activeManager)
            this.TestRestorationAndSuppression()
            this.TestRestorePromotion()
            this.TestCleanupAndGdi()
            this.TestRapidChanges(&activeManager)
            this.TestPrivacy()
        } finally {
            if IsObject(activeManager)
                activeManager.Shutdown()
            A_Clipboard := savedClipboard
        }
        this.WriteResult("PASS", this.Passed " assertions;rapid_ms=" this.RapidMilliseconds
            ";event_ms=" this.EventMilliseconds ";gdi_delta=" this.GdiDelta)
        ExitApp(0)
    }

    static TestMaximumAndDeduplication() {
        manager := ClipboardManager(this.Settings())
        loop 12
            manager.CaptureText("item-" A_Index)
        this.Assert(manager.Entries.Length = 10, "History exceeded ten unpinned items.")
        this.Assert(manager.Model.CountUnpinned() = 10, "Unpinned count is not capped at ten.")
        this.Assert(manager.Entries[1].Text = "item-12", "Newest item is not first.")
        this.Assert(manager.Entries[10].Text = "item-3", "Oldest retained item is incorrect.")
        before := manager.Entries.Length
        duplicate := manager.CaptureText("item-12")
        this.Assert(!duplicate.Added && duplicate.Status = "duplicate",
            "Consecutive text duplicate was retained.")
        this.Assert(manager.Entries.Length = before, "Text deduplication changed history length.")

        imageManager := ClipboardManager(this.Settings())
        dib := this.MakeDib()
        this.Assert(imageManager.CaptureDib(dib).Added, "First DIB capture failed.")
        this.Assert(!imageManager.CaptureDib(dib).Added,
            "Consecutive equivalent bitmap was retained.")
        this.Assert(imageManager.Entries.Length = 1, "Bitmap deduplication failed.")
        manager.Shutdown(), imageManager.Shutdown()
    }

    static TestPinning() {
        manager := ClipboardManager(this.Settings())
        loop 10
            manager.CaptureText("pin-item-" A_Index)
        pinnedEntry := manager.Entries[10]
        result := manager.TogglePin(10)
        this.Assert(result.Ok && pinnedEntry.Pinned, "Pin action failed.")
        loop 5
            manager.CaptureText("new-item-" A_Index)
        found := false
        for entry in manager.Entries
            found := found || entry = pinnedEntry
        this.Assert(found, "Pinned entry was evicted by unpinned trimming.")
        this.Assert(manager.Model.CountUnpinned() = 10,
            "Pinning changed the ten-item unpinned cap.")
        this.Assert(manager.Entries.Length = 11, "Pinned and unpinned capacities are incorrect.")
        unpinIndex := 0
        for index, entry in manager.Entries {
            if entry = pinnedEntry {
                unpinIndex := index
                break
            }
        }
        manager.TogglePin(unpinIndex)
        this.Assert(manager.Entries.Length = 10, "Unpin did not reapply the unpinned cap.")
        this.Assert(pinnedEntry.Released, "Evicted unpinned entry did not release its payload.")
        manager.Shutdown()
    }

    static TestPauseAndExclusions() {
        manager := ClipboardManager(this.Settings("Vault.exe;Secrets.EXE"))
        manager.TogglePaused()
        paused := manager.CaptureText("not-retained")
        this.Assert(!paused.Added && paused.Status = "paused", "Paused capture was retained.")
        this.Assert(manager.Entries.Length = 0, "Pause did not leave history unchanged.")
        manager.TogglePaused()
        this.Assert(manager.CaptureText("retained").Added, "Capture did not resume.")
        excluded := manager.CaptureText("not-retained", "vault.EXE")
        this.Assert(!excluded.Added && excluded.Status = "excluded",
            "Sensitive-application exclusion is not case-insensitive.")
        this.Assert(manager.Entries.Length = 1, "Excluded application changed history.")
        manager.Shutdown()
    }

    static TestOversizedPayloads() {
        manager := ClipboardManager(this.Settings())
        oversizedText := "x"
        loop Floor(ClipboardManager.MaxTextBytes / 2) + 2
            oversizedText .= "x"
        result := manager.CaptureText(oversizedText)
        oversizedText := ""
        this.Assert(!result.Added && result.Status = "oversized-text",
            "Oversized text was accepted.")
        oversizedDib := Buffer(ClipboardManager.MaxImageBytes + 1, 0)
        NumPut("uint", 40, oversizedDib, 0)
        result := manager.CaptureDib(oversizedDib)
        oversizedDib := 0
        this.Assert(!result.Added && result.Status = "oversized-image",
            "Oversized image was accepted.")
        this.Assert(manager.Entries.Length = 0, "Oversized payload changed history.")
        manager.Shutdown()
    }

    static TestEventDrivenTextAndBitmap(&activeManager) {
        manager := ClipboardManager(this.Settings())
        activeManager := manager
        manager.Start()
        marker := "external-event-" A_TickCount
        this.Assert(this.RunWriter("text", marker) = 0, "External text writer failed.")
        this.Assert(this.WaitForCount(manager, 1), "Clipboard callback did not capture text.")
        this.Assert(manager.Entries[1].Kind = "text" && manager.Entries[1].Text = marker,
            "Text callback captured an inaccurate payload.")
        manager.Clear()
        ansiMarker := "plain-ansi-" A_TickCount
        this.Assert(this.RunWriter("ansi", ansiMarker) = 0, "External ANSI text writer failed.")
        this.Assert(this.WaitForCount(manager, 1), "Clipboard callback did not capture CF_TEXT.")
        this.Assert(manager.Entries[1].Kind = "text" && manager.Entries[1].Text = ansiMarker,
            "Plain CF_TEXT callback captured an inaccurate payload.")
        manager.Clear()
        this.Assert(this.RunWriter("bitmap") = 0, "External bitmap writer failed.")
        this.Assert(this.WaitForCount(manager, 1), "Clipboard callback did not capture a bitmap.")
        this.Assert(manager.Entries[1].Kind = "image", "Bitmap callback type is incorrect.")
        this.Assert(manager.Entries[1].Width = 3 && manager.Entries[1].Height = 2,
            "Bitmap callback dimensions are incorrect.")
        this.Assert(manager.Entries[1].Source != "", "Source application field is missing.")
        manager.Shutdown()
        activeManager := 0
    }

    static TestRestorationAndSuppression() {
        manager := ClipboardManager(this.Settings())
        marker := "restore-" A_TickCount
        manager.CaptureText(marker)
        this.Assert(manager.Restore(1), "Text restore returned failure.")
        ClipWait(1)
        this.Assert(A_Clipboard = marker, "Restored text does not match the retained entry.")
        count := manager.Entries.Length
        manager.OnClipboardChanged(1)
        Sleep(50)
        this.Assert(manager.Entries.Length = count,
            "Launcher-generated clipboard event was recorded.")
        this.Assert(manager.SuppressedSequence != 0,
            "Launcher-generated sequence was not marked for suppression.")

        imageManager := ClipboardManager(this.Settings())
        dib := this.MakeDib(2, 3)
        imageManager.CaptureDib(dib)
        this.Assert(imageManager.Restore(1), "Bitmap restore returned failure.")
        this.Assert(DllCall("IsClipboardFormatAvailable", "uint", 8),
            "Restored clipboard has no CF_DIB image.")
        reader := ClipboardManager(this.Settings())
        pending := {HasText: false, HasImage: true, Source: "TestHarness.exe"}
        this.Assert(reader.CaptureCurrent(pending) = "captured",
            "Restored bitmap could not be captured again.")
        restored := reader.Entries[1]
        original := imageManager.Entries[1]
        restoredPixel := NumGet(restored.Dib,
            reader.DibBitsOffset(restored.Dib), "uint") & 0xFFFFFF
        originalPixel := NumGet(original.Dib,
            imageManager.DibBitsOffset(original.Dib), "uint") & 0xFFFFFF
        this.Assert(restored.Width = original.Width && restored.Height = original.Height
            && restoredPixel = originalPixel,
            "Restored bitmap dimensions or pixels differ from the retained entry.")
        manager.Shutdown(), imageManager.Shutdown(), reader.Shutdown()
    }

    static TestCleanupAndGdi() {
        manager := ClipboardManager(this.Settings())
        dib := this.MakeDib(4, 4)
        references := []
        loop 4 {
            changed := this.MakeDib(4, 4, 0x00101010 + A_Index)
            manager.CaptureDib(changed)
            references.Push(manager.Entries[1])
        }
        before := DllCall("GetGuiResources", "ptr", DllCall("GetCurrentProcess", "ptr"),
            "uint", 0, "uint")
        bitmap := manager.CreatePreviewBitmap(1)
        this.Assert(bitmap != 0, "In-memory image preview could not be created.")
        during := DllCall("GetGuiResources", "ptr", DllCall("GetCurrentProcess", "ptr"),
            "uint", 0, "uint")
        this.Assert(during >= before + 1, "Preview bitmap was not reflected in GDI resources.")
        manager.Clear()
        Sleep(25)
        after := DllCall("GetGuiResources", "ptr", DllCall("GetCurrentProcess", "ptr"),
            "uint", 0, "uint")
        this.GdiDelta := after - before
        this.Assert(this.GdiDelta = 0, "Clear leaked a retained GDI preview object.")
        for entry in references
            this.Assert(entry.Released && !IsObject(entry.Dib) && !entry.PreviewBitmap,
                "Clear did not release every retained clipboard/GDI resource.")
        this.Assert(manager.Entries.Length = 0, "Clear did not empty history.")
        manager.Shutdown()
    }

    static TestRestorePromotion() {
        manager := ClipboardManager(this.Settings())
        manager.CaptureText("promotion-one")
        promotedEntry := manager.Entries[1]
        promotedEntry.CapturedAt := "20000101000000"
        promotedEntry.DisplayTime := "12:00 AM"
        manager.CaptureText("promotion-two")
        manager.CaptureText("promotion-three")
        this.Assert(manager.Entries.Length = 3, "Promotion fixture is incomplete.")
        this.Assert(manager.RestoreAndPromote(3), "Restore-and-promote returned failure.")
        this.Assert(manager.Entries.Length = 3,
            "Restore-and-promote created a duplicate history item.")
        this.Assert(manager.Entries[1] = promotedEntry,
            "Restored entry was not moved to the newest position.")
        this.Assert(manager.Entries[1].CapturedAt != "20000101000000",
            "Restored entry did not receive a new copy time.")
        this.Assert(A_Clipboard = "promotion-one",
            "Restore-and-promote did not publish the selected content.")
        manager.OnClipboardChanged(1)
        Sleep(25)
        this.Assert(manager.Entries.Length = 3,
            "Promoted launcher content was recaptured as a duplicate.")
        manager.Shutdown()
    }

    static TestRapidChanges(&activeManager) {
        manager := ClipboardManager(this.Settings())
        started := A_TickCount
        loop 500
            manager.CaptureText("rapid-" A_Index)
        this.RapidMilliseconds := A_TickCount - started
        this.Assert(this.RapidMilliseconds < 1500, "Rapid in-memory changes took too long.")
        this.Assert(manager.Entries.Length = 10, "Rapid changes exceeded the history cap.")
        manager.Shutdown()

        eventManager := ClipboardManager(this.Settings())
        activeManager := eventManager
        eventManager.Start()
        started := A_TickCount
        this.Assert(this.RunWriter("rapid", 40) = 0, "Rapid clipboard writer failed.")
        Sleep(150)
        this.EventMilliseconds := A_TickCount - started
        this.Assert(eventManager.Entries.Length = 10,
            "Rapid clipboard events did not retain the latest ten entries.")
        this.Assert(this.EventMilliseconds < 2500, "Rapid clipboard event handling was too slow.")
        eventManager.Shutdown()
        activeManager := 0
    }

    static TestPrivacy() {
        manager := ClipboardManager(this.Settings())
        marker := "private-" DllCall("GetCurrentProcessId", "uint") "-" A_TickCount
        manager.CaptureText(marker, "PrivacyTest.exe")
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
                    if InStr(FileRead(A_LoopFileFullPath), marker) {
                        found := true
                        break
                    }
                }
            }
        }
        this.Assert(!found, "Clipboard content entered a repository, settings, result, or log file.")
        manager.Shutdown()
        marker := ""
    }

    static WriteResult(status, detail) {
        FileAppend("MILESTONE2_TEST`t" status "`t" detail "`n", "*", "UTF-8")
    }
}

try Milestone2Tests.Run()
catch as testError {
    Milestone2Tests.WriteResult("FAIL",
        SubStr(RegExReplace(testError.Message, "[\r\n\t]", " "), 1, 200))
    ExitApp(1)
}
