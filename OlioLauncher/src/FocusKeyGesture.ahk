class FocusKeyGesture {
    __New(maxIntervalMs := 350) {
        this.MaxIntervalMs := Max(100, maxIntervalMs)
        this.LastPressAt := 0
        this.ReleasedSincePress := true
        this.LastResult := "ready"
    }

    Press(timestamp := A_TickCount) {
        if !this.ReleasedSincePress {
            this.LastResult := "repeat"
            return false
        }
        isSecondPress := this.LastPressAt
            && timestamp >= this.LastPressAt
            && timestamp - this.LastPressAt <= this.MaxIntervalMs
        this.ReleasedSincePress := false
        this.LastPressAt := isSecondPress ? 0 : timestamp
        this.LastResult := isSecondPress ? "double" : "first"
        return isSecondPress
    }

    Release(*) {
        this.ReleasedSincePress := true
    }

    Reset() {
        this.LastPressAt := 0
        this.ReleasedSincePress := true
        this.LastResult := "ready"
    }
}
