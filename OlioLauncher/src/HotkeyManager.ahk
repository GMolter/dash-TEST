class HotkeyManager {
    static RegisteredKey := ""
    static Callback := 0

    static Register(keyName, callback) {
        this.Unregister()
        try {
            Hotkey(keyName, callback, "On")
            this.RegisteredKey := keyName
            this.Callback := callback
            return {Ok: true, Status: "Focus Key: " keyName}
        } catch as hotkeyError {
            return {Ok: false, Status: "Focus Key error: " hotkeyError.Message}
        }
    }

    static Unregister() {
        if !this.RegisteredKey
            return
        try Hotkey(this.RegisteredKey, "Off")
        this.RegisteredKey := ""
        this.Callback := 0
    }
}
