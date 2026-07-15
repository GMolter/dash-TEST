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

    static RootWindow(hwnd) {
        return hwnd ? DllCall("GetAncestor", "ptr", hwnd, "uint", 2, "ptr") : 0
    }
}
