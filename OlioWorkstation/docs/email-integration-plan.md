# Olio Email Integration — Full Feature Plan

Status: implementation is present in the repository. Live deployment, SMTP verification, and authentication-hook activation remain outstanding. Follow [the deployment guide](email-integration-deployment.md). This document records the approved scope; it is not evidence of production activation.

## 1. Goal and agreed scope

The existing **Email Integration** idea at https://olio.one/admin?section=features requests: “Ability to email users from the app. Select admins can also get notified (via email and/or web app notifications) on specific events (i.e. new user signup).”

Implement a send-only email feature using **Vercel → Stackmail SMTP**. Retain Supabase for authentication, database storage, private attachments, and scheduling.

The release includes:

- An admin **Email** page with composing, drafts, reusable templates, attachments, scheduled sending, and outgoing history.
- Messages to registered users, selected user groups, and manually entered external addresses.
- Owner-granted permission to send email.
- Email notifications for new signups, new organizations, pending admin reviews, and failed email attempts.
- Admins managing their own notification preferences; owners managing all admins’ preferences.
- Authentication emails, welcome emails, and account notifications through the same delivery service.
- Both emailed recovery links and the existing temporary-password reset option.

There is no incoming mailbox, reply handling, in-app notification inbox, or browser push in this release. Messages clearly state that replies are not monitored.

## 2. Product behavior

### Email page

Add **Email** to admin navigation, with these views:

| View | Behavior |
| --- | --- |
| Compose | Select users or groups, enter external addresses, write a message, attach files, preview, and send or schedule. |
| Drafts | Save, edit, duplicate, and delete personal drafts. |
| Scheduled | Review scheduled messages; cancel or return to draft before dispatch begins. |
| Outgoing history | Show per-recipient status, timestamps, sanitized errors, and authorized retry actions. |
| Templates | Manage personal templates; owners manage shared templates. |
| My notifications | Configure the logged-in admin’s event subscriptions. |
| Administration | Owners manage sending grants, all admin preferences, delivery health, and global outgoing history. |

Admins without sending permission can still manage their own notification preferences.

### Composer and templates

- Provide bold, italic, lists, and links using a constrained rich-text editor. Use TipTap with a restricted extension set and server-side HTML sanitization.
- Generate both sanitized HTML and plain-text alternatives.
- Keep the sender fixed as **Olio <noreply@olio.one>**, without a configurable Reply-To.
- Offer registered-user search, organization-member selection, all-user selection, and external-address entry.
- Resolve groups into a recipient snapshot at confirmation time. Show the exact addresses and total before submission.
- Send a separate message to each recipient; never expose the recipient list through To/CC.
- Deduplicate addresses using the application’s normalized email comparison.
- Default to a maximum of **50 recipients per submission**, a **200-character subject**, and a **100 KB rendered body**.
- Templates contain a subject and formatted body. Version one has no executable expressions or personalization placeholders.
- Copy template content into drafts so later template edits cannot change scheduled messages.
- Require an explicit preview/confirmation for sending and scheduling, following the existing admin operation pattern.

### Attachments

- Allow PDF, TXT, CSV, PNG, JPEG, and non-macro DOCX/XLSX/PPTX files.
- Default limits: **5 files**, **5 MiB per file**, **10 MiB combined**.
- Upload directly to a private Supabase Storage bucket using short-lived, authorized upload URLs.
- Validate ownership, actual size, file signatures/container type, extension, and MIME type server-side before attaching.
- Use randomized object names and sanitized display filenames.
- Reject executable, HTML, SVG, macro-enabled, and generic archive files.
- Download attachment bytes inside the Vercel worker and pass buffers to Nodemailer. Never accept arbitrary filesystem paths or remote attachment URLs.
- Preview attachments through authorized downloads; do not render active document content inside the admin page.

### Scheduling and outgoing history

- Capture a date, time, and explicit IANA timezone; default to the browser timezone.
- Store the resulting UTC instant and selected timezone. Resolve ambiguous daylight-saving times explicitly and reject nonexistent local times.
- Scheduled content, recipients, and attachments are immutable snapshots. Editing requires cancellation and a new confirmation.
- Recheck the sender’s account and sending permission immediately before dispatch. Cancel remaining deliveries if access has been revoked or the account suspended.
- Statuses: **Draft, Scheduled, Queued, Sending, Accepted by mail server, Retry pending, Failed, Outcome unknown, Cancelled, Expired**.
- SMTP acceptance does not become “Delivered” or “Read.” Bounce processing and tracking pixels are outside this release.
- A partially completed send shows recipient-level results. Cancellation affects only recipients not yet claimed by a worker.

### Permissions and subscriptions

Owners inherently have email administration rights. Other admins require an explicit sending grant.

Use capabilities for sending, template management, personal history, global history, and preference administration. Integrate with the planned granular admin permission catalog; until that exists, use server-managed email-specific grants. Do not infer sending permission from `app_admin`.

Ordinary admins see their own drafts and outgoing history. Owners can inspect all outgoing records. Record owner preference changes and permission changes in the existing audit log.

Notification defaults are **off**, with separate switches for:

| Event | Trigger and eligibility |
| --- | --- |
| New signup | A newly committed authentication account; one event per account. |
| New organization | A newly committed organization; one event per organization. |
| Pending admin review | A new pending review request; recipients must be authorized to review it. |
| Email failure | A terminal failure or uncertain outcome; admins see their own message failures, owners may subscribe globally. |

Notifications go only to the admin’s current verified account email. Recheck subscription and eligibility at dispatch time. Owner-managed preferences remain editable by the affected admin; owner changes do not create locked subscriptions.

Failure-alert messages must not generate further failure-alert messages.

## 3. Architecture and interfaces

### Reusable SMTP service

Create one server-only helper responsible for transport configuration, message rendering, attachments, timeouts, and sanitized error classification.

```dotenv
SMTP_HOST=smtp.stackmail.com
SMTP_PORT=465
SMTP_EMAIL=noreply@olio.one
SMTP_PASSWORD=<server-side secret>
```

Use Nodemailer with implicit TLS (`secure: true`) and normal certificate verification. Disable filesystem and URL access within Nodemailer. These settings follow its [SMTP transport documentation](https://nodemailer.com/smtp).

Additional server-only configuration:

- `APP_ORIGIN=https://olio.one`
- `SEND_EMAIL_HOOK_SECRET`
- `EMAIL_DISPATCH_SECRET`
- `EMAIL_PAYLOAD_ENCRYPTION_KEY`
- `EMAIL_DELIVERY_ENABLED`
- `EMAIL_TEST_RECIPIENT_ALLOWLIST`
- Configurable sending limits.

Store production secrets in **Vercel Project → Settings → Environment Variables**. Never use `VITE_` prefixes for secrets. Keep SMTP credentials out of Supabase, client bundles, API responses, logs, and committed files.

Use a dedicated dispatcher credential in Supabase Vault; it authorizes worker invocation only and cannot authenticate to SMTP.

### API shape

Add one Node.js entrypoint, `api/email.ts`, with explicit action routing. This keeps the current 11 production API entrypoints within the repository’s tested budget of 12.

The route provides:

- Authenticated admin actions for drafts, templates, attachments, recipient previews, send/schedule/cancel, history, preferences, grants, and diagnostics.
- A signed Supabase Auth email-hook action.
- A scheduler-authenticated dispatch action.

Keep implementations in server helper modules. Each action has its own schema, method restrictions, body limit, and authorization path. Scheduler and hook credentials cannot invoke admin actions.

Admin mutations require bearer authentication and current authorization. Sending and scheduling require an idempotency key plus the reviewed draft revision. Changed content invalidates an earlier preview.

Return queue acceptance and job identifiers immediately; never claim successful delivery from submission alone.

### Durable storage

Add service-controlled tables for:

- Email grants and notification preferences.
- Drafts, templates, and attachment metadata.
- Immutable submitted messages and per-recipient delivery jobs.
- Delivery attempts, idempotency receipts, and rate-limit counters.
- Transactional application events awaiting notification expansion.

Protect tables with RLS and restrict privileged writes to server-controlled operations. Do not expose raw email tables through generic admin CRUD.

Use database transactions for submission, recipient expansion, and idempotency recording. Generate application events in the same transaction as the underlying change; triggers must only record events, never perform SMTP.

Keep authentication payloads in a separate encrypted queue. They must not depend on foreign keys or locks against an authentication account whose creation transaction may still be open.

### Worker and retries

Use existing Supabase `pg_cron`, plus `pg_net`, to call the authenticated Vercel dispatcher once per minute. Supabase supports this [HTTP scheduling pattern](https://supabase.com/docs/guides/cron/quickstart).

- Atomically claim bounded batches with row locks and expiring leases.
- Prioritize authentication messages over ordinary mail.
- Default to one active SMTP send at a time and five jobs per invocation, stopping before the function deadline.
- Use bounded SMTP connection and socket timeouts.
- Retry definite transient failures after **1, 5, 15, and 60 minutes**; stop after five total attempts.
- Fail permanent recipient rejections without retry.
- Pause dispatch on SMTP authentication/configuration failures and surface an owner-visible health issue.
- Treat timeout/disconnection after possible SMTP acceptance as **Outcome unknown**. Do not automatically resend it.
- Expired leases after a possibly started SMTP operation also require reconciliation rather than blind resending.
- Use stable message identifiers, while explicitly recognizing that SMTP cannot guarantee exactly-once delivery.
- Manual retry of uncertain messages requires confirmation explaining the duplicate risk.

Default throttles: **50 manual recipients per admin per hour** and **100 total messages per hour**, with authentication mail prioritized. These are initial application limits, not claims about Stackmail’s allowance. Confirm provider quotas before production activation and configure lower limits if required.

### Retention

- Remove encrypted authentication payloads immediately after acceptance, cancellation, or expiry.
- Expire authentication jobs no later than their configured token lifetime.
- Retain ordinary message bodies and sent attachments for 30 days, outgoing metadata for 90 days, and audit entries under the existing audit policy.
- Retain active drafts/templates until deleted; remove abandoned uploads after 24 hours.
- Cleanup must preserve attachments referenced by pending scheduled messages.

## 4. Authentication and automated messages

Keep Supabase as the authority for accounts, passwords, sessions, token generation, and token validation.

Configure its **Send Email Hook** to call Vercel instead of configuring Stackmail SMTP inside Supabase. The hook replaces built-in email delivery while preserving authentication behavior. [Supabase Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook)

The hook must:

- Verify the signature over the raw request body, timestamp, and event identifier before parsing trusted fields.
- Validate supported action types and destination mappings.
- Deduplicate repeated events.
- Encrypt and durably enqueue the required message before returning success.
- Return an error if enqueueing fails.
- Finish within the documented five-second HTTP-hook deadline; do not wait for SMTP. [Supabase Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks)

Authentication mail normally begins dispatch within approximately one minute. The UI describes the request as accepted, with a resend option after a cooldown.

Implement:

- Signup verification and verification resend.
- Self-service forgot-password and password completion screens.
- Admin **Send recovery email**, alongside the existing **Set temporary password** action.
- Existing email-change flows, including correct old/new address token mapping.
- Welcome email once after verified account activation.
- Password-change confirmation after a committed password change.

Preserve the existing forced-password-change completion endpoint and protection for accounts already using temporary passwords. Never email passwords.

Add dedicated confirmation/recovery routes. Require user interaction before consuming a token, so link scanners cannot consume it merely by opening the URL. Clear credentials from the address bar after processing and prevent analytics/referrer leakage.

Use configured, allowlisted application origins for links. Reject arbitrary redirects. Recovery and resend responses must avoid account enumeration and use durable cooldown/rate limiting alongside Supabase’s existing controls.

Do not introduce a new contact form, marketing campaign system, or magic-link login merely because the mail transport supports them. Provide typed internal template functions for future transactional events; only the listed triggers launch.

## 5. Validation, rollout, and acceptance

### Tests

- SMTP configuration, TLS, secret isolation, fixed sender, and error redaction.
- Permission enforcement for owners, granted admins, ordinary admins, revoked admins, and suspended accounts.
- Prevention of cross-admin draft/history/attachment access.
- Recipient expansion, deduplication, limits, HTML sanitization, and header-injection rejection.
- Attachment spoofing, expired upload URLs, unauthorized downloads, and immutable scheduled attachments.
- Preview revisions, duplicate submissions, concurrent dispatchers, lease expiry, retries, cancellation races, and uncertain SMTP results.
- Timezones and daylight-saving scheduling.
- All four subscription events, owner preference changes, revoked eligibility, and failure-alert recursion prevention.
- Hook signatures, replay handling, enqueue failure, and token-payload protection.
- Verification, recovery, email change, welcome deduplication, and both admin reset methods.
- Existing authentication, owner protections, and forced-password-change regression coverage.

Run focused Vitest suites, database/RLS tests, all TypeScript checks, lint, production build, and the existing Vercel function-budget test. Review generated emails in Gmail and Outlook, including mobile formatting and attachments.

### Deployment sequence

1. Apply additive tables, storage policies, and queue functions with delivery disabled.
2. Deploy the Vercel route, SMTP helper, admin UI, and authentication screens.
3. Configure environment secrets, Vault dispatcher credentials, and the disabled scheduler.
4. Test SMTP connectivity from an actual Vercel deployment using approved test recipients.
5. Verify sender identity, SPF, DKIM, DMARC, attachment delivery, and no-reply wording.
6. Enable the queue dispatcher and test scheduled delivery with the browser closed.
7. Validate the auth hook in an isolated environment, then enable it in production.
8. Grant sending permission explicitly and enable desired admin subscriptions.
9. Monitor queue age, failure rate, unknown outcomes, hook latency, and scheduler health.

The supplied SPF/DKIM/DMARC results are user-reported setup evidence. Preserve the existing records, including DMARC `p=none`; no DNS policy change is part of this feature.

User-supplied setup details:

- Domain: `olio.one`; DNS provider: Namecheap BasicDNS; website hosting: Vercel; email provider: Stackmail / WebStackMail.
- SPF: `v=spf1 include:spf.stackmail.com ~all`; reported PASS.
- DKIM selector: `s1`; DNS host: `s1._domainkey`; reported PASS.
- DMARC host: `_dmarc`; policy: `p=none`; reported PASS.
- Gmail testing reportedly passed all three authentication checks and reached the inbox for a recipient who had not previously received mail from `olio.one`.
- Indiana University Wi-Fi blocked outbound SMTP on ports 465 and 587 during local testing; a Verizon hotspot connected successfully.

Vercel documents that outbound SMTP is allowed except on port 25, but production connectivity to Stackmail must still be tested. Local failures on Indiana University Wi-Fi should be distinguished from deployment failures. [Vercel SMTP guidance](https://vercel.com/kb/guide/serverless-functions-and-smtp)

### Rollback and completion criteria

Maintain separate controls for manual/notification delivery and authentication delivery. Pausing ordinary mail must not silently disable recovery emails.

For an authentication rollback, restore the prior Supabase email configuration deliberately and cancel pending auth jobs that could duplicate newly requested messages. Keep additive database structures for diagnosis.

The feature is complete when authorized admins can send, attach, template, and schedule messages; owners can manage grants and all preferences; notifications honor current eligibility; authentication flows use Vercel/Stackmail; and outgoing history accurately distinguishes acceptance, failure, and uncertainty.
