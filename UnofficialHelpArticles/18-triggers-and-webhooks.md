########
Title: Triggers and Webhooks
Slug: triggers-and-webhooks
Summary: Set up webhook triggers to connect Olio Workstation to external services like Slack, CI pipelines, and automation tools.
Sort Order: 18
########

## 🔎 Table of Contents

1. [What are Triggers?](olio://help-anchor/what-are-triggers)
2. [Creating a Trigger](olio://help-anchor/creating-a-trigger)
3. [HTTP Methods](olio://help-anchor/http-methods)
4. [Testing a Trigger](olio://help-anchor/testing-a-trigger)
5. [Editing a Trigger](olio://help-anchor/editing-a-trigger)
6. [Deleting a Trigger](olio://help-anchor/deleting-a-trigger)
7. [Last Triggered Timestamp](olio://help-anchor/last-triggered-timestamp)
8. [Security Notes](olio://help-anchor/security-notes)

---

# ⚡ Triggers and Webhooks

**Triggers** let you connect Olio Workstation to external services by making HTTP requests on demand. Use them to post a message to Slack, kick off a CI/CD pipeline, call an automation endpoint, or trigger any service that accepts webhooks.

---

## 🧩 What are Triggers?

A Trigger is a saved HTTP request configuration — a name, a URL, and a method. When you fire a trigger, Olio Workstation sends the request to the configured URL immediately. All triggers are shared within your organization.

Common use cases:

- 📣 Post a message to a **Slack** or **Teams** channel
- 🔁 Start a **GitHub Actions** or **CircleCI** build
- 🤖 Trigger an **n8n**, **Zapier**, or **Make** automation
- 🔔 Hit a **notification endpoint** (PagerDuty, OpsGenie, etc.)

---

## ➕ Creating a Trigger

1. Navigate to **Utilities → Triggers** (found in the Utilities Hub)
2. Click **+ New Trigger**
3. Enter a **Name** — something descriptive like `Deploy to Staging` or `Notify Slack`
4. Enter the **Webhook URL** — the full endpoint URL including any query parameters
5. Choose the **HTTP Method** (POST or GET)
6. Optionally add a **Description** explaining what the trigger does and when to use it
7. Click **Save**

The trigger appears in the list and is immediately ready to use.

---

## 🔀 HTTP Methods

| Method | When to Use |
|:-------|:------------|
| **POST** | Most webhooks — sends a JSON request body to the endpoint |
| **GET** | Simple HTTP pings that don't require a request body |

When using POST, the trigger sends a JSON body with basic metadata:

```json
{
  "triggered_at": "2025-01-15T10:30:00Z",
  "trigger_name": "Deploy to Staging",
  "org_id": "your-org-id"
}
```

Check your webhook service's documentation to confirm which method it expects.

---

## ▶️ Testing a Trigger

To fire a trigger immediately:

1. Find the trigger in the list
2. Click the **Play button** (▶️) next to it
3. Olio Workstation sends the HTTP request right away
4. Check your external service to confirm receipt

> 💡 **Tip:** Use the Test button during setup to verify your webhook URL is correct before sharing the trigger with your team.

The `last_triggered_at` timestamp updates every time you fire a trigger, whether manually or otherwise.

---

## ✏️ Editing a Trigger

1. Click the **pencil (edit) icon** next to the trigger
2. Update any fields (name, URL, method, description)
3. Click **Save**

All changes apply immediately. Existing firing history (the timestamp) is preserved.

---

## 🗑️ Deleting a Trigger

1. Click the **trash icon** next to the trigger
2. Confirm deletion in the dialog
3. The trigger is permanently removed

> ⚠️ **Warning:** Deletion is permanent. Any automations or bookmarks that reference this trigger's configuration will need to be updated manually.

---

## 🕐 Last Triggered Timestamp

Every trigger displays a **Last Triggered** field showing when the trigger was last fired. This is useful for:

- Confirming a trigger was actually sent
- Debugging if a webhook delivery was missed
- Auditing when automations ran

The timestamp is in your local timezone and updates in real time after each fire.

---

## 🔐 Security Notes

> ⚠️ **Warning:** Webhook URLs often contain **API keys, tokens, or secrets** embedded directly in the URL. Because triggers are visible to all organization members, avoid using webhooks that grant broad permissions.

Best practices:

- Use webhook URLs with **narrow, single-purpose permissions** (e.g., a Slack webhook that only posts to one channel)
- Rotate webhook tokens regularly
- Do not share trigger lists or screenshots in public channels
- Prefer **POST** over **GET** for endpoints that perform actions — GET requests may be logged in server access logs without authentication
