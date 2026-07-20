class CredentialStore {
    static TargetPrefix := "OlioLauncher.DeviceCredential.v1."

    __New(targetSuffix := "") {
        this.Target := "OlioLauncher.DeviceCredential.v1" targetSuffix
    }

    Write(value) {
        if !RegExMatch(value, "i)^[0-9a-f]{64}$")
            return false
        blob := Buffer((StrLen(value) + 1) * 2, 0)
        StrPut(value, blob, "UTF-16")
        size := A_PtrSize = 8 ? 80 : 52
        credential := Buffer(size, 0)
        target := Buffer((StrLen(this.Target) + 1) * 2, 0)
        StrPut(this.Target, target, "UTF-16")
        username := Buffer(32, 0)
        StrPut("OlioLauncher", username, "UTF-16")
        NumPut("uint", 0, credential, 0)
        NumPut("uint", 1, credential, 4) ; CRED_TYPE_GENERIC
        NumPut("ptr", target.Ptr, credential, 8)
        blobSizeOffset := A_PtrSize = 8 ? 32 : 24
        blobOffset := A_PtrSize = 8 ? 40 : 28
        persistOffset := A_PtrSize = 8 ? 48 : 32
        userOffset := A_PtrSize = 8 ? 72 : 48
        NumPut("uint", StrLen(value) * 2, credential, blobSizeOffset)
        NumPut("ptr", blob.Ptr, credential, blobOffset)
        NumPut("uint", 2, credential, persistOffset) ; CRED_PERSIST_LOCAL_MACHINE
        NumPut("ptr", username.Ptr, credential, userOffset)
        return DllCall("Advapi32\CredWriteW", "ptr", credential, "uint", 0, "int") != 0
    }

    Read() {
        pointer := 0
        if !DllCall("Advapi32\CredReadW", "str", this.Target, "uint", 1,
            "uint", 0, "ptr*", &pointer, "int")
            return ""
        try {
            blobSizeOffset := A_PtrSize = 8 ? 32 : 24
            blobOffset := A_PtrSize = 8 ? 40 : 28
            blobSize := NumGet(pointer, blobSizeOffset, "uint")
            blobPointer := NumGet(pointer, blobOffset, "ptr")
            if !blobPointer || blobSize != 128
                return ""
            value := StrGet(blobPointer, blobSize // 2, "UTF-16")
            return RegExMatch(value, "i)^[0-9a-f]{64}$") ? value : ""
        } finally DllCall("Advapi32\CredFree", "ptr", pointer)
    }

    Delete() {
        if DllCall("Advapi32\CredDeleteW", "str", this.Target, "uint", 1,
            "uint", 0, "int")
            return true
        return A_LastError = 1168 ; ERROR_NOT_FOUND
    }

    static DiscoverDeviceIds() {
        count := 0, credentials := 0, result := []
        if !DllCall("Advapi32\CredEnumerateW", "str", this.TargetPrefix "*",
            "uint", 0, "uint*", &count, "ptr*", &credentials, "int")
            return result
        try {
            Loop count {
                credential := NumGet(credentials, (A_Index - 1) * A_PtrSize, "ptr")
                targetPointer := credential ? NumGet(credential, 8, "ptr") : 0
                if !targetPointer
                    continue
                target := StrGet(targetPointer, "UTF-16")
                if InStr(target, this.TargetPrefix) != 1
                    continue
                deviceId := SubStr(target, StrLen(this.TargetPrefix) + 1)
                if RegExMatch(deviceId,
                    "i)^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
                    result.Push(deviceId)
            }
        } finally DllCall("Advapi32\CredFree", "ptr", credentials)
        return result
    }
}
