########
Title: Pastebin — Code and Text Snippets
Slug: pastebin
Summary: Save and share code snippets and text with syntax highlighting, expiration options, and visibility controls.
Sort Order: 9
########

## 🔎 Table of Contents

1. [What is Pastebin?](olio://help-anchor/what-is-pastebin)
2. [Creating a Paste](olio://help-anchor/creating-a-paste)
3. [Visibility and Scope](olio://help-anchor/visibility-and-scope)
4. [Language Highlighting](olio://help-anchor/language-highlighting)
5. [Expiry Options](olio://help-anchor/expiry-options)
6. [View Counter](olio://help-anchor/view-counter)
7. [Sharing a Paste](olio://help-anchor/sharing-a-paste)
8. [Deleting a Paste](olio://help-anchor/deleting-a-paste)
9. [Browsing Pastes](olio://help-anchor/browsing-pastes)

---

# 📄 Pastebin — Code and Text Snippets

**Pastebin** lets you save and share code snippets, configuration files, notes, or any block of text. Unlike a plain text file, pastes support **syntax highlighting**, **expiry timers**, and **visibility scopes** — giving you control over who sees your content and for how long.

> 💡 **Quick Pastes are different:** Use [Quick Pastes](olio://help/quick-pastes) for private, reusable personal text that does not need a URL, audience, expiry, or view count. Pastebin remains the sharing tool.

---

## 🧩 What is Pastebin?

Olio Workstation's Pastebin is a quick way to:

- Share a config file or code snippet with a teammate
- Save a useful snippet for future reference
- Publish a paste publicly so anyone with the link can view it
- Give a paste a short lifespan so it disappears after a set time

---

## ➕ Creating a Paste

1. Navigate to **Utilities → Pastebin**
2. Click **+ New Paste**
3. Enter a **Title** for the paste
4. Paste or type your **content** in the editor
5. Choose a **Language** for syntax highlighting (or select `Plain Text`)
6. Set an **Expiry** duration
7. Select the **Scope** (visibility)
8. Click **Save**

Your paste is created immediately and a shareable link is generated.

---

## 🌍 Visibility and Scope

Every paste has a scope that controls who can see it:

| Scope | Who Can See It | Notes |
|:------|:--------------:|:------|
| **Personal** | Only you | Private drafts, personal reference snippets |
| **Organization** | All org members | Shared internal resources |
| **Public** | Anyone with the link | No login required to view |

> ⚠️ **Warning:** Public pastes are accessible to anyone with the link — no login required. Never put passwords, API keys, or sensitive data in a public paste.

---

## 🎨 Language Highlighting

Choosing a language applies **syntax highlighting** to the paste when viewed. Supported languages include:

- JavaScript / TypeScript
- Python
- Bash / Shell
- JSON
- HTML / CSS
- SQL
- Markdown
- Java, C, C++, Go, Rust, and more
- Plain Text (no highlighting)

> 💡 **Tip:** If your language isn't listed, use `Plain Text` — the content will still be displayed in a monospace font and can be copied easily.

---

## ⏳ Expiry Options

| Option | Duration | Use Case |
|:-------|:--------:|:---------|
| Never | Permanent | Reference snippets you want to keep indefinitely |
| 1 Hour | 60 minutes | Temporary scratch pads |
| 24 Hours | 1 day | Day-of sharing |
| 7 Days | 1 week | Short-term team resources |
| 30 Days | 30 days | Monthly review materials |

Once a paste expires, the link will show an expiration error and the content is removed.

---

## 👁️ View Counter

Every paste has a **view counter** that increments each time the paste's public URL is loaded. This lets you see how many times a paste has been accessed.

The view counter appears in the paste list and on the individual paste page.

---

## 🔗 Sharing a Paste

1. Click the **copy icon** next to a paste in the list
2. The full paste URL is copied to your clipboard:

```text
https://your-domain.com/p/paste-code
```

3. Share this link with your recipient

Public pastes can be viewed without logging in. Personal and org-scoped pastes require the recipient to be logged in and a member of your organization.

---

## 🗑️ Deleting a Paste

1. Click the **trash icon** next to the paste you want to remove
2. Confirm deletion
3. The paste and its link are permanently removed

> ⚠️ **Warning:** Deletion is permanent. The paste code cannot be recovered or reused.

---

## 📋 Browsing Pastes

The Pastebin tool shows your **most recent 5 pastes** by default. To browse further:

- Filter by **Personal**, **Organization**, or **Public** using the scope tabs
- Visit the public **Paste List** page (`/pastes`) to see all public pastes from all users

See [Public Pages](olio://help/public-pages) for details on the public paste list.
