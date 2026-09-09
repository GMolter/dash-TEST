########
Title: Public Pages — URLs, Secrets, and Pastes
Slug: public-pages
Summary: Understand how public-facing URL redirects, one-time secret views, and paste views work — no login required.
Sort Order: 20
########

## 🔎 Table of Contents

1. [🧩 What are Public Pages?](olio://help-anchor/what-are-public-pages)
2. [🔀 URL Redirect](olio://help-anchor/url-redirect)
3. [🔒 Secret View Page](olio://help-anchor/secret-view-page)
4. [📄 Paste View Page](olio://help-anchor/paste-view-page)
5. [📋 Public Paste List](olio://help-anchor/public-paste-list)
6. [🔐 Privacy Reminder](olio://help-anchor/privacy-reminder)
7. [💡 Access and expired links](olio://help-anchor/access-and-expired-links)

---

# 🌐 Public Pages — URLs, Secrets, and Pastes

Several features in Olio Workstation generate **publicly accessible URLs** — links that anyone can open without logging in. This article explains how each type of public page works.

> ⚠️ **Warning:** Content shared via public pages is accessible to **anyone with the link** — no login required. Treat these links as if they were public.

---

## 🧩 What are Public Pages?

Olio Workstation has three types of public pages:

| Page Type | URL Pattern | Created By |
|:----------|:-----------:|:----------:|
| **URL Redirect** | `/short-code` | URL Shortener |
| **Secret View** | `/s/secret-code` | Secret Sharing |
| **Paste View** | `/p/paste-code` | Pastebin (public scope) |

Each is designed for a specific sharing scenario and has different behavior around access and self-destruction.

---

## 🔀 URL Redirect

**How it works:**

When someone visits a short URL (e.g., `yourapp.com/team-docs`):

1. The system looks up the short code in the database
2. If found: the visitor is **immediately redirected** to the destination URL
3. The **click counter** increments by one
4. If not found: a "Link Not Found" error page is shown

The redirect is seamless — there is no interstitial page. Visitors are forwarded instantly.

| Scenario | What Happens |
|:---------|:-------------|
| Valid code | Instant redirect to destination |
| Invalid / deleted code | "Not Found" error page |
| No code in URL | The app's main page loads (if authenticated) |

> 💡 **Tip:** Combine the URL Shortener with the QR Code Generator: shorten your URL first, then generate a QR code from the short URL for cleaner, scannable codes.

---

## 🔒 Secret View Page

**How it works:**

When a recipient opens a secret link (e.g., `yourapp.com/s/abc123`):

1. The page checks whether the secret exists, has expired, or was already viewed
2. An available secret is displayed immediately
3. The page marks the secret as viewed
4. Later visits show an unavailable-secret message

**Error states:**

| State | Message Shown |
|:------|:-------------|
| Not yet viewed | Content displays on opening |
| Already viewed | "This secret has already been viewed" |
| Expired | "This secret has expired" |
| Code doesn't exist | "Secret not found" |

> 💡 **Tip:** Instruct recipients to only open the link when they are in a private location — the reveal is one-time and cannot be repeated.

---

## 📄 Paste View Page

**How it works:**

When someone opens a paste link (e.g., `yourapp.com/p/xyz789`):

1. The paste content is displayed with **a language label** applied based on the paste's language setting
2. The **view counter** increments by one on each page load
3. A **copy button** lets the visitor copy the paste content to their clipboard
4. The paste's **title** and **language** are displayed at the top

**Paste states:**

| State | What Happens |
|:------|:------------|
| Active public paste | Content displays normally |
| Expired paste | "This paste has expired" error |
| Personal / org-scoped paste | Not accessible without login |
| Deleted paste | "Paste not found" error |

> 💡 **Tip:** Only **public-scoped** pastes are accessible without login. Personal and org-scoped pastes are protected and require authentication.

---

## 📋 Public Paste List

The public paste list is available at `/pastes` (or `/p`). It shows:

- All **public-scoped** pastes from all users across all organizations
- Sorted by **creation date** (newest first)
- Truncated content previews for each paste
- Expiry status indicators (active vs expired)
- View counts

Anyone can browse this list — no login required. Load more pastes by clicking the **Load More** button at the bottom.

> 💡 **Tip:** If you want to share a paste with a specific person but not list it publicly, use **org scope** instead. Org pastes aren't visible on the public list.

---

## 🔐 Privacy Reminder

> ⚠️ **Warning:** Public pages are truly public. There is no access control, no login gate, and no way to restrict who views public content once the link is shared. Before creating a public paste or short URL, ask yourself: "Would I be comfortable if this content appeared in a search engine index?" If not, use personal or org scope instead.

Best practices:

- Use **Secret Sharing** for sensitive one-time information — it self-destructs after viewing
- Use **org scope** for internal team pastes that shouldn't be broadly accessible
- Use **personal scope** for private drafts and notes
- Use **public scope** only for genuinely public-safe content like code examples or reference snippets

---

## 💡 Access and expired links

Share the URL produced by the tool so the recipient receives the correct route and code. Short links, secret links, and paste links have different access and expiry behavior; a successful QR scan does not establish that the destination is still active.

If a paste is unavailable, check its audience and expiry with its creator. A consumed secret requires a newly created secret link. Private Quick Pastes do not have a public view URL.
