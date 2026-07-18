class LauncherQuickPaste {
    __New(id, title, content, category, sortOrder, isFavorite) {
        this.Id := id
        this.Title := title
        this.Content := content
        this.Category := category
        this.SortOrder := sortOrder
        this.IsFavorite := isFavorite
    }

    SafeTitle(maximum := 80) => this.SafeDisplay(this.Title, maximum, "(untitled)")
    SafeCategory(maximum := 40) => this.SafeDisplay(this.Category, maximum, "")
    SafeContent(maximum := 120) => this.SafeDisplay(this.Content, maximum, "(blank)")

    SafeDisplay(value, maximum, fallback) {
        value := RegExReplace(String(value), "[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "�")
        value := RegExReplace(value, "\R+", " ↵ ")
        value := Trim(value, " `t")
        if !value
            value := fallback
        return StrLen(value) > maximum ? SubStr(value, 1, maximum - 1) "…" : value
    }

    Release() {
        this.Id := ""
        this.Title := ""
        this.Content := ""
        this.Category := ""
        this.SortOrder := 0
        this.IsFavorite := false
    }
}

class QuickPastesClient {
    static MaxItems := 100
    static MaxTitleCharacters := 120
    static MaxContentCharacters := 20000
    static MaxCategoryCharacters := 60
    static MaxAggregateContentCharacters := 500000

    __New(connectionManager, changedCallback := 0, transport := 0) {
        this.ConnectionManager := connectionManager
        this.ChangedCallback := changedCallback
        this.Transport := IsObject(transport) ? transport : LauncherHttpTransport()
        this.Items := []
        this.State := IsObject(connectionManager) && connectionManager.Credential
            ? "connected" : "disconnected"
        this.Detail := this.State = "connected"
            ? "Ready to synchronize." : "Connect an Olio account in Settings."
        this.LastSuccessfulAt := ""
        this.RequestBusy := false
        this.Stopped := false
    }

    Refresh() {
        if this.Stopped || this.RequestBusy
            return false
        if !IsObject(this.ConnectionManager) || !this.ConnectionManager.Credential {
            this.Clear("disconnected", "Connect an Olio account in Settings.")
            return false
        }
        url := LauncherEndpoint.ApiUrl(this.ConnectionManager.Origin)
        if !url {
            this.SetState("error", "The built-in Olio Workstation address is invalid.")
            return false
        }
        body := this.ConnectionManager.Serialize(Map(
            "action", "quick-pastes",
            "device_id", this.ConnectionManager.Settings["deviceId"],
            "credential", this.ConnectionManager.Credential
        ))
        this.RequestBusy := true
        this.SetState("syncing", this.Items.Length
            ? "Synchronizing; the current in-memory list remains visible."
            : "Synchronizing your private Quick Pastes…")
        if !this.Transport.Post(url, body, (result) => this.OnResponse(result)) {
            this.RequestBusy := false
            this.SetRecoverable("offline", "Olio Workstation is unavailable. Try again.")
            return false
        }
        return true
    }

    OnResponse(result) {
        this.RequestBusy := false
        state := IsObject(result) && result.Data is Map && result.Data.Has("state")
            ? String(result.Data["state"]) : "invalid"
        if IsObject(result) && result.Ok && state = "connected" {
            parsed := this.ParseResponse(result.Data)
            if IsObject(parsed) {
                this.ReplaceItems(parsed)
                this.LastSuccessfulAt := A_Now
                this.SetState(this.Items.Length ? "ready" : "empty",
                    this.Items.Length ? this.Items.Length " Quick Paste"
                        . (this.Items.Length = 1 ? "" : "s") " synchronized."
                        : "No Quick Pastes are saved in Olio Workstation.")
                return
            }
            this.SetRecoverable("invalid-response",
                "Olio Workstation returned an invalid response. Try again.")
            return
        }
        if IsObject(result) && result.Status = 401 {
            this.Clear("revoked", "This launcher was revoked. Connect again in Settings.")
            if IsObject(this.ConnectionManager)
                this.ConnectionManager.InvalidateCredential()
            return
        }
        if IsObject(result) && result.Status = 400 {
            this.SetRecoverable("not-ready",
                "Quick Paste synchronization is not available on Olio Workstation yet.")
            return
        }
        switch state {
            case "scope_required":
                this.Clear("scope-required",
                    "Reconnect this launcher in Settings to approve read-only Quick Paste access.")
            case "rate_limited":
                this.SetRecoverable("rate-limited",
                    "Too many refreshes. Wait a few minutes, then try again.")
            case "too_large":
                this.SetRecoverable("too-large",
                    "The Quick Paste collection is too large for the launcher.")
            default:
                this.SetRecoverable("offline",
                    "Quick Pastes could not synchronize. Check your connection and try again.")
        }
    }

    ParseResponse(data) {
        this.LastValidationFailure := ""
        if !(data is Map) || !data.Has("items") || !(data["items"] is Array) {
            this.LastValidationFailure := "shape"
            return 0
        }
        if data["items"].Length > QuickPastesClient.MaxItems {
            this.LastValidationFailure := "item-limit"
            return 0
        }
        if !data.Has("synchronized_at") || Type(data["synchronized_at"]) != "String"
            || StrLen(data["synchronized_at"]) < 10
            || StrLen(data["synchronized_at"]) > 40 {
            this.LastValidationFailure := "timestamp"
            return 0
        }

        parsed := []
        ids := Map()
        aggregate := 0
        priorSortOrder := -1
        for candidate in data["items"] {
            if !(candidate is Map) {
                this.LastValidationFailure := "item-shape"
                return 0
            }
            for required in ["id", "title", "content", "category",
                "sort_order", "is_favorite"] {
                if !candidate.Has(required) {
                    this.LastValidationFailure := "missing-field"
                    return 0
                }
            }
            id := candidate["id"], title := candidate["title"]
            content := candidate["content"], category := candidate["category"]
            sortOrder := candidate["sort_order"], favorite := candidate["is_favorite"]
            if Type(id) != "String" || !RegExMatch(id,
                "i)^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
                || ids.Has(id) {
                this.LastValidationFailure := "id"
                return 0
            }
            if !this.ValidText(title, QuickPastesClient.MaxTitleCharacters, true) {
                this.LastValidationFailure := "title"
                return 0
            }
            if !this.ValidText(content, QuickPastesClient.MaxContentCharacters, true) {
                this.LastValidationFailure := "content"
                return 0
            }
            if Type(category) != "String"
                || !(category = "" || this.ValidText(category,
                    QuickPastesClient.MaxCategoryCharacters, true)) {
                this.LastValidationFailure := "category"
                return 0
            }
            if Type(sortOrder) != "Integer" || sortOrder < 0
                || sortOrder < priorSortOrder {
                this.LastValidationFailure := "order"
                return 0
            }
            if Type(favorite) != "Integer" || !(favorite = 0 || favorite = 1) {
                this.LastValidationFailure := "favorite"
                return 0
            }
            aggregate += StrLen(content)
            if aggregate > QuickPastesClient.MaxAggregateContentCharacters {
                this.LastValidationFailure := "aggregate-limit"
                return 0
            }
            ids[id] := true
            priorSortOrder := sortOrder
            parsed.Push(LauncherQuickPaste(id, title, content, category,
                sortOrder, favorite = 1))
        }
        return parsed
    }

    ValidText(value, maximum, requireNonblank := false) {
        return Type(value) = "String"
            && !RegExMatch(value, "\x00")
            && StrLen(value) <= maximum
            && (!requireNonblank || StrLen(Trim(value, " `t`r`n")) > 0)
    }

    ReplaceItems(items) {
        for item in this.Items
            item.Release()
        this.Items := items
    }

    Clear(state := "disconnected", detail := "Connect an Olio account in Settings.") {
        if this.RequestBusy {
            this.Transport.Cancel()
            this.RequestBusy := false
        }
        for item in this.Items
            item.Release()
        this.Items := []
        this.LastSuccessfulAt := ""
        this.SetState(state, detail)
    }

    SetRecoverable(state, detail) {
        if this.Items.Length
            detail .= " Showing the last in-memory synchronization."
        this.SetState(state, detail)
    }

    SetState(state, detail) {
        this.State := state
        this.Detail := detail
        if IsObject(this.ChangedCallback)
            this.ChangedCallback.Call(state, detail)
    }

    LastSyncDisplay() {
        return this.LastSuccessfulAt
            ? "Last synchronized " FormatTime(this.LastSuccessfulAt, "h:mm tt")
            : "Not synchronized yet"
    }

    Filter(search := "", category := "", favoritesOnly := false) {
        query := StrLower(Trim(search, " `t"))
        result := []
        for item in this.Items {
            if favoritesOnly && !item.IsFavorite
                continue
            if category && item.Category != category
                continue
            if query && !InStr(StrLower(item.Title), query)
                && !InStr(StrLower(item.Content), query)
                && !InStr(StrLower(item.Category), query)
                && !(item.IsFavorite && InStr("favorites", query))
                continue
            result.Push(item)
        }
        return result
    }

    Categories() {
        seen := Map(), result := []
        for item in this.Items {
            if item.Category && !seen.Has(item.Category) {
                seen[item.Category] := true
                inserted := false
                loop result.Length {
                    if StrCompare(item.Category, result[A_Index], false) < 0 {
                        result.InsertAt(A_Index, item.Category)
                        inserted := true
                        break
                    }
                }
                if !inserted
                    result.Push(item.Category)
            }
        }
        return result
    }

    Shutdown() {
        if this.Stopped
            return
        this.Stopped := true
        this.Transport.Cancel()
        this.RequestBusy := false
        this.Clear("stopped", "")
        this.ChangedCallback := 0
    }

    __Delete() {
        try this.Shutdown()
    }
}
