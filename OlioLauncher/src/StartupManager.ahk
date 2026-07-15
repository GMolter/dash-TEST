class StartupManager {
    static RegistryPath := "HKCU\Software\Microsoft\Windows\CurrentVersion\Run"
    static ValueName := "OlioLauncher"

    static Command() {
        if A_IsCompiled
            return Chr(34) A_ScriptFullPath Chr(34) " --background"
        return Chr(34) A_AhkPath Chr(34) " " Chr(34) A_ScriptFullPath Chr(34) " --background"
    }

    static Apply(enabled) {
        try {
            if enabled {
                expected := this.Command()
                current := ""
                try current := RegRead(this.RegistryPath, this.ValueName)
                if current != expected
                    RegWrite(expected, "REG_SZ", this.RegistryPath, this.ValueName)
                return {Ok: true, Status: "startup-enabled"}
            }
            try RegDelete(this.RegistryPath, this.ValueName)
            return {Ok: true, Status: "startup-disabled"}
        } catch as registryError {
            return {Ok: false, Status: "startup-error"}
        }
    }
}
