class ClipboardEntry {
    __New(kind, text := "", dib := 0, width := 0, height := 0, imageFormat := 0,
        source := "", capturedAt := "") {
        this.Kind := kind
        this.Text := text
        this.Dib := IsObject(dib) ? dib : 0
        this.Width := width
        this.Height := height
        this.ImageFormat := imageFormat
        this.Source := source ? source : "Unknown"
        this.CapturedAt := capturedAt ? capturedAt : FormatTime(, "yyyyMMddHHmmss")
        this.DisplayTime := FormatTime(this.CapturedAt, "h:mm tt")
        this.Pinned := false
        this.PreviewBitmap := 0
        this.Released := false
    }

    SafePreview(maximum := 90) {
        if this.Kind = "image"
            return "Image " this.Width "×" this.Height
        preview := RegExReplace(this.Text, "[\x00-\x08\x0B\x0C\x0E-\x1F]", "�")
        preview := RegExReplace(preview, "\R+", " ↵ ")
        preview := Trim(preview, " `t")
        if !preview
            preview := "(blank text)"
        return StrLen(preview) > maximum ? SubStr(preview, 1, maximum - 1) "…" : preview
    }

    Equivalent(other) {
        if !IsObject(other) || this.Kind != other.Kind
            return false
        if this.Kind = "text"
            return this.Text = other.Text
        if this.Width != other.Width || this.Height != other.Height
            || !IsObject(this.Dib) || !IsObject(other.Dib)
            || this.Dib.Size != other.Dib.Size
            return false
        return this.Dib.Size = 0 || DllCall("msvcrt\memcmp", "ptr", this.Dib.Ptr,
            "ptr", other.Dib.Ptr, "uptr", this.Dib.Size, "int") = 0
    }

    MarkCopiedNow() {
        this.CapturedAt := FormatTime(, "yyyyMMddHHmmss")
        this.DisplayTime := FormatTime(this.CapturedAt, "h:mm tt")
    }

    ReleasePreview() {
        if this.PreviewBitmap {
            DllCall("DeleteObject", "ptr", this.PreviewBitmap)
            this.PreviewBitmap := 0
        }
    }

    Release() {
        if this.Released
            return
        this.ReleasePreview()
        this.Text := ""
        this.Dib := 0
        this.Released := true
    }
}

class ClipboardHistoryModel {
    __New(maxUnpinned := 10, maxPinned := 10) {
        this.MaxUnpinned := maxUnpinned
        this.MaxPinned := maxPinned
        this.Entries := []
    }

    Add(entry) {
        if this.Entries.Length && this.Entries[1].Equivalent(entry) {
            entry.Release()
            return {Added: false, Status: "duplicate"}
        }
        this.Entries.InsertAt(1, entry)
        this.TrimUnpinned()
        return {Added: true, Status: "captured"}
    }

    CountUnpinned() {
        count := 0
        for entry in this.Entries
            count += entry.Pinned ? 0 : 1
        return count
    }

    CountPinned() {
        count := 0
        for entry in this.Entries
            count += entry.Pinned ? 1 : 0
        return count
    }

    TogglePin(index) {
        if index < 1 || index > this.Entries.Length
            return {Ok: false, Status: "no-selection"}
        entry := this.Entries[index]
        if !entry.Pinned && this.CountPinned() >= this.MaxPinned
            return {Ok: false, Status: "pin-limit"}
        entry.Pinned := !entry.Pinned
        if !entry.Pinned
            this.TrimUnpinned()
        return {Ok: true, Status: entry.Pinned ? "pinned" : "unpinned"}
    }

    Promote(index) {
        if index < 1 || index > this.Entries.Length
            return false
        entry := this.Entries[index]
        if index > 1 {
            this.Entries.RemoveAt(index)
            this.Entries.InsertAt(1, entry)
        }
        entry.MarkCopiedNow()
        return true
    }

    Delete(index) {
        if index < 1 || index > this.Entries.Length
            return false
        entry := this.Entries.RemoveAt(index)
        entry.Release()
        return true
    }

    Clear() {
        for entry in this.Entries
            entry.Release()
        this.Entries := []
    }

    TrimUnpinned() {
        while this.CountUnpinned() > this.MaxUnpinned {
            removed := false
            loop this.Entries.Length {
                index := this.Entries.Length - A_Index + 1
                if !this.Entries[index].Pinned {
                    entry := this.Entries.RemoveAt(index)
                    entry.Release()
                    removed := true
                    break
                }
            }
            if !removed
                break
        }
    }

    __Delete() => this.Clear()
}

class ClipboardManager {
    static CF_TEXT := 1
    static CF_BITMAP := 2
    static CF_DIB := 8
    static CF_UNICODETEXT := 13
    static CF_DIBV5 := 17
    static MaxTextBytes := 1048576
    static MaxImageBytes := 16777216
    static MaxImageDimension := 8192
    static MaxImagePixels := 32000000

    __New(settings := 0, changedCallback := 0) {
        this.Model := ClipboardHistoryModel(10, 10)
        this.ChangedCallback := changedCallback
        this.Paused := IsObject(settings) && settings.Has("clipboardPaused")
            ? settings["clipboardPaused"] : false
        exclusions := IsObject(settings) && settings.Has("sensitiveApplications")
            ? settings["sensitiveApplications"] : ""
        this.SensitiveApplications := this.ParseExclusions(exclusions)
        this.Started := false
        this.Stopped := false
        this.Pending := 0
        this.PendingRetry := 0
        this.MutationDepth := 0
        this.SuppressedSequence := 0
        this.LastStatus := "ready"
        this.ClipboardCallback := ObjBindMethod(this, "OnClipboardChanged")
        this.ProcessCallback := ObjBindMethod(this, "ProcessPending")
        this.ExitCallback := ObjBindMethod(this, "OnProcessExit")
    }

    Entries => this.Model.Entries

    Start() {
        if this.Started
            return
        this.Started := true
        this.Stopped := false
        OnClipboardChange(this.ClipboardCallback, 1)
        OnExit(this.ExitCallback)
    }

    Shutdown() {
        if this.Stopped
            return
        this.Stopped := true
        if this.Started {
            try OnClipboardChange(this.ClipboardCallback, 0)
            try OnExit(this.ExitCallback, 0)
        }
        try SetTimer(this.ProcessCallback, 0)
        this.Pending := 0
        this.Model.Clear()
        this.Notify("cleared")
    }

    OnProcessExit(*) => this.Shutdown()

    ParseExclusions(value) {
        result := Map()
        loop parse String(value), ";" {
            name := StrLower(Trim(A_LoopField, " `t"))
            if name
                result[name] := true
        }
        return result
    }

    IsSensitiveApplication(source) {
        return source && this.SensitiveApplications.Has(StrLower(source))
    }

    TogglePaused() {
        this.Paused := !this.Paused
        this.Notify(this.Paused ? "paused" : "resumed")
        return this.Paused
    }

    OnClipboardChanged(type) {
        if this.Stopped || this.Paused || type = 0
            return
        sequence := DllCall("GetClipboardSequenceNumber", "uint")
        if this.MutationDepth || (sequence && sequence = this.SuppressedSequence)
            return
        if this.IsLauncherClipboardOwner()
            return
        source := this.SourceApplication()
        if this.IsSensitiveApplication(source) {
            this.LastStatus := "excluded"
            this.Notify("excluded")
            return
        }
        hasText := DllCall("IsClipboardFormatAvailable", "uint", ClipboardManager.CF_UNICODETEXT)
            || DllCall("IsClipboardFormatAvailable", "uint", ClipboardManager.CF_TEXT)
        hasImage := DllCall("IsClipboardFormatAvailable", "uint", ClipboardManager.CF_DIBV5)
            || DllCall("IsClipboardFormatAvailable", "uint", ClipboardManager.CF_DIB)
            || DllCall("IsClipboardFormatAvailable", "uint", ClipboardManager.CF_BITMAP)
        if !hasText && !hasImage
            return
        this.Pending := {Sequence: sequence, Source: source, HasText: hasText, HasImage: hasImage}
        this.PendingRetry := 0
        SetTimer(this.ProcessCallback, -1)
    }

    ProcessPending(*) {
        if !IsObject(this.Pending) || this.Paused || this.Stopped
            return
        pending := this.Pending
        currentSequence := DllCall("GetClipboardSequenceNumber", "uint")
        if pending.Sequence && currentSequence != pending.Sequence {
            this.Pending := 0
            return
        }
        result := this.CaptureCurrent(pending)
        if result = "busy" && this.PendingRetry < 4 {
            this.PendingRetry += 1
            SetTimer(this.ProcessCallback, -15)
            return
        }
        this.Pending := 0
    }

    CaptureCurrent(pending) {
        if !DllCall("OpenClipboard", "ptr", 0)
            return "busy"
        entry := 0
        status := "unsupported"
        try {
            if pending.HasText {
                textFormat := DllCall("IsClipboardFormatAvailable", "uint",
                    ClipboardManager.CF_UNICODETEXT)
                    ? ClipboardManager.CF_UNICODETEXT : ClipboardManager.CF_TEXT
                handle := DllCall("GetClipboardData", "uint", textFormat, "ptr")
                if handle {
                    size := DllCall("GlobalSize", "ptr", handle, "uptr")
                    if !size || size > ClipboardManager.MaxTextBytes
                        status := "oversized-text"
                    else {
                        pointer := DllCall("GlobalLock", "ptr", handle, "ptr")
                        if pointer {
                            try text := StrGet(pointer, textFormat = ClipboardManager.CF_UNICODETEXT
                                ? "UTF-16" : "CP0")
                            finally DllCall("GlobalUnlock", "ptr", handle)
                            entry := ClipboardEntry("text", text, 0, 0, 0, 0,
                                pending.Source)
                        }
                    }
                }
            }
            if !IsObject(entry) && pending.HasImage && status != "oversized-text" {
                for imageFormat in [ClipboardManager.CF_DIBV5, ClipboardManager.CF_DIB] {
                    if !DllCall("IsClipboardFormatAvailable", "uint", imageFormat)
                        continue
                    handle := DllCall("GetClipboardData", "uint", imageFormat, "ptr")
                    result := this.CopyDibHandle(handle, imageFormat, pending.Source)
                    if IsObject(result)
                        entry := result
                    else
                        status := result
                    break
                }
                if !IsObject(entry) && status != "oversized-image"
                    && DllCall("IsClipboardFormatAvailable", "uint", ClipboardManager.CF_BITMAP) {
                    bitmap := DllCall("GetClipboardData", "uint", ClipboardManager.CF_BITMAP, "ptr")
                    result := this.CopyBitmapHandle(bitmap, pending.Source)
                    if IsObject(result)
                        entry := result
                    else
                        status := result
                }
            }
        } finally DllCall("CloseClipboard")

        if IsObject(entry) {
            added := this.Model.Add(entry)
            status := added.Status
        }
        this.LastStatus := status
        this.Notify(status)
        return status
    }

    CaptureText(text, source := "", capturedAt := "") {
        if this.Paused
            return {Added: false, Status: "paused"}
        if this.IsSensitiveApplication(source)
            return {Added: false, Status: "excluded"}
        bytes := StrPut(text, "UTF-16") * 2
        if bytes > ClipboardManager.MaxTextBytes {
            this.Notify("oversized-text")
            return {Added: false, Status: "oversized-text"}
        }
        result := this.Model.Add(ClipboardEntry("text", text, 0, 0, 0, 0,
            source, capturedAt))
        this.Notify(result.Status)
        return result
    }

    CaptureDib(dib, imageFormat := 8, source := "", capturedAt := "") {
        if this.Paused
            return {Added: false, Status: "paused"}
        if this.IsSensitiveApplication(source)
            return {Added: false, Status: "excluded"}
        dimensions := this.ValidateDib(dib)
        if !dimensions.Ok {
            this.Notify(dimensions.Status)
            return {Added: false, Status: dimensions.Status}
        }
        copy := Buffer(dib.Size)
        DllCall("RtlMoveMemory", "ptr", copy.Ptr, "ptr", dib.Ptr, "uptr", dib.Size)
        result := this.Model.Add(ClipboardEntry("image", "", copy, dimensions.Width,
            dimensions.Height, imageFormat, source, capturedAt))
        this.Notify(result.Status)
        return result
    }

    CopyDibHandle(handle, format, source) {
        if !handle
            return "unavailable"
        size := DllCall("GlobalSize", "ptr", handle, "uptr")
        if !size || size > ClipboardManager.MaxImageBytes
            return "oversized-image"
        pointer := DllCall("GlobalLock", "ptr", handle, "ptr")
        if !pointer
            return "unavailable"
        try {
            dib := Buffer(size)
            DllCall("RtlMoveMemory", "ptr", dib.Ptr, "ptr", pointer, "uptr", size)
        } finally DllCall("GlobalUnlock", "ptr", handle)
        dimensions := this.ValidateDib(dib)
        if !dimensions.Ok
            return dimensions.Status
        return ClipboardEntry("image", "", dib, dimensions.Width, dimensions.Height,
            format, source)
    }

    CopyBitmapHandle(bitmap, source) {
        if !bitmap
            return "unavailable"
        objectSize := A_PtrSize = 8 ? 32 : 24
        bitmapInfo := Buffer(objectSize, 0)
        if !DllCall("GetObjectW", "ptr", bitmap, "int", objectSize, "ptr", bitmapInfo)
            return "unavailable"
        width := NumGet(bitmapInfo, 4, "int")
        height := Abs(NumGet(bitmapInfo, 8, "int"))
        if !this.DimensionsAllowed(width, height)
            return "oversized-image"
        bitsSize := width * height * 4
        totalSize := 40 + bitsSize
        if totalSize > ClipboardManager.MaxImageBytes
            return "oversized-image"
        dib := Buffer(totalSize, 0)
        NumPut("uint", 40, dib, 0)
        NumPut("int", width, dib, 4)
        NumPut("int", height, dib, 8)
        NumPut("ushort", 1, dib, 12)
        NumPut("ushort", 32, dib, 14)
        NumPut("uint", bitsSize, dib, 20)
        hdc := DllCall("GetDC", "ptr", 0, "ptr")
        if !hdc
            return "unavailable"
        try rows := DllCall("GetDIBits", "ptr", hdc, "ptr", bitmap, "uint", 0,
            "uint", height, "ptr", dib.Ptr + 40, "ptr", dib.Ptr, "uint", 0, "int")
        finally DllCall("ReleaseDC", "ptr", 0, "ptr", hdc)
        if rows != height
            return "unavailable"
        return ClipboardEntry("image", "", dib, width, height,
            ClipboardManager.CF_DIB, source)
    }

    ValidateDib(dib) {
        if !IsObject(dib) || dib.Size < 40 || dib.Size > ClipboardManager.MaxImageBytes
            return {Ok: false, Status: "oversized-image"}
        headerSize := NumGet(dib, 0, "uint")
        if headerSize < 40 || headerSize > dib.Size
            return {Ok: false, Status: "invalid-image"}
        width := Abs(NumGet(dib, 4, "int"))
        height := Abs(NumGet(dib, 8, "int"))
        if !this.DimensionsAllowed(width, height)
            return {Ok: false, Status: "oversized-image"}
        offset := this.DibBitsOffset(dib)
        if offset < headerSize || offset >= dib.Size
            return {Ok: false, Status: "invalid-image"}
        return {Ok: true, Status: "ok", Width: width, Height: height, BitsOffset: offset}
    }

    DimensionsAllowed(width, height) {
        return width > 0 && height > 0
            && width <= ClipboardManager.MaxImageDimension
            && height <= ClipboardManager.MaxImageDimension
            && width * height <= ClipboardManager.MaxImagePixels
    }

    DibBitsOffset(dib) {
        headerSize := NumGet(dib, 0, "uint")
        bitCount := NumGet(dib, 14, "ushort")
        compression := NumGet(dib, 16, "uint")
        colorsUsed := NumGet(dib, 32, "uint")
        masks := headerSize = 40 && (compression = 3 || compression = 6)
            ? (compression = 6 ? 16 : 12) : 0
        paletteEntries := colorsUsed ? colorsUsed : (bitCount <= 8 ? 1 << bitCount : 0)
        return headerSize + masks + paletteEntries * 4
    }

    Restore(index) {
        if index < 1 || index > this.Entries.Length
            return false
        entry := this.Entries[index]
        return entry.Kind = "text" ? this.PublishText(entry.Text)
            : this.PublishDib(entry.Dib, entry.ImageFormat)
    }

    RestoreAndPromote(index) {
        if !this.Restore(index)
            return false
        this.Model.Promote(index)
        this.Notify("promoted")
        return true
    }

    BeginLauncherMutation() {
        this.MutationDepth += 1
    }

    EndLauncherMutation() {
        this.SuppressedSequence := DllCall("GetClipboardSequenceNumber", "uint")
        this.MutationDepth := Max(0, this.MutationDepth - 1)
    }

    PrepareBitmapEntry(bitmap, source := "Olio Launcher") {
        if this.Stopped || this.Paused || this.IsSensitiveApplication(source)
            return 0
        result := this.CopyBitmapHandle(bitmap, source)
        return IsObject(result) ? result : 0
    }

    CommitPreparedEntry(entry) {
        if !IsObject(entry)
            return {Added: false, Status: "unavailable"}
        if this.Stopped || this.Paused {
            entry.Release()
            return {Added: false, Status: this.Stopped ? "stopped" : "paused"}
        }
        result := this.Model.Add(entry)
        this.LastStatus := result.Status
        this.Notify(result.Status)
        return result
    }

    PublishText(text) {
        bytes := StrPut(text, "UTF-16") * 2
        memory := DllCall("GlobalAlloc", "uint", 0x42, "uptr", bytes, "ptr")
        if !memory
            return false
        pointer := DllCall("GlobalLock", "ptr", memory, "ptr")
        if !pointer {
            DllCall("GlobalFree", "ptr", memory)
            return false
        }
        StrPut(text, pointer, Floor(bytes / 2), "UTF-16")
        DllCall("GlobalUnlock", "ptr", memory)
        return this.PublishHandle(ClipboardManager.CF_UNICODETEXT, memory)
    }

    PublishDib(dib, format) {
        if !IsObject(dib)
            return false
        memory := DllCall("GlobalAlloc", "uint", 0x42, "uptr", dib.Size, "ptr")
        if !memory
            return false
        pointer := DllCall("GlobalLock", "ptr", memory, "ptr")
        if !pointer {
            DllCall("GlobalFree", "ptr", memory)
            return false
        }
        DllCall("RtlMoveMemory", "ptr", pointer, "ptr", dib.Ptr, "uptr", dib.Size)
        DllCall("GlobalUnlock", "ptr", memory)
        return this.PublishHandle(format = ClipboardManager.CF_DIBV5
            ? ClipboardManager.CF_DIBV5 : ClipboardManager.CF_DIB, memory)
    }

    PublishHandle(format, memory) {
        this.BeginLauncherMutation()
        transferred := false
        opened := false
        try {
            loop 5 {
                if DllCall("OpenClipboard", "ptr", A_ScriptHwnd) {
                    opened := true
                    break
                }
                Sleep(10)
            }
            if !opened
                return false
            if !DllCall("EmptyClipboard")
                return false
            if !DllCall("SetClipboardData", "uint", format, "ptr", memory, "ptr")
                return false
            transferred := true
            return true
        } finally {
            if opened
                DllCall("CloseClipboard")
            if !transferred
                DllCall("GlobalFree", "ptr", memory)
            this.EndLauncherMutation()
        }
    }

    IsLauncherClipboardOwner() {
        owner := DllCall("GetClipboardOwner", "ptr")
        if !owner
            return false
        processId := 0
        DllCall("GetWindowThreadProcessId", "ptr", owner, "uint*", &processId)
        return processId = DllCall("GetCurrentProcessId", "uint")
    }

    SourceApplication() {
        owner := DllCall("GetClipboardOwner", "ptr")
        if !owner
            return ""
        try {
            name := WinGetProcessName("ahk_id " owner)
            SplitPath(name, &fileName)
            return fileName
        }
        return ""
    }

    TogglePin(index) {
        result := this.Model.TogglePin(index)
        this.Notify(result.Status)
        return result
    }

    Delete(index) {
        deleted := this.Model.Delete(index)
        if deleted
            this.Notify("deleted")
        return deleted
    }

    Clear() {
        this.Model.Clear()
        this.Notify("cleared")
    }

    ReleasePreviews() {
        for entry in this.Entries
            entry.ReleasePreview()
    }

    CreatePreviewBitmap(index) {
        this.ReleasePreviews()
        if index < 1 || index > this.Entries.Length
            return 0
        entry := this.Entries[index]
        if entry.Kind != "image" || !IsObject(entry.Dib)
            return 0
        details := this.ValidateDib(entry.Dib)
        if !details.Ok
            return 0
        hdc := DllCall("GetDC", "ptr", 0, "ptr")
        if !hdc
            return 0
        try bitmap := DllCall("CreateDIBitmap", "ptr", hdc, "ptr", entry.Dib.Ptr,
            "uint", 4, "ptr", entry.Dib.Ptr + details.BitsOffset, "ptr", entry.Dib.Ptr,
            "uint", 0, "ptr")
        finally DllCall("ReleaseDC", "ptr", 0, "ptr", hdc)
        entry.PreviewBitmap := bitmap
        return bitmap
    }

    Notify(status) {
        this.LastStatus := status
        if IsObject(this.ChangedCallback)
            try this.ChangedCallback.Call(status)
    }
}
