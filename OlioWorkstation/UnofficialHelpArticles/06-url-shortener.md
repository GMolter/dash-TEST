########
Title: URL Shortener
Slug: url-shortener
Summary: Shorten long URLs with optional custom codes, copy them instantly, and track how many times they've been clicked.
Sort Order: 6
########

## 🔎 Table of Contents

1. [What is the URL Shortener?](olio://help-anchor/what-is-the-url-shortener)
2. [Creating a Short URL](olio://help-anchor/creating-a-short-url)
3. [Copying Your Short URL](olio://help-anchor/copying-your-short-url)
4. [Click Tracking](olio://help-anchor/click-tracking)
5. [Deleting a Short URL](olio://help-anchor/deleting-a-short-url)
6. [Custom Code Rules](olio://help-anchor/custom-code-rules)
7. [How Redirects Work](olio://help-anchor/how-redirects-work)

---

# 🔗 URL Shortener

---

## 🧩 What is the URL Shortener?

The **URL Shortener** lets you turn any long URL into a compact, shareable link that points back to your Olio Workstation instance. All shortened URLs are scoped to your organization and include click tracking.

---

## ✂️ Creating a Short URL

1. Navigate to **Utilities → URL Shortener**
2. Paste or type the **destination URL** into the input field
3. Optionally enter a **Custom Code** (e.g., `q1-report` or `team-docs`)
4. Click **Shorten**
5. Your new short URL will appear in the list below

If you leave the **Custom Code** field empty, a random 6-character alphanumeric code is generated automatically.

> 💡 **Tip:** Custom codes make your short URLs more memorable and easier to share verbally. For example, `yourapp.com/team-docs` is cleaner than `yourapp.com/xK93pL`.

---

## 📋 Copying Your Short URL

Click the **copy icon** next to any short URL in the list to copy the full link to your clipboard. The link is in the format:

```text
https://your-domain.com/short-code
```

The copied URL is ready to paste into emails, messages, or documents.

---

## 📊 Click Tracking

Every short URL displays a **click count** that increments each time someone follows the link. This lets you gauge how often a resource is being accessed.

| Column | Description |
|:-------|:------------|
| Short Code | The unique identifier for the link |
| Destination | The original long URL |
| Clicks | Total number of times the link has been followed |
| Created | When the short URL was created |

Click counts reset to zero only if the short URL is deleted and recreated.

---

## 🗑️ Deleting a Short URL

1. Click the **trash icon** next to the short URL you want to remove
2. Confirm deletion in the dialog
3. The short URL is immediately deactivated

> ⚠️ **Warning:** Once deleted, the short code is no longer active. Anyone who clicks the old link will see a "not found" page. The code itself becomes available for reuse.

---

## ⚠️ Custom Code Rules

Custom codes must follow these rules:

- **Alphanumeric only** — letters and numbers, no spaces or special characters
- **Unique within your organization** — no two short URLs can share the same code
- **Case-sensitive** — `TeamDocs` and `teamdocs` are treated as different codes

If you try to use a code that's already taken, an error message will appear. Choose a different code and try again.

---

## 🌐 How Redirects Work

Short URLs are **publicly accessible** — no login is required to follow them. When someone visits a short URL:

1. The system looks up the short code
2. If found, the visitor is immediately redirected to the destination URL
3. The click counter increments by one
4. If the code is not found, a "not found" error page is shown

> 💡 **Tip:** Because short URLs are public, avoid creating short codes that point to sensitive internal resources without additional authentication on the destination.

See [Public Pages](olio://help/public-pages) for more detail on how the redirect page works.
