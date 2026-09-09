########
Title: Secret Sharing — One-Time Links
Slug: secret-sharing
Summary: Create expiring secret links and understand what happens when a recipient opens one.
Sort Order: 7
########

## 🔎 Table of Contents

1. [✍️ Create a link](olio://help-anchor/create-a-link)
2. [👁️ Opening a secret](olio://help-anchor/opening-a-secret)
3. [⏰ Expiry and reuse](olio://help-anchor/expiry-and-reuse)
4. [🔐 Handling the content](olio://help-anchor/handling-the-content)

---

# 🔒 Secret Sharing — One-Time Links

## ✍️ Create a link

1. Open **Utilities → Secret Sharing**.
2. Enter the message.
3. Choose an expiry: 1 hour, 6 hours, 24 hours, 3 days, or 7 days.
4. Create the secret and use its copy action to copy the link.

The link uses `/s/secret-code`. The list shows the code, viewed status, and expiry. Use its copy action again if you need the link later.

## 👁️ Opening a secret

The page checks the code, expiry, and viewed status. An available secret displays immediately on opening, and the page marks it viewed. There is no separate reveal confirmation. Later visits show an unavailable-secret message.

> 💡 **Tip:** Leave the first opening for your recipient. Opening the link yourself can consume that view.

## ⏰ Expiry and reuse

Expired links display an error. You cannot extend an existing secret through the creation form; create a new one when more time is needed. The page blocks viewed and expired secrets, but this is not a guarantee that the stored content has been physically deleted.

## 🔐 Handling the content

Anyone with an available link may open it, and recipients can copy what they see. The current creation form sends content to the service; it does not provide browser-side or end-to-end encryption. Choose content and a delivery channel accordingly.

See [Public Pages](olio://help/public-pages) for other shared-link formats.
