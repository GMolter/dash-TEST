# Email Integration deployment

The code is prepared locally; deployment, live database changes, secrets, and real email delivery have not been performed by this task. Deploy the frontend and API together. Keep the existing Supabase email delivery in place until the new dispatcher and auth hook have been tested.

## 1. Database prerequisites and the RLS prompt

Use Node.js **24.x** for Vercel builds and functions, as specified in `package.json`. Installation and build run `scripts/build-email-runtime.cjs`, which bundles the current sanitizer and parser into `api/_utils/emailSanitizer.generated.cjs`. This avoids `ERR_REQUIRE_ESM` on Vercel loaders that reject CommonJS loading ES modules even on Node 24. The generated file is Git-ignored and must be built before packaging functions. The build verifies it with Node's require-ESM support disabled. After deploying, confirm the deployment uses Node 24.x; changing settings does not update existing deployments.

**Choose “with RLS.”** A question about running with or without RLS is not a SQL error. Use the Supabase **SQL Editor** to run the complete SQL migration, rather than creating its tables individually. The migration already enables RLS on all email tables. Browser roles have no direct table privileges; the authenticated API checks permissions and uses the server-only service role. Do not add permissive browser policies or disable RLS to get past a prompt.

Apply any missing migrations in chronological order, especially:

1. `20261012010000_specific_admin_privileges.sql`
2. `20261012020000_approve_admin_permissions.sql`
3. `20261012030000_email_integration.sql`

The first two files belong to the existing admin-permissions feature. Do not rerun them if already applied. The email migration uses a transaction: an SQL error rolls back that attempt. If the editor reports an actual error, copy the complete error text and line number. A successfully applied migration must not be run a second time.

Before applying email, this read-only query should return non-null names:

```sql
select
  to_regclass('public.admin_permission_catalog') as permission_catalog,
  to_regclass('public.admin_permission_grants') as permission_grants,
  to_regclass('public.account_ban_state') as ban_state,
  to_regclass('public.admin_audit_log') as audit_log,
  to_regprocedure('public.admin_has_permission(uuid,text)') as permission_check;
```

After applying it, verify RLS and the private bucket:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r' and relname like 'email_%'
order by relname;

select id, public, file_size_limit
from storage.buckets where id = 'email-attachments';
```

Every listed table should have `relrowsecurity = true`; the bucket should have `public = false` and a 5,242,880-byte file limit. SQL Editor administrator access is expected; `anon` and `authenticated` cannot query these tables directly. If using Supabase CLI migration tracking, apply through `supabase db push` instead of separately applying the same file through SQL Editor.

## 2. Configure Vercel environment variables

Use the existing Olio Vercel project. Its **Root Directory must remain `OlioWorkstation`**. Set these variables in the environment being deployed. Production and preview/staging should use separate Supabase projects and secrets.

| Variable | Value |
| --- | --- |
| `SMTP_HOST` | `smtp.stackmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_EMAIL` | `noreply@olio.one` |
| `SMTP_PASSWORD` | The Stackmail password for that mailbox |
| `APP_ORIGIN` | `https://olio.one` (use the HTTPS staging origin in staging) |
| `ADMIN_OPERATION_SECRET` | Retain the existing random admin-operation secret |
| `EMAIL_DISPATCH_SECRET` | A new random secret used only by the scheduler |
| `EMAIL_PAYLOAD_ENCRYPTION_KEY` | 32 random bytes encoded as base64 |
| `SEND_EMAIL_HOOK_SECRET` | The signing secret generated for the Supabase Send Email HTTP hook, including its `v1,whsec_` prefix |
| `EMAIL_DELIVERY_ENABLED` | Initially `false` |
| `EMAIL_AUTH_DELIVERY_ENABLED` | Initially `false`; separate from ordinary email |
| `EMAIL_TEST_RECIPIENT_ALLOWLIST` | Initially one approved test address, or comma-separated approved addresses |
| `EMAIL_AUTH_TTL_SECONDS` | `600`, or a shorter value; never longer than Supabase's configured Email OTP Expiration |
| `EMAIL_HOURLY_LIMIT` | `100`, or a lower verified provider allowance |

Existing Supabase service configuration and public client configuration remain required. Keep `SUPABASE_SERVICE_ROLE_KEY`, SMTP credentials, encryption keys, and hook/dispatcher secrets server-only. Never prefix them with `VITE_`.

Generate each secret independently on your own machine and paste it directly into the appropriate secret setting:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Do not commit these values or paste them into the migration. Do not rotate the encryption key while encrypted authentication jobs are pending; those jobs would become unreadable.

`ADMIN_PERMISSION_ASSIGNMENTS_ENABLED=true` is needed to use the existing owner permissions editor, after the admin-permissions rollout has been completed.

## 3. Deploy the application

From `OlioWorkstation`:

```powershell
npm ci
npm run typecheck:api
npm test
npm run build
```

Commit and push the changes through your normal Vercel deployment process, or deploy the project with the Vercel CLI if that is your established workflow. Redeploy after changing server environment variables. The repository retains its 12-function budget: `/api/email` is new, and the old logout URL is preserved by a rewrite to the existing login entrypoint.

Sign in as an application owner, open **Admin → Email**, and verify the disabled-delivery banner, draft saving, templates, and notification preferences. No SMTP delivery should occur yet.

## 4. Configure the Supabase scheduler, initially disabled

Enable **pg_cron** and **pg_net** using Supabase's extension management. Add these two secrets in **Supabase Vault**:

| Vault secret name | Value |
| --- | --- |
| `email_dispatch_url` | `https://olio.one/api/email?action=dispatch` |
| `email_dispatch_secret` | Exactly the Vercel `EMAIL_DISPATCH_SECRET` value |

Use the staging URL and matching staging dispatcher secret when testing. Vault receives no SMTP password.

Run the complete `supabase/email-scheduler.sql` script in SQL Editor. It creates the `olio-email-dispatch` job and immediately disables it. Check:

```sql
select jobid, jobname, schedule, active
from cron.job where jobname = 'olio-email-dispatch';
```

After the deployed endpoint and secrets are ready, activate it:

```sql
select cron.alter_job(
  (select jobid from cron.job where jobname = 'olio-email-dispatch'),
  active := true
);
```

It invokes the worker every minute. Application delivery flags still control whether ordinary or authentication messages are sent. Queue maintenance runs even when delivery is disabled.

## 5. Verify ordinary mail with an approved recipient

1. Keep the test recipient allowlist populated. Set `EMAIL_DELIVERY_ENABLED=true` and redeploy. Keep the auth hook disabled in Supabase and `EMAIL_AUTH_DELIVERY_ENABLED=false`.
2. As an owner, compose a small message to the allowlisted address. Preview the exact recipient and content, then confirm sending.
3. Wait for the dispatcher. Outgoing history should progress to **Accepted by mail server**. This is SMTP acceptance, not guaranteed inbox delivery.
4. Check the actual mailbox, including spam. Inspect SPF, DKIM, and DMARC results; check formatting and attachments in Gmail and Outlook, including mobile. Existing DNS settings should be preserved.
5. Test scheduling with the browser closed, cancellation before dispatch, and a separate message per recipient. Test with small permitted attachments first.
6. Check **Email → Administration**. If SMTP configuration pauses delivery, fix the configuration, redeploy, then select **Resume after correcting configuration**. Do not repeatedly resend uncertain outcomes: they may already have reached the recipient.

The allowlist cancels jobs addressed elsewhere. Do not enable the production auth hook while an allowlist would exclude real users. Test authentication in an isolated environment first.

## 6. Validate, then enable authentication delivery

In the isolated Supabase project, configure **Authentication → Hooks → Send Email** as an HTTP hook:

- URL: `https://<staging-host>/api/email?action=hook`
- Signing secret: generate it in Supabase, copy the full value into Vercel's `SEND_EMAIL_HOOK_SECRET`, and redeploy before enabling the hook.
- Enable email signups/provider as appropriate for the existing application.
- Confirm Supabase's Email OTP Expiration is at least `EMAIL_AUTH_TTL_SECONDS`.
- Allow the application HTTPS origin and its `/auth/confirm` and `/auth/reset-password` routes in Authentication URL Configuration. The custom hook only generates links on `APP_ORIGIN`; it ignores arbitrary request redirects.

Keep the scheduler active. Set `EMAIL_AUTH_DELIVERY_ENABLED=true` in the staging deployment, redeploy, then enable the staging hook. Test signup, resend, forgot-password, admin recovery email, temporary-password completion, and both old/new address confirmations for email changes. Check that merely opening a custom confirmation page does not consume its token. Check welcome and password-change notifications. Keep Supabase's separate built-in password-change notification switch off to avoid duplicating the application's transactional notification.

For production, after these checks pass:

1. Configure the production hook URL and signing secret, keeping the hook disabled while configuring.
2. Remove the production test recipient allowlist restriction; verify the queue contains no unintended pending messages.
3. Set `EMAIL_AUTH_DELIVERY_ENABLED=true`, redeploy, and confirm the scheduler is active and healthy.
4. Enable the production Send Email hook last. Verify one approved production authentication flow immediately.

**Do not configure Stackmail SMTP inside Supabase.** The delivery path is Supabase hook → encrypted queue → Vercel worker → Stackmail. Authentication remains Supabase's responsibility.

## 7. Grant access and opt into notifications

Owners inherently have email access. Existing non-owner admins receive no automatic sending grant.

Use **Account management → Admin permissions** to grant Email workspace access, sending, personal history, and template management as needed. Grant **Send recovery email** under People separately when appropriate. The existing owner review/audit flow applies.

Each admin can use **Email → My notifications** even without sending access. Notifications start off. Owners can select an admin under **Email → Administration** and change their preferences, but that admin may subsequently change them. Pending-review notifications are owner-only. Notifications are sent only to the current verified account email and recheck eligibility at dispatch.

## 8. Operations and rollback

- Check queue age and outcomes in outgoing history. SMTP acceptance is not delivery/read tracking.
- Check the scheduler's `cron.job_run_details` and `net._http_response` for invocation/HTTP failures. The UI's last invocation value reflects successful worker lock acquisition.
- Ordinary delivery can be paused with `EMAIL_DELIVERY_ENABLED=false` without switching off auth mail. Redeploy after environment changes.
- For a transport configuration failure, correct the cause and use the owner resume control. A database health pause intentionally stops both channels because they share the SMTP transport.
- For authentication rollback, disable the Supabase Send Email hook and deliberately restore the previous Supabase delivery settings. Cancel queued auth jobs to avoid later duplicates, and clear their encrypted payloads:

```sql
update public.email_jobs
set status='cancelled', encrypted_payload=null, completed_at=now()
where kind='auth' and status in ('queued','scheduled','retry');
```

Inspect any `sending` or `unknown` outcomes separately; do not blindly retry. Retain additive database structures and audit records for diagnosis. Keep the scheduler running for retention, with delivery flags disabled as needed. Full Supabase staging and real SMTP/mail-client validation remain required before calling the production rollout complete.

## Local validation evidence

- Full regression suite: 380 tests passed. Subsequent focused verification: 41 tests passed, including 19 PostgreSQL migration/queue tests. Run `npm run test:email` to repeat the focused checks.
- API TypeScript compilation, production Vite build, function-budget check, and lint for the new email implementation pass.
- Repository-wide application and test typechecks retain pre-existing diagnostics (89 application diagnostics and 121 test diagnostics, also reproduced against the unchanged source). The email implementation adds none. Repository-wide lint also reports existing problems, including ignored local backup directories; it is not a clean check.
- Database tests execute the migration and queue functions in embedded PostgreSQL with representative prerequisite tables and the existing permission function. They do not replace validation against a fully migrated Supabase staging project, actual Storage signed URLs, live Vercel SMTP connectivity, or real email clients.

References: [Supabase Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook), [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart), [Nodemailer SMTP transport](https://nodemailer.com/smtp).
