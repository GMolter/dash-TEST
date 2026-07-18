class FlatJson {
    static Parse(text) {
        if SubStr(text, 1, 1) = Chr(0xFEFF)
            text := SubStr(text, 2)
        index := 1
        this.SkipWhitespace(text, &index)
        result := this.ParseValue(text, &index)
        this.SkipWhitespace(text, &index)
        if index <= StrLen(text)
            throw ValueError("Unexpected data after the JSON value.")
        return result
    }

    static ParseValue(text, &index) {
        char := SubStr(text, index, 1)
        if char = "{"
            return this.ParseObject(text, &index)
        if char = "["
            return this.ParseArray(text, &index)
        if char = Chr(34)
            return this.ParseString(text, &index)
        remainder := SubStr(text, index)
        if SubStr(remainder, 1, 4) = "true" {
            index += 4
            return true
        }
        if SubStr(remainder, 1, 5) = "false" {
            index += 5
            return false
        }
        if SubStr(remainder, 1, 4) = "null" {
            index += 4
            return ""
        }
        if RegExMatch(remainder, "^-?(?:0|[1-9]\d*)(?:\.\d+)?", &match) {
            token := match[0]
            index += StrLen(token)
            return InStr(token, ".") ? Float(token) : Integer(token)
        }
        throw ValueError("Unsupported JSON value.")
    }

    static ParseObject(text, &index) {
        this.Expect(text, &index, "{")
        result := Map()
        this.SkipWhitespace(text, &index)
        if SubStr(text, index, 1) = "}" {
            index += 1
            return result
        }
        loop {
            this.SkipWhitespace(text, &index)
            key := this.ParseString(text, &index)
            this.SkipWhitespace(text, &index)
            this.Expect(text, &index, ":")
            this.SkipWhitespace(text, &index)
            result[key] := this.ParseValue(text, &index)
            this.SkipWhitespace(text, &index)
            char := SubStr(text, index, 1)
            if char = "}" {
                index += 1
                break
            }
            this.Expect(text, &index, ",")
        }
        return result
    }

    static ParseArray(text, &index) {
        this.Expect(text, &index, "[")
        result := []
        this.SkipWhitespace(text, &index)
        if SubStr(text, index, 1) = "]" {
            index += 1
            return result
        }
        loop {
            this.SkipWhitespace(text, &index)
            result.Push(this.ParseValue(text, &index))
            this.SkipWhitespace(text, &index)
            char := SubStr(text, index, 1)
            if char = "]" {
                index += 1
                break
            }
            this.Expect(text, &index, ",")
        }
        return result
    }

    static ParseString(text, &index) {
        this.Expect(text, &index, Chr(34))
        value := ""
        while index <= StrLen(text) {
            char := SubStr(text, index, 1)
            index += 1
            if char = Chr(34)
                return value
            if char != "\" {
                value .= char
                continue
            }
            if index > StrLen(text)
                throw ValueError("Incomplete JSON escape sequence.")
            escape := SubStr(text, index, 1)
            index += 1
            switch escape {
                case Chr(34), "\", "/": value .= escape
                case "b": value .= Chr(8)
                case "f": value .= Chr(12)
                case "n": value .= "`n"
                case "r": value .= "`r"
                case "t": value .= "`t"
                case "u":
                    hex := SubStr(text, index, 4)
                    if StrLen(hex) != 4 || !RegExMatch(hex, "^[0-9A-Fa-f]{4}$")
                        throw ValueError("Invalid JSON Unicode escape sequence.")
                    value .= Chr(Integer("0x" hex))
                    index += 4
                default: throw ValueError("Unsupported JSON escape sequence.")
            }
        }
        throw ValueError("Unterminated JSON string.")
    }

    static Quote(value) {
        output := Chr(34)
        loop parse value {
            char := A_LoopField
            code := Ord(char)
            switch char {
                case Chr(34): output .= "\" Chr(34)
                case "\": output .= "\\"
                case "`b": output .= "\b"
                case "`f": output .= "\f"
                case "`n": output .= "\n"
                case "`r": output .= "\r"
                case "`t": output .= "\t"
                default:
                    output .= code < 32 ? "\u" Format("{:04X}", code) : char
            }
        }
        return output Chr(34)
    }

    static SkipWhitespace(text, &index) {
        while index <= StrLen(text) && InStr(" `t`r`n", SubStr(text, index, 1))
            index += 1
    }

    static Expect(text, &index, expected) {
        if SubStr(text, index, 1) != expected
            throw ValueError("Expected '" expected "' at character " index ".")
        index += 1
    }
}
