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
        safeEvent := this.SafeToken(eventName)
        safeStatus := this.SafeToken(status)
        line := FormatTime(, "yyyy-MM-dd'T'HH:mm:ss") "`t" safeEvent "`t" safeStatus "`n"
        try FileAppend(line, this.LogFile, "UTF-8")
    }

    static SafeToken(value) {
        value := SubStr(String(value), 1, 120)
        value := RegExReplace(value, "[\r\n\t]", " ")
        ; Diagnostics accept event/status tokens only. Redact common secret markers even
        ; if a future caller accidentally passes one.
        value := RegExReplace(value, "i)(token|secret|password|clipboard|content|code)\s*[:=].*", "$1=[REDACTED]")
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

