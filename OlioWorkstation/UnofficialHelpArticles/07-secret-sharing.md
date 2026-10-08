########
Title: Secret Sharing
Slug: secret-sharing
Summary: Share a one-time message, preview it safely, or revoke its link.
Sort Order: 7
########

## Create and share a secret

1. Open **Utilities → Secret Sharing**.
2. Enter your message.
3. Choose **Expires in**: 1 hour, 6 hours, 24 hours, 3 days, or 7 days.
4. Choose **Create Secret Link**.
5. Choose **Copy link** in the creation confirmation or beside the saved link, then send it to your recipient.

The management list is private to your account. Anyone who has the secret link can reveal its message before expiry; the recipient does not need an Olio account. Share the link only with its intended recipient.

## Reveal or preview

Opening the link shows a **Reveal secret** button. The message is consumed when a recipient chooses that button, not when the page first opens. After revealing it, the recipient should read or copy what they need before leaving; refreshing cannot reveal it again.

To check your own message, stay signed in to the account that created it and choose **Preview my secret**, then **Reveal secret**. Your owner preview does not use the recipient's one-time viewing. Testing while signed out or signed in as a different user does consume it.

## Read the status

The list shows **Not viewed** or **Viewed** and the expiry time. Copying is disabled for viewed or expired secrets. A consumed secret cannot be revealed again, including by its creator.

Expiry blocks access even if the row is still visible. Expired records are scheduled for automatic cleanup every minute, and the list refreshes periodically, so an expired entry can briefly remain before disappearing.

## Revoke a secret

Choose **Delete secret**, then **Confirm delete**, to permanently remove the message record and invalidate its link. Choose **Cancel** to keep it. If someone has already read or copied the message, deleting the link cannot retract their copy.

If a recipient sees **Secret Not Available**, it may be expired, already viewed, or deleted. Create a new secret if you still need to share the message. For text that should remain readable more than once, use [Pastebin](olio://help/pastebin).
