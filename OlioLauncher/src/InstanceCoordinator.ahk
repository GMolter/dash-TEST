class InstanceCoordinator {
    static MutexHandle := 0
    static ActivationMessage := 0
    static ActivationCallback := 0
    static MessageHandler := 0
    static LastSenderPid := 0
    static LastActivationTick := 0

    static BecomePrimary(callback, namespaceSuffix := "") {
        this.ActivationMessage := DllCall("RegisterWindowMessageW", "str",
            "OlioLauncher.Toggle.v1" namespaceSuffix, "uint")
        if !this.ActivationMessage
            throw OSError()
        this.ActivationCallback := callback
        this.MessageHandler := ObjBindMethod(this, "HandleActivation")
        OnMessage(this.ActivationMessage, this.MessageHandler)
        this.MutexHandle := DllCall("CreateMutexW", "ptr", 0, "int", false,
            "str", "Local\OlioLauncher.SingleInstance.v1" namespaceSuffix, "ptr")
        if !this.MutexHandle
            throw OSError()
        alreadyRunning := A_LastError = 183
        if alreadyRunning {
            senderPid := DllCall("GetCurrentProcessId", "uint")
            DllCall("PostMessageW", "ptr", 0xFFFF, "uint", this.ActivationMessage,
                "uptr", senderPid, "ptr", 0)
            DllCall("CloseHandle", "ptr", this.MutexHandle)
            this.MutexHandle := 0
            return false
        }
        OnExit((*) => this.Release())
        return true
    }

    static HandleActivation(wParam, lParam, msg, hwnd) {
        ; HWND_BROADCAST can deliver the registered message to both AutoHotkey's hidden
        ; main window and the visible launcher GUI. One sender process means one toggle.
        if wParam && wParam = this.LastSenderPid && A_TickCount - this.LastActivationTick < 2000
            return 0
        this.LastSenderPid := wParam
        this.LastActivationTick := A_TickCount
        this.ActivationCallback.Call()
        return 0
    }

    static Release() {
        if this.MutexHandle {
            DllCall("CloseHandle", "ptr", this.MutexHandle)
            this.MutexHandle := 0
        }
    }
}
