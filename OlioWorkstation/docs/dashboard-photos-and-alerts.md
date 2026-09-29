# Dashboard photos and targeted alerts

Apply `supabase/migrations/20260929120000_dashboard_photos_and_alerts.sql` after the existing migrations, then deploy the application. This creates the private `dashboard-backgrounds` Storage bucket and the `dashboard_alerts` table. No additional environment variables or serverless functions are required.

Users can upload, replace, or remove a dashboard photo in Profile Settings. JPEG, PNG, and WebP files are limited to 5 MiB; the browser also verifies that the image decodes. Images belong to the authenticated account, use expiring signed URLs, and are displayed with a dark overlay for readability. The built-in theme remains available after removal.

Application administrators can use Admin → dashboard banner → Targeted alerts to select one or more users or organizations, compose a message, and optionally schedule it. Existing global banners remain independent. Selected organizations mean their current members. A selected collection of users is an ad hoc group, not a new saved group entity. Creating and disabling alerts use the existing reason, review, confirmation, and audit-log workflow. The targeted-alert resource also supports editing and deleting through the existing admin data editor.

Dashboard clients refresh alerts every 30 seconds and when returning to the tab. Database row-level security checks the authenticated recipient, current organization membership, account status, enabled flag, and schedule. Recipients cannot write alerts or read the recipient lists. Targeted messages are not included in the public settings endpoint or local browser storage.

After applying the migration in a test environment, verify with two user accounts and an application administrator:

1. Upload a photo as the first user, reload, and confirm it persists. Sign in as the second user and confirm the first photo is not visible or readable through Storage. Replace and remove the first user's photo.
2. Send an alert to the first user only. Confirm only that user receives it and that direct database queries by the second user return no row.
3. Send an organization alert and confirm current members receive it. Remove a member and confirm the alert disappears on refresh.
4. Schedule an alert, confirm it appears after the start and disappears after the end, then test disabling an active alert.
5. Confirm a normal user cannot create, update, or delete alerts and that the admin audit log records administrative changes.

These live Storage and database checks require an environment with the migration applied; mocked frontend tests do not replace them.
