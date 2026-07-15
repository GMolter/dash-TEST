class Navigation {
    __New(gui, controls, escapeCallback) {
        this.Gui := gui
        this.Controls := controls
        this.EscapeCallback := escapeCallback
        this.MessageHandler := ObjBindMethod(this, "OnKeyDown")
        OnMessage(0x0100, this.MessageHandler) ; WM_KEYDOWN
    }

    OnKeyDown(wParam, lParam, msg, hwnd) {
        try guiHwnd := this.Gui.Hwnd
        catch
            return
        if WindowsInterop.RootWindow(hwnd) != guiHwnd
            return
        try {
            if (WinGetClass("ahk_id " hwnd) = "SysListView32"
                || WinGetClass("ahk_id " hwnd) = "ListBox")
                && (wParam = 0x25 || wParam = 0x26 || wParam = 0x27 || wParam = 0x28)
                return
        }
        switch wParam {
            case 0x1B: ; Escape
                this.EscapeCallback.Call()
                return 0
            case 0x25: ; Left
                this.MoveDirectional(-1, 0)
                return 0
            case 0x26: ; Up
                this.MoveDirectional(0, -1)
                return 0
            case 0x27: ; Right
                this.MoveDirectional(1, 0)
                return 0
            case 0x28: ; Down
                this.MoveDirectional(0, 1)
                return 0
        }
    }

    MoveDirectional(horizontal, vertical) {
        if !this.Controls.Length
            return
        focused := DllCall("GetFocus", "ptr")
        source := 0
        for control in this.Controls {
            if control.Hwnd = focused {
                source := control
                break
            }
        }
        if !source
            source := this.Controls[1]
        target := this.FindDirectional(source, horizontal, vertical)
        if target
            target.Focus()
        else if focused != source.Hwnd
            source.Focus()
    }

    FindDirectional(source, horizontal, vertical) {
        source.GetPos(&sourceX, &sourceY, &sourceWidth, &sourceHeight)
        sourceCenterX := sourceX + sourceWidth / 2
        sourceCenterY := sourceY + sourceHeight / 2
        bestControl := 0
        bestScore := 0

        for control in this.Controls {
            if control.Hwnd = source.Hwnd
                continue
            control.GetPos(&candidateX, &candidateY, &candidateWidth, &candidateHeight)
            deltaX := candidateX + candidateWidth / 2 - sourceCenterX
            deltaY := candidateY + candidateHeight / 2 - sourceCenterY
            primaryDistance := horizontal
                ? deltaX * horizontal
                : deltaY * vertical
            if primaryDistance <= 0
                continue
            perpendicularDistance := horizontal ? Abs(deltaY) : Abs(deltaX)
            score := primaryDistance + perpendicularDistance * 2
            if !bestControl || score < bestScore {
                bestControl := control
                bestScore := score
            }
        }
        return bestControl
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
