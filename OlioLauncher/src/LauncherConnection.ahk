class LauncherEndpoint {
    static ProductionOrigin := "https://olio.one"

    static Normalize(value) {
        value := Trim(String(value), " `t`r`n/")
        if !RegExMatch(value,
            "i)^https://([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)(?::([0-9]{1,5}))?$", &match)
            return ""
        port := match[2] ? ":" match[2] : ""
        return "https://" StrLower(match[1]) port
    }

    static ApiUrl(origin) => this.Normalize(origin) ? this.Normalize(origin) "/api/launcher" : ""

    static ApprovalUrl(origin, requestId, displayCode) {
        normalized := this.Normalize(origin)
        if !normalized || !RegExMatch(requestId,
            "i)^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
            return ""
        if !RegExMatch(displayCode, "^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$")
            return ""
        return normalized "/launcher/authorize?request=" requestId "&code=" displayCode
    }
}

class LauncherHttpTransport {
    static MaxResponseCharacters := 1048576

    __New() {
        this.Request := 0
        this.Callback := 0
        this.Timer := ObjBindMethod(this, "Check")
        this.StartedAt := 0
    }

    Post(url, json, callback) {
        if IsObject(this.Request)
            return false
        try {
            request := ComObject("WinHttp.WinHttpRequest.5.1")
            request.SetTimeouts(3000, 5000, 5000, 7000)
            ; Never forward pairing or device authentication material through a redirect.
            request.Option[6] := false
            request.Open("POST", url, true)
            request.SetRequestHeader("Content-Type", "application/json")
            request.SetRequestHeader("Accept", "application/json")
            request.SetRequestHeader("Cache-Control", "no-store")
            this.Request := request
            this.Callback := callback
            this.StartedAt := A_TickCount
            request.Send(json)
            SetTimer(this.Timer, 50)
            return true
        } catch {
            this.Request := 0
            this.Callback := 0
            return false
        }
    }

    Check(*) {
        if !IsObject(this.Request)
            return
        if A_TickCount - this.StartedAt > 9000 {
            this.Finish(false, 0)
            return
        }
        complete := false
        try complete := this.Request.WaitForResponse(0)
        catch
            return
        if complete
            this.Finish(true, this.Request.Status)
    }

    Finish(completed, status) {
        request := this.Request
        callback := this.Callback
        SetTimer(this.Timer, 0)
        this.Request := 0
        this.Callback := 0
        if !completed {
            try request.Abort()
            callback.Call({Ok: false, Status: 0, Data: 0})
            return
        }
        data := 0
        responseText := ""
        oversized := false
        try {
            contentLength := request.GetResponseHeader("Content-Length")
            if RegExMatch(contentLength, "^\d+$")
                oversized := Integer(contentLength) > LauncherHttpTransport.MaxResponseCharacters
        }
        if !oversized {
            try {
                responseText := request.ResponseText
                oversized := StrLen(responseText) > LauncherHttpTransport.MaxResponseCharacters
            }
        }
        if oversized {
            callback.Call({Ok: false, Status: 413,
                Data: Map("state", "too_large")})
            return
        }
        try data := FlatJson.Parse(responseText)
        catch
            data := 0
        callback.Call({Ok: status >= 200 && status < 300 && data is Map,
            Status: status, Data: data})
    }

    Cancel() {
        if !IsObject(this.Request)
            return
        request := this.Request
        SetTimer(this.Timer, 0)
        this.Request := 0
        this.Callback := 0
        try request.Abort()
    }
}

class LauncherConnection {
    __New(settings, changedCallback := 0, credentialStoreOverride := 0, transport := 0,
        browserRunner := 0) {
        this.Settings := settings
        this.ChangedCallback := changedCallback
        this.CredentialClearedCallback := 0
        this.Origin := LauncherEndpoint.ProductionOrigin
        if settings.Has("workstationUrl") {
            overrideOrigin := LauncherEndpoint.Normalize(settings["workstationUrl"])
            if overrideOrigin
                this.Origin := overrideOrigin
        }
        this.EnsureIdentity()
        this.CredentialStore := IsObject(credentialStoreOverride) ? credentialStoreOverride
            : CredentialStore("." this.Settings["deviceId"])
        this.Transport := IsObject(transport) ? transport : LauncherHttpTransport()
        this.BrowserRunner := IsObject(browserRunner) ? browserRunner : (url) => Run(url)
        this.State := "disconnected"
        this.Detail := "Connect without entering your Olio password."
        this.PairingSecret := ""
        this.RequestId := ""
        this.DisplayCode := ""
        this.ExpiresAt := ""
        this.PairingStartedAt := 0
        this.RequestBusy := false
        this.PollTimer := ObjBindMethod(this, "Poll")
        this.Credential := this.CredentialStore.Read()
        if this.Credential {
            this.State := "connected"
            this.Detail := "Connected. Open Settings to verify device status."
        }
    }

    EnsureIdentity() {
        changed := Map()
        if !this.Settings.Has("deviceId") || !RegExMatch(this.Settings["deviceId"],
            "i)^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$") {
            this.Settings["deviceId"] := CryptoRandom.Guid()
            changed["deviceId"] := this.Settings["deviceId"]
        }
        if !this.Settings.Has("deviceName") || !Trim(this.Settings["deviceName"]) {
            this.Settings["deviceName"] := SubStr(A_ComputerName " Launcher", 1, 80)
            changed["deviceName"] := this.Settings["deviceName"]
        }
        if changed.Count
            SettingsManager.UpdateMany(changed)
    }

    Configure(deviceName) {
        safeName := RegExReplace(Trim(deviceName), "\s+", " ")
        if StrLen(safeName) < 1 || StrLen(safeName) > 80 || RegExMatch(safeName, "[\x00-\x1F\x7F]")
            return {Ok: false, Message: "Enter a device name from 1 to 80 characters."}
        this.Settings["deviceName"] := safeName
        SettingsManager.UpdateMany(Map("deviceName", safeName))
        return {Ok: true, Message: ""}
    }

    StartPairing(deviceName := "") {
        if this.State = "connected" || this.RequestBusy
            return false
        if deviceName {
            configured := this.Configure(deviceName)
            if !configured.Ok {
                this.SetState("configuration-error", configured.Message)
                return false
            }
        }
        origin := LauncherEndpoint.Normalize(this.Origin)
        if !origin {
            this.SetState("configuration-error", "The built-in Olio Workstation address is invalid. Update the launcher.")
            return false
        }
        this.StopPolling()
        this.PairingSecret := CryptoRandom.Hex(32)
        this.RequestId := ""
        this.DisplayCode := ""
        this.ExpiresAt := ""
        this.PairingStartedAt := A_TickCount
        this.SetState("starting", "Creating a short-lived authorization request…")
        return this.Post("create", Map(
            "device_id", this.Settings["deviceId"],
            "device_name", this.Settings["deviceName"],
            "pairing_secret", this.PairingSecret
        ), (result) => this.OnCreated(result))
    }

    OnCreated(result) {
        if !this.ValidResponse(result) || this.ResponseState(result) != "waiting" {
            this.FailFromResponse(result, "Could not start authentication. Try again.")
            return
        }
        data := result.Data
        requestId := this.Value(data, "request_id")
        displayCode := this.Value(data, "display_code")
        approvalUrl := LauncherEndpoint.ApprovalUrl(this.Origin, requestId,
            displayCode)
        if !approvalUrl {
            this.ClearPairing()
            this.SetState("error", "The server returned an invalid authorization request.")
            return
        }
        this.RequestId := requestId
        this.DisplayCode := displayCode
        this.ExpiresAt := this.Value(data, "expires_at")
        this.SetState("waiting", "Browser approval is waiting. Confirm code " displayCode ".")
        try this.BrowserRunner.Call(approvalUrl)
        catch {
            this.StopPolling()
            this.SetState("error", "The browser could not be opened. Cancel and try again.")
            return
        }
        SetTimer(this.PollTimer, 3000)
    }

    Poll(*) {
        if this.State != "waiting" || this.RequestBusy
            return
        if A_TickCount - this.PairingStartedAt > 660000 {
            this.StopPolling()
            this.ClearPairing()
            this.SetState("expired", "The authorization request expired. Start again.")
            return
        }
        this.Post("poll", this.PairingBody(), (result) => this.OnPolled(result))
    }

    OnPolled(result) {
        if !this.ValidResponse(result) {
            this.StopPolling()
            this.SetState("offline", "Olio Workstation is unavailable. Retry authentication when online.")
            return
        }
        state := this.ResponseState(result)
        switch state {
            case "waiting": return
            case "approved":
                this.StopPolling()
                this.Exchange()
            case "denied":
                this.StopPolling(), this.ClearPairing()
                this.SetState("denied", "Authorization was denied. You can safely try again.")
            case "expired":
                this.StopPolling(), this.ClearPairing()
                this.SetState("expired", "The authorization request expired. Start again.")
            case "cancelled":
                this.StopPolling(), this.ClearPairing()
                this.SetState("cancelled", "Authentication was cancelled.")
            case "rate_limited":
                this.StopPolling(), this.ClearPairing()
                this.SetState("error", "Too many attempts. Wait a few minutes before retrying.")
            default:
                this.StopPolling(), this.ClearPairing()
                this.SetState("error", "The authorization request is no longer valid.")
        }
    }

    Exchange() {
        this.SetState("exchanging", "Finishing the one-time connection…")
        this.Post("exchange", this.PairingBody(), (result) => this.OnExchanged(result))
    }

    OnExchanged(result) {
        if !this.ValidResponse(result) || this.ResponseState(result) != "connected" {
            this.ClearPairing()
            this.FailFromResponse(result, "The one-time exchange failed safely. Start again.")
            return
        }
        credential := this.Value(result.Data, "credential")
        if !RegExMatch(credential, "i)^[0-9a-f]{64}$") || !this.CredentialStore.Write(credential) {
            this.Post("disconnect", Map("device_id", this.Settings["deviceId"],
                "credential", credential), (*) => 0)
            this.ClearPairing()
            this.SetState("error", "Windows could not protect the device credential; the connection was revoked.")
            return
        }
        this.Credential := credential
        safeName := this.Value(result.Data, "device_name")
        this.Settings["connectedDeviceName"] := safeName
        this.Settings["connectedAt"] := FormatTime(, "yyyy-MM-dd'T'HH:mm:ss")
        SettingsManager.UpdateMany(Map("connectedDeviceName", safeName,
            "connectedAt", this.Settings["connectedAt"]))
        this.ClearPairing()
        this.SetState("connected", "Connected. Quick Pastes are available from the launcher.")
    }

    RefreshStatus() {
        if !this.Credential || this.RequestBusy || this.State = "waiting"
            return false
        this.SetState("checking", "Checking the connected device…")
        return this.Post("device-status", Map("device_id", this.Settings["deviceId"],
            "credential", this.Credential), (result) => this.OnStatus(result))
    }

    OnStatus(result) {
        if !this.ValidResponse(result) {
            if IsObject(result) && result.Status = 401 {
                this.InvalidateCredential()
            } else
                this.SetState("offline", "Connected status could not be verified while offline.")
            return
        }
        if this.ResponseState(result) = "connected"
            this.SetState("connected", "Connected. Quick Pastes are available from the launcher.")
        else
            this.SetState("offline", "Connected status could not be verified. Try again.")
    }

    Disconnect() {
        if !this.Credential || this.RequestBusy
            return false
        this.SetState("disconnecting", "Revoking this device and removing its protected credential…")
        return this.Post("disconnect", Map("device_id", this.Settings["deviceId"],
            "credential", this.Credential), (result) => this.OnDisconnected(result))
    }

    OnDisconnected(result) {
        state := this.ResponseState(result)
        if (this.ValidResponse(result) && (state = "disconnected" || state = "invalid"))
            || (IsObject(result) && result.Status = 401) {
            this.CredentialStore.Delete()
            this.Credential := ""
            this.ClearConnectionMetadata()
            this.NotifyCredentialCleared("disconnected")
            this.SetState("disconnected", "Disconnected. The protected credential was removed.")
            return
        }
        this.SetState("offline", "Disconnect could not reach Olio. Nothing was removed; try again.")
    }

    CancelPairing() {
        if !this.RequestId || !this.PairingSecret
            return false
        this.StopPolling()
        body := this.PairingBody()
        this.ClearPairing()
        this.SetState("cancelled", "Authentication was cancelled.")
        if !this.RequestBusy
            this.Post("cancel", body, (*) => 0)
        return true
    }

    Retry() {
        if this.Credential
            return this.RefreshStatus()
        if this.RequestId && this.PairingSecret {
            if A_TickCount - this.PairingStartedAt > 660000 {
                this.ClearPairing()
                this.SetState("expired", "The authorization request expired. Start again.")
                return false
            }
            this.SetState("waiting", "Retrying the existing browser approval request…")
            if !this.Post("poll", this.PairingBody(), (result) => this.OnPolled(result))
                return false
            SetTimer(this.PollTimer, 3000)
            return true
        }
        return this.StartPairing()
    }

    Post(action, values, callback) {
        if this.RequestBusy
            return false
        body := Map("action", action)
        for key, value in values
            body[key] := value
        json := this.Serialize(body)
        url := LauncherEndpoint.ApiUrl(this.Origin)
        if !url {
            this.SetState("configuration-error", "The built-in Olio Workstation address is invalid. Update the launcher.")
            return false
        }
        this.RequestBusy := true
        wrapped := (result) => (this.RequestBusy := false, callback.Call(result))
        if !this.Transport.Post(url, json, wrapped) {
            this.RequestBusy := false
            this.SetState("offline", "Olio Workstation is unavailable. Try again.")
            return false
        }
        return true
    }

    Serialize(values) {
        result := "{"
        first := true
        for key, value in values {
            result .= (first ? "" : ",") FlatJson.Quote(key) ":" FlatJson.Quote(String(value))
            first := false
        }
        return result "}"
    }

    PairingBody() => Map("request_id", this.RequestId,
        "device_id", this.Settings["deviceId"], "pairing_secret", this.PairingSecret)

    Value(data, key) => data is Map && data.Has(key) ? String(data[key]) : ""
    ResponseState(result) => IsObject(result) && result.Data is Map
        ? this.Value(result.Data, "state") : "invalid"
    ValidResponse(result) => IsObject(result) && result.Ok && result.Data is Map

    FailFromResponse(result, fallback) {
        state := this.ResponseState(result)
        if state = "rate_limited"
            this.SetState("error", "Too many attempts. Wait a few minutes before retrying.")
        else if IsObject(result) && result.Status = 400
            this.SetState("error", "Olio account connection is not ready on this Workstation deployment.")
        else if !IsObject(result) || !result.Ok
            this.SetState("offline", "Olio Workstation is unavailable. Try again.")
        else
            this.SetState("error", fallback)
    }

    StopPolling() => SetTimer(this.PollTimer, 0)

    ClearPairing() {
        this.PairingSecret := ""
        this.RequestId := ""
        this.DisplayCode := ""
        this.ExpiresAt := ""
    }

    ClearConnectionMetadata() {
        this.Settings["connectedDeviceName"] := ""
        this.Settings["connectedAt"] := ""
        SettingsManager.UpdateMany(Map("connectedDeviceName", "", "connectedAt", ""))
    }

    InvalidateCredential(detail := "This launcher was revoked. Connect again to recover.") {
        this.CredentialStore.Delete()
        this.Credential := ""
        this.ClearConnectionMetadata()
        this.NotifyCredentialCleared("revoked")
        this.SetState("revoked", detail)
    }

    NotifyCredentialCleared(reason) {
        if IsObject(this.CredentialClearedCallback)
            this.CredentialClearedCallback.Call(reason)
    }

    SetState(state, detail) {
        this.State := state
        this.Detail := detail
        if IsObject(this.ChangedCallback)
            this.ChangedCallback.Call(state, detail)
    }

    Shutdown() {
        this.StopPolling()
        this.Transport.Cancel()
        this.RequestBusy := false
        this.ClearPairing()
        this.Credential := ""
    }
}
