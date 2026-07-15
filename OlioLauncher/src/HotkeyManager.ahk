class HotkeyManager {
    static RegisteredKey := ""
    static RegisteredReleaseKey := ""
    static Callback := 0
    static ReleaseCallback := 0

    static Register(keyName, callback, releaseCallback := 0) {
        this.Unregister()
        try {
            Hotkey(keyName, callback, "On")
            this.RegisteredKey := keyName
            this.Callback := callback
            if IsObject(releaseCallback) {
                this.RegisteredReleaseKey := keyName " up"
                this.ReleaseCallback := releaseCallback
                Hotkey(this.RegisteredReleaseKey, releaseCallback, "On")
            }
            return {Ok: true, Status: "Focus Key: " keyName}
        } catch as hotkeyError {
            this.Unregister()
            return {Ok: false, Status: "Focus Key error: " hotkeyError.Message}
        }
    }

    static Unregister() {
        if this.RegisteredReleaseKey
            try Hotkey(this.RegisteredReleaseKey, "Off")
        if this.RegisteredKey
            try Hotkey(this.RegisteredKey, "Off")
        this.RegisteredKey := ""
        this.RegisteredReleaseKey := ""
        this.Callback := 0
        this.ReleaseCallback := 0
    }
}
