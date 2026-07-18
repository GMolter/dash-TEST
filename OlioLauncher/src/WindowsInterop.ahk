class WindowsInterop {
    static EnablePerMonitorV2() {
        return DllCall("SetProcessDpiAwarenessContext", "ptr", -4, "ptr")
    }

    static ForegroundWorkArea(usePrimary := false) {
        hwnd := DllCall("GetForegroundWindow", "ptr")
        if usePrimary {
            point := Buffer(8, 0)
            monitor := DllCall("MonitorFromPoint", "int64", NumGet(point, 0, "int64"), "uint", 1, "ptr")
        } else {
            monitor := DllCall("MonitorFromWindow", "ptr", hwnd, "uint", 2, "ptr")
        }
        info := Buffer(40, 0)
        NumPut("uint", 40, info, 0)
        if !DllCall("GetMonitorInfoW", "ptr", monitor, "ptr", info)
            throw OSError()
        dpi := 96, dpiY := 96
        try {
            if DllCall("Shcore\GetDpiForMonitor", "ptr", monitor, "uint", 0,
                "uint*", &dpi, "uint*", &dpiY, "uint") != 0
                dpi := 96
        }
        return {
            Left: NumGet(info, 20, "int"), Top: NumGet(info, 24, "int"),
            Right: NumGet(info, 28, "int"), Bottom: NumGet(info, 32, "int"),
            Dpi: dpi, Foreground: hwnd
        }
    }

    static RestoreForeground(hwnd) {
        if hwnd && DllCall("IsWindow", "ptr", hwnd)
            DllCall("SetForegroundWindow", "ptr", hwnd)
    }

    static PasteClipboardToWindow(hwnd) {
        target := this.RootWindow(hwnd)
        if !target || !DllCall("IsWindow", "ptr", target)
            return false
        if !DllCall("SetForegroundWindow", "ptr", target)
            return false
        Sleep(25)
        if this.RootWindow(DllCall("GetForegroundWindow", "ptr")) != target
            return false

        inputSize := A_PtrSize = 8 ? 40 : 28
        unionOffset := A_PtrSize = 8 ? 8 : 4
        flagsOffset := unionOffset + 4
        inputs := Buffer(inputSize * 4, 0)
        keys := [
            {Vk: 0x11, Flags: 0},
            {Vk: 0x56, Flags: 0},
            {Vk: 0x56, Flags: 0x2},
            {Vk: 0x11, Flags: 0x2}
        ]
        for index, key in keys {
            offset := (index - 1) * inputSize
            NumPut("uint", 1, inputs, offset)
            NumPut("ushort", key.Vk, inputs, offset + unionOffset)
            NumPut("uint", key.Flags, inputs, offset + flagsOffset)
        }
        return DllCall("SendInput", "uint", keys.Length, "ptr", inputs,
            "int", inputSize, "uint") = keys.Length
    }

    static RootWindow(hwnd) {
        return hwnd ? DllCall("GetAncestor", "ptr", hwnd, "uint", 2, "ptr") : 0
    }
}
