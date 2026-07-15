class SettingsManager {
    static SettingsDir := EnvGet("LOCALAPPDATA") "\OlioLauncher"
    static SettingsPath := SettingsManager.SettingsDir "\settings.json"
    static Values := 0
    static Warnings := []
    static InvalidSource := false

    static Defaults() {
        return Map(
            "focusKey", "#+F23",
            "startWithWindows", false,
            "panelWidth", 360,
            "alwaysOnTop", true,
            "closeOnFocusLost", true,
            "loggingEnabled", false,
            "clipboardPaused", false,
            "sensitiveApplications", "KeePass.exe;KeePassXC.exe;1Password.exe;Bitwarden.exe",
            "lastSelected", "clipboard",
            "openingMonitor", "active",
            "openingPosition", "right"
        )
    }

    static Load() {
        this.Warnings := []
        this.InvalidSource := false
        defaults := this.Defaults()
        if !FileExist(this.SettingsPath) {
            this.Values := defaults
            return this.Values
        }
        try parsed := FlatJson.Parse(FileRead(this.SettingsPath, "UTF-8"))
        catch as parseError {
            this.Warnings.Push("settings-json-invalid")
            this.InvalidSource := true
            this.Values := defaults
            return this.Values
        }
        this.Values := this.Validate(parsed)
        this.InvalidSource := this.Warnings.Length > 0
        return this.Values
    }

    static Validate(candidate) {
        result := this.Defaults()
        if !(candidate is Map) {
            this.Warnings.Push("settings-root-invalid")
            return result
        }
        this.AcceptString(candidate, result, "focusKey", 1, 64)
        this.AcceptBoolean(candidate, result, "startWithWindows")
        this.AcceptInteger(candidate, result, "panelWidth", 280, 640)
        this.AcceptBoolean(candidate, result, "alwaysOnTop")
        this.AcceptBoolean(candidate, result, "closeOnFocusLost")
        this.AcceptBoolean(candidate, result, "loggingEnabled")
        this.AcceptBoolean(candidate, result, "clipboardPaused")
        this.AcceptString(candidate, result, "sensitiveApplications", 0, 512)
        this.AcceptEnum(candidate, result, "lastSelected", ["clipboard", "screenshot", "quickPastes", "settings"])
        this.AcceptEnum(candidate, result, "openingMonitor", ["active", "primary"])
        this.AcceptEnum(candidate, result, "openingPosition", ["right"])
        return result
    }

    static AcceptString(candidate, result, key, minimum, maximum) {
        if !candidate.Has(key)
            return
        value := candidate[key]
        if Type(value) = "String" && StrLen(value) >= minimum && StrLen(value) <= maximum
            && !RegExMatch(value, "[\r\n]")
            result[key] := value
        else
            this.Warnings.Push(key "-defaulted")
    }

    static AcceptBoolean(candidate, result, key) {
        if !candidate.Has(key)
            return
        value := candidate[key]
        if Type(value) = "Integer" && (value = 0 || value = 1)
            result[key] := value = 1
        else
            this.Warnings.Push(key "-defaulted")
    }

    static AcceptInteger(candidate, result, key, minimum, maximum) {
        if !candidate.Has(key)
            return
        value := candidate[key]
        if Type(value) = "Integer" && value >= minimum && value <= maximum
            result[key] := value
        else
            this.Warnings.Push(key "-defaulted")
    }

    static AcceptEnum(candidate, result, key, allowed) {
        if !candidate.Has(key)
            return
        value := candidate[key]
        valid := false
        if Type(value) = "String" {
            for item in allowed {
                if value = item {
                    valid := true
                    break
                }
            }
        }
        if valid
            result[key] := value
        else
            this.Warnings.Push(key "-defaulted")
    }

    static Update(key, value) {
        if !IsObject(this.Values)
            this.Load()
        candidate := Map()
        for currentKey, currentValue in this.Values
            candidate[currentKey] := currentValue
        candidate[key] := value
        validated := this.Validate(candidate)
        this.Values := validated
        this.Save()
    }

    static Save() {
        DirCreate(this.SettingsDir)
        if this.InvalidSource && FileExist(this.SettingsPath) {
            backup := this.SettingsDir "\settings.invalid." FormatTime(, "yyyyMMdd-HHmmss") ".json"
            FileCopy(this.SettingsPath, backup)
            this.InvalidSource := false
        }
        json := this.Serialize(this.Values)
        temporary := this.SettingsPath ".tmp." DllCall("GetCurrentProcessId", "uint") "." A_TickCount
        outputFile := FileOpen(temporary, "w", "UTF-8-RAW")
        if !outputFile
            throw OSError("Unable to create the temporary settings file.")
        try outputFile.Write(json)
        finally outputFile.Close()
        if !DllCall("MoveFileExW", "str", temporary, "str", this.SettingsPath, "uint", 0x1 | 0x8) {
            try FileDelete(temporary)
            throw OSError("Unable to replace settings.json atomically.")
        }
    }

    static Serialize(values) {
        boolean(value) => value ? "true" : "false"
        return "{`n"
            . "  " FlatJson.Quote("focusKey") ": " FlatJson.Quote(values["focusKey"]) ",`n"
            . "  " FlatJson.Quote("startWithWindows") ": " boolean(values["startWithWindows"]) ",`n"
            . "  " FlatJson.Quote("panelWidth") ": " values["panelWidth"] ",`n"
            . "  " FlatJson.Quote("alwaysOnTop") ": " boolean(values["alwaysOnTop"]) ",`n"
            . "  " FlatJson.Quote("closeOnFocusLost") ": " boolean(values["closeOnFocusLost"]) ",`n"
            . "  " FlatJson.Quote("loggingEnabled") ": " boolean(values["loggingEnabled"]) ",`n"
            . "  " FlatJson.Quote("clipboardPaused") ": " boolean(values["clipboardPaused"]) ",`n"
            . "  " FlatJson.Quote("sensitiveApplications") ": " FlatJson.Quote(values["sensitiveApplications"]) ",`n"
            . "  " FlatJson.Quote("lastSelected") ": " FlatJson.Quote(values["lastSelected"]) ",`n"
            . "  " FlatJson.Quote("openingMonitor") ": " FlatJson.Quote(values["openingMonitor"]) ",`n"
            . "  " FlatJson.Quote("openingPosition") ": " FlatJson.Quote(values["openingPosition"]) "`n"
            . "}`n"
    }
}
