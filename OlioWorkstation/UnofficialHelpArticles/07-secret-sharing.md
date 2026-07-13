########
Title: Secret Sharing — One-Time Encrypted Secrets
Slug: secret-sharing
Summary: Send passwords and sensitive information securely using one-time links that self-destruct after being viewed.
Sort Order: 7
########

## 🔎 Table of Contents

1. [What is Secret Sharing?](olio://help-anchor/what-is-secret-sharing)
2. [Creating a Secret](olio://help-anchor/creating-a-secret)
3. [Sharing the Link](olio://help-anchor/sharing-the-link)
4. [What Happens When Viewed](olio://help-anchor/what-happens-when-viewed)
5. [Expiration](olio://help-anchor/expiration)
6. [Your Secrets List](olio://help-anchor/your-secrets-list)
7. [Security Notes](olio://help-anchor/security-notes)
8. [FAQ](olio://help-anchor/faq)

---

# 🔒 Secret Sharing — One-Time Encrypted Secrets

The **Secret Sharing** tool lets you send sensitive information — passwords, API keys, private notes — through a link that can only be read **once**. After the recipient views the secret, it is automatically destroyed and can never be accessed again.

---

## 🧩 What is Secret Sharing?

Traditional messaging apps keep message history forever. Secret Sharing solves this by creating a **one-time link**: the secret content is visible only on the first visit, after which it is permanently deleted. This ensures sensitive data doesn't linger in chat logs or inboxes.

---

## ✍️ Creating a Secret

1. Navigate to **Utilities → Secret Sharing**
2. Type or paste your secret content into the text area
3. Choose an **expiration time** from the dropdown (see table below)
4. Click **Create Secret**
5. A unique link is generated and displayed

> 💡 **Tip:** Write your secret content carefully before clicking **Create Secret** — you cannot edit it afterward.

### Expiration Options

| Label | Duration | Best For |
|:------|:--------:|:---------|
| 1 Hour | 60 minutes | Time-sensitive one-time passwords |
| 6 Hours | 6 hours | Credentials shared during a work session |
| 24 Hours | 1 day | Standard password handoffs |
| 3 Days | 72 hours | Recipients in different time zones |
| 7 Days | 1 week | Non-urgent but still sensitive info |

---

## 📤 Sharing the Link

Once created, click the **copy icon** to copy the full secret link to your clipboard. The link looks like:

```text
https://your-domain.com/s/secret-code
```

Send this link to your recipient through your preferred channel (email, Slack, etc.).

> ⚠️ **Warning:** Treat the secret link itself as sensitive. Anyone with the link can view the secret — only share it through a channel your recipient exclusively controls.

---

## 👁️ What Happens When Viewed

When the recipient opens the link:

1. A warning screen explains the secret will be destroyed after viewing
2. The recipient confirms they are ready to view
3. The secret content is displayed **one time only**
4. The secret is immediately marked as viewed and the content is permanently deleted

After this point, the link will show an error if visited again.

---

## ⏰ Expiration

Secrets that are **never opened** still expire after the selected duration. Once expired:

- The link shows an expiration error
- The content is permanently removed
- The secret entry in your list shows `Expired` status

You cannot extend the expiry of an existing secret. Create a new one if you need more time.

---

## 📋 Your Secrets List

The secrets list shows all secrets you have created, with the following information:

| Column | Description |
|:-------|:------------|
| Secret Code | Short identifier for the secret |
| Status | `Not Viewed`, `Viewed`, or `Expired` |
| Expires At | The date and time the secret will expire |
| Created | When the secret was created |

> ⚠️ **Warning:** You cannot re-view the content of your own secrets once they have been sent. The content is only shown to the first viewer.

---

## 🔐 Security Notes

> ⚠️ **Warning:** Secret Sharing is designed for short-term credential handoffs, not long-term storage. Do not use it as a password manager. For persistent sensitive data, use a dedicated secrets vault.

Best practices:

- Use the **shortest expiry** that fits your timeline
- Only share the link through **private, direct channels**
- Prefer **1 Hour** expiry for passwords and OTPs
- Create a **new secret** if the recipient doesn't view it in time

---

## ❓ FAQ

> **Q: Can I cancel a secret before it's viewed?**
> There is currently no way to delete or deactivate a secret once created. It will expire automatically based on the expiry time selected.

> **Q: What if I lose the link before sending it?**
> The link is not stored or retrievable from the secrets list — only the secret code is shown there. If you lose the link, create a new secret.

> **Q: Can the recipient save the content?**
> The interface does not prevent recipients from copying the text. Instruct recipients to handle the content responsibly.
