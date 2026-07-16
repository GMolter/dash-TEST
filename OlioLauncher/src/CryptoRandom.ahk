class CryptoRandom {
    static Bytes(count) {
        if count < 1 || count > 4096
            throw ValueError("Invalid cryptographic byte count.")
        randomBuffer := Buffer(count, 0)
        status := DllCall("bcrypt\BCryptGenRandom", "ptr", 0, "ptr", randomBuffer,
            "uint", count, "uint", 0x2, "uint") ; BCRYPT_USE_SYSTEM_PREFERRED_RNG
        if status != 0
            throw OSError("Windows cryptographic random generation failed.")
        return randomBuffer
    }

    static Hex(count := 32) {
        bytes := this.Bytes(count)
        result := ""
        loop bytes.Size
            result .= Format("{:02x}", NumGet(bytes, A_Index - 1, "uchar"))
        return result
    }

    static Guid() {
        bytes := this.Bytes(16)
        NumPut("uchar", (NumGet(bytes, 6, "uchar") & 0x0F) | 0x40, bytes, 6)
        NumPut("uchar", (NumGet(bytes, 8, "uchar") & 0x3F) | 0x80, bytes, 8)
        hex := ""
        loop 16
            hex .= Format("{:02x}", NumGet(bytes, A_Index - 1, "uchar"))
        return (SubStr(hex, 1, 8) . "-" . SubStr(hex, 9, 4) . "-"
            . SubStr(hex, 13, 4) . "-" . SubStr(hex, 17, 4) . "-"
            . SubStr(hex, 21, 12))
    }
}
