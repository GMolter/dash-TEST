#Requires AutoHotkey v2.0.26
#Warn All, StdOut

mode := A_Args.Length ? A_Args[1] : ""
switch mode {
    case "text":
        A_Clipboard := A_Args.Length > 1 ? A_Args[2] : ""
        ClipWait(1)
        Sleep(75)
    case "rapid":
        count := A_Args.Length > 1 ? Integer(A_Args[1 + 1]) : 30
        loop count {
            A_Clipboard := "event-" A_Index "-" A_TickCount
            Sleep(12)
        }
        Sleep(100)
    case "ansi":
        value := A_Args.Length > 1 ? A_Args[2] : ""
        bytes := StrPut(value, "CP0")
        memory := DllCall("GlobalAlloc", "uint", 0x42, "uptr", bytes, "ptr")
        pointer := DllCall("GlobalLock", "ptr", memory, "ptr")
        StrPut(value, pointer, bytes, "CP0")
        DllCall("GlobalUnlock", "ptr", memory)
        transferred := false
        if !DllCall("OpenClipboard", "ptr", A_ScriptHwnd)
            ExitApp(5)
        try {
            DllCall("EmptyClipboard")
            if !DllCall("SetClipboardData", "uint", 1, "ptr", memory, "ptr")
                ExitApp(6)
            transferred := true
        } finally {
            DllCall("CloseClipboard")
            if !transferred
                DllCall("GlobalFree", "ptr", memory)
        }
        Sleep(75)
    case "bitmap":
        screenDc := DllCall("GetDC", "ptr", 0, "ptr")
        bitmap := DllCall("CreateCompatibleBitmap", "ptr", screenDc,
            "int", 3, "int", 2, "ptr")
        DllCall("ReleaseDC", "ptr", 0, "ptr", screenDc)
        if !bitmap
            ExitApp(2)
        transferred := false
        if !DllCall("OpenClipboard", "ptr", A_ScriptHwnd)
            ExitApp(3)
        try {
            DllCall("EmptyClipboard")
            if !DllCall("SetClipboardData", "uint", 2, "ptr", bitmap, "ptr")
                ExitApp(4)
            transferred := true
        } finally {
            DllCall("CloseClipboard")
            if !transferred
                DllCall("DeleteObject", "ptr", bitmap)
        }
        Sleep(100)
    case "hold":
        eventName := A_Args.Length > 1 ? A_Args[2] : ""
        holdMs := A_Args.Length > 2 ? Integer(A_Args[3]) : 150
        if !DllCall("OpenClipboard", "ptr", A_ScriptHwnd)
            ExitApp(7)
        eventHandle := 0
        try {
            if eventName {
                eventHandle := DllCall("OpenEventW", "uint", 0x2, "int", false,
                    "str", eventName, "ptr")
                if eventHandle
                    DllCall("SetEvent", "ptr", eventHandle)
            }
            Sleep(holdMs)
        } finally {
            if eventHandle
                DllCall("CloseHandle", "ptr", eventHandle)
            DllCall("CloseClipboard")
        }
    default:
        ExitApp(1)
}
ExitApp(0)
