class RedactedLogger {
    static Enabled := false
    static LogDir := EnvGet("LOCALAPPDATA") "\OlioLauncher\logs"
    static LogFile := RedactedLogger.LogDir "\launcher.log"

    static Configure(enabled) {
        this.Enabled := enabled = true
        if !this.Enabled
            return
        DirCreate(this.LogDir)
        this.RotateIfNeeded()
    }

    static Write(eventName, status := "ok") {
        if !this.Enabled
            return
        safeEvent := this.SafeToken(eventName, "event")
        safeStatus := this.SafeToken(status, "status")
        line := FormatTime(, "yyyy-MM-dd'T'HH:mm:ss") "`t" safeEvent "`t" safeStatus "`n"
        try FileAppend(line, this.LogFile, "UTF-8")
    }

    static SafeToken(value, kind := "status") {
        value := String(value)
        ; Diagnostics are an allowlisted event/status channel, never a general text
        ; logger. Anything that resembles user data, identifiers, credentials, bodies,
        ; headers, or content is replaced before touching disk.
        if StrLen(value) < 1 || StrLen(value) > 48
            || !RegExMatch(value, "^[A-Za-z0-9][A-Za-z0-9.-]*$")
            || RegExMatch(value, "i)@|bearer|authorization|request|response|body|"
                . "token|secret|password|credential|clipboard|content|quick.?paste|"
                . "screenshot|pixel|email|account|user.?id")
            || RegExMatch(value, "i)^[0-9a-f]{64}$")
            || RegExMatch(value,
                "i)^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
            return "redacted"
        if kind = "event" {
            allowed := Map(
                "app-start", true, "app-stop", true, "settings-warning", true,
                "startup-registration", true, "focus-key-registration", true,
                "navigation", true, "settings-write", true, "settings-save", true,
                "settings-reset", true, "capture-result", true
            )
            return allowed.Has(value) ? value : "redacted"
        }
        return value
    }

    static RotateIfNeeded() {
        try {
            if FileExist(this.LogFile) && FileGetSize(this.LogFile) > 1048576 {
                backup := this.LogFile ".1"
                if FileExist(backup)
                    FileDelete(backup)
                FileMove(this.LogFile, backup)
            }
        }
    }
}
