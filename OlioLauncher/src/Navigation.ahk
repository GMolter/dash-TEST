class Navigation {
    __New(gui, controls, escapeCallback) {
        this.Gui := gui
        this.Controls := controls
        this.EscapeCallback := escapeCallback
        this.MessageHandler := ObjBindMethod(this, "OnKeyDown")
        OnMessage(0x0100, this.MessageHandler) ; WM_KEYDOWN
    }

    OnKeyDown(wParam, lParam, msg, hwnd) {
        if WindowsInterop.RootWindow(hwnd) != this.Gui.Hwnd
            return
        switch wParam {
            case 0x1B: ; Escape
                this.EscapeCallback.Call()
                return 0
            case 0x26: ; Up
                this.MoveFocus(-1)
                return 0
            case 0x28: ; Down
                this.MoveFocus(1)
                return 0
        }
    }

    MoveFocus(direction) {
        if !this.Controls.Length
            return
        focused := DllCall("GetFocus", "ptr")
        current := 0
        for index, control in this.Controls {
            if control.Hwnd = focused {
                current := index
                break
            }
        }
        next := current ? current + direction : (direction > 0 ? 1 : this.Controls.Length)
        if next < 1
            next := this.Controls.Length
        else if next > this.Controls.Length
            next := 1
        this.Controls[next].Focus()
    }

    ActivateFocused() {
        focused := DllCall("GetFocus", "ptr")
        for control in this.Controls {
            if control.Hwnd = focused {
                DllCall("SendMessageW", "ptr", control.Hwnd, "uint", 0x00F5,
                    "uptr", 0, "ptr", 0) ; BM_CLICK
                return
            }
        }
    }
}
