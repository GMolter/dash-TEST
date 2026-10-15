# Contact support

## Deployment

1. Apply `supabase/migrations/20261014120000_support_tickets.sql` after the existing email migrations, including `20261013150000_owner_notification_copy.sql` and `20261013170000_email_personalization.sql`. Then apply `20261015013000_support_notification_owner_copy.sql` to preserve the existing owner-approved administrative-notification copy for support. The fix does not resend old notifications.
2. Deploy the Workstation frontend and existing email worker together. No new Vercel function, secrets, bucket, or scheduler is required.
3. Verify a regular account can submit at `/support`, see its own history, and reply while a ticket is open. Another regular account must not see it, including through a copied link.
4. Verify both an owner and a delegated application admin can open `/admin?section=support`, reply, complete, and reopen tickets. Reading as one admin must not clear another admin's unread badge.
5. Admins enable **Support tickets and user replies** under **Email → My notifications**. It defaults off. User reply/status notifications are transactional and go to the current verified account email. The existing owner-only copy from `gavin@olio.one` to `gmolter8@gmail.com` also applies to subscribed administrative support notifications; both addresses are checked before delivery, and revocation or unsubscribe disables the copy.
6. With the existing email scheduler and delivery enabled, verify notification links and delivery history using test accounts. Respect the existing recipient allowlist during staging. Then verify the normal production delivery configuration from `email-integration-deployment.md`.

Ticket data and notification outbox entries commit together. SMTP failures do not roll back tickets. Existing queue retry/paused/uncertain-delivery rules apply; inspect Admin → Email for failures. Support emails include a ticket reference and activity summary, never the conversation body. Email replies are not ingested.

## Behavior

The authenticated database functions derive ownership and author identity from the session. All application admins share the inbox without additional grants; organization-admin status alone does not grant access. Banned accounts and revoked admins are checked in the database. All direct browser writes to the support tables are denied.

`support_mutate` accepts a request UUID, action (`created`, `reply`, `completed`, `reopened`), optional ticket/category, and plain-text body. The same request UUID can be retried without duplicating a conversation event or email. Conflicting reuse is rejected. Replies and status changes lock the ticket row. Only admins change status.

`support_list` returns 25 tickets per page, filtered by status and ordered by most recent activity. `support_unread` counts tickets with unseen activity from another person. `support_mark_read` monotonically advances only the caller's position, bounded by a rendered revision. Ticket details load events through that revision, so concurrent new activity stays unread. Visible views refresh every 30 seconds and on focus/navigation; no Realtime publication is required.

Support remains available to signed-in users without an organization. Completed tickets stay readable. There are no attachments, assignments, internal notes, or delete controls in this version. Deleting an auth account removes its owned tickets through foreign-key cascades.

## Checks

Run `npx vitest run test/supportDatabase.test.ts src/features/support api/_utils/emailNotification.test.ts api/_utils/emailWorker.test.ts src/features/admin/AdminEmailPage.test.tsx src/features/admin/AdminOperationsConsole.test.tsx test/vercelFunctionBudget.test.ts`, followed by the project's type checks, lint, and build.
