class HotkeyManager {
    static RegisteredKey := ""
    static RegisteredReleaseKey := ""
    static Callback := 0
    static ReleaseCallback := 0

    static Register(keyName, callback, releaseCallback := 0) {
        this.Unregister()
        if !this.IsUsable(keyName)
            return {Ok: false, Status: "Focus Key is invalid or reserved."}
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
        } catch {
            this.Unregister()
            return {Ok: false, Status: "Focus Key is unavailable."}
        }
    }

    static Validate(keyName) {
        if !this.IsUsable(keyName)
            return {Ok: false, Status: "invalid-or-reserved"}
        if keyName = this.RegisteredKey
            return {Ok: true, Status: "available"}
        probe := (*) => 0
        try {
            Hotkey(keyName, probe, "On")
            Hotkey(keyName, "Off")
            return {Ok: true, Status: "available"}
        } catch {
            try Hotkey(keyName, "Off")
            return {Ok: false, Status: "unavailable"}
        }
    }

    static IsUsable(keyName) {
        if Type(keyName) != "String" || StrLen(keyName) < 1
            || StrLen(keyName) > 64 || RegExMatch(keyName, "[\r\n\t]")
            return false
        normalized := StrLower(RegExReplace(Trim(keyName), "\s+"))
        normalized := RegExReplace(normalized, "^[~*$]+")
        if normalized = ""
            return false
        reserved := [
            "escape", "tab", "enter", "space", "backspace", "delete",
            "lwin", "rwin", "alt", "lalt", "ralt", "control", "ctrl",
            "lcontrol", "rcontrol", "shift", "lshift", "rshift",
            "!tab", "!escape", "^!delete", "#l", "#u"
        ]
        for item in reserved {
            if normalized = item
                return false
        }
        return true
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
