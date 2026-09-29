# Dashboard photos and targeted alerts

Apply `supabase/migrations/20260929120000_dashboard_photos_and_alerts.sql` and then `supabase/migrations/20260929130000_dashboard_alert_appearance.sql` after the existing migrations, then deploy the application. These create the private `dashboard-backgrounds` Storage bucket, `dashboard_alerts` table, and banner title/color fields. For environments with the first migration already applied, only the appearance migration is new. No additional environment variables or serverless functions are required.

Users can upload, replace, or remove a dashboard photo in Profile Settings → Customize → Your photo. JPEG, PNG, and WebP inputs are limited to 5 MiB. Before applying, users can drag the crop, adjust horizontal/vertical position and zoom, choose a crop shape, and resize the output. The saved JPEG uses the chosen framing, with a maximum height of 4096 pixels. A dark overlay preserves dashboard readability. The built-in theme remains available after removal.

The saved photo bytes are cached per account in IndexedDB and displayed before a network request. Fresh caches skip downloading for five minutes; older entries revalidate while the cached photo remains visible. Applying or removing a photo updates the cache and signals other tabs. A failed upload leaves the previous cache intact; transient network failures retain cached images. Browser storage restrictions or quota exhaustion can disable caching without preventing account uploads. The cache is local to this browser/device and is only rendered for the matching signed-in account.

Application administrators can use Admin → dashboard banner → Targeted alerts to select one or more users or organizations, choose an optional title and any banner color, compose a message, and optionally schedule it. A shared preview matches the recipient banner and automatically chooses black or white text for contrast. Existing banners have an Edit title & color action. Existing global banners remain independent. Selected organizations mean their current members. A selected collection of users is an ad hoc group, not a new saved group entity. Creating, editing, and disabling alerts use the existing reason, review, confirmation, and audit-log workflow. The targeted-alert resource also supports editing and deleting through the existing admin data editor.

Dashboard clients refresh alerts every 30 seconds and when returning to the tab. Database row-level security checks the authenticated recipient, current organization membership, account status, enabled flag, and schedule. Recipients cannot write alerts or read the recipient lists. Targeted messages are not included in the public settings endpoint or local browser storage.

The admin account profile also has a **Send banner** action. It opens the same title, color, message, and schedule composer with that account as the fixed recipient; it does not show other recipients or global banner history. Switching accounts closes the previous account's composer.

In the admin operation dialog, Enter reviews the reason and submits the final confirmation after the required phrase matches. Shift+Enter inserts a line break in the reason. Pending requests disable inputs and duplicate submissions; the existing confirmation and audit requirements still apply.

After applying the migration in a test environment, verify with two user accounts and an application administrator:

1. Upload a photo as the first user, reload, and confirm it persists. Sign in as the second user and confirm the first photo is not visible or readable through Storage. Replace and remove the first user's photo.
2. Send an alert to the first user only. Confirm only that user receives it and that direct database queries by the second user return no row.
3. Send an organization alert and confirm current members receive it. Remove a member and confirm the alert disappears on refresh.
4. Schedule an alert, confirm it appears after the start and disappears after the end, then test disabling an active alert.
5. Confirm a normal user cannot create, update, or delete alerts and that the admin audit log records administrative changes.

These live Storage and database checks require an environment with the migration applied; mocked frontend tests do not replace them.
