########
Title: Application Administration
Slug: application-administration
Summary: Manage accounts, banners, operational data, help publishing, and administrative reviews.
Sort Order: 24
########

## Access the administration console

Open **/admin** and sign in with an account authorized for application administration. Organization owners and admins do not automatically have this access. Available sections and actions depend on your application permissions; application-owner review privileges are separate from organization ownership.

The console includes **Overview**, **People**, **Organizations**, **Banners**, **Workspace data**, **Integrations**, **Help Center**, and **Activity**. Application owners also have **Pending reviews**. Use **Refresh** to reload the current view.

## Manage an account

Open **People** and select an account. Review its profile, organization, and associated records before making changes. Available account controls include profile and access changes, temporary-password resets, bans or unbans, and deletion requests.

A temporary password must be at least 12 characters. Choose **Review password reset** and complete the operation review. The user must replace the temporary password before continuing into Olio. See [Getting Started](olio://help/getting-started).

For a ban, choose its duration and provide a reason; the reason is shown to the affected user. **Request account deletion** sends a request for application-owner review rather than immediately deleting the account. Admin-access requests also require owner review.

Account views also provide access to saved workspace records, background customization, and targeted dashboard messages. These are administrative actions on the selected user's account, so check the account identity first.

## Manage organizations and records

Use **Organizations** to open a team's settings, people, announcements, library, history, and associated data. Ownership and last-owner protections still apply. See [Organization Management](olio://help/organization-management) for the available organization controls.

Use **Workspace data** for projects and saved content, and **Integrations** for plugin and device records. Search and filter a list before selecting records. Some lists support bulk operations. Follow the available actions for the selected record; sensitive content may require a separate reveal operation and audit reason.

## Publish dashboard banners

Open **Banners** to manage the global **Everyone** message and targeted messages. For a global message, choose **Create global banner** or **Edit global banner**, write the message, and inspect **Live preview**.

Under **Visibility & schedule**, enable the banner and optionally set start and end times. Use the time zone displayed by the form. A blank start means immediately; a blank end means until disabled. A preview includes unsaved changes and does not mean the message is live. Save and complete any operation review shown.

For a targeted message, check its recipients, appearance, and schedule before saving. Dashboard messages are separate from organization announcements.

## Maintain Help Center articles

1. Open **Help Center → Help editor**.
2. Select an article or choose **New Article Draft**.
3. Set its title, slug, summary, sort order, and content. Keep an existing slug when possible so shared links continue to work.
4. Use the editor's formatting tools, **MD Tips**, and **Insert Link** for article and section links.
5. Leave **Published** unchecked to keep a draft, or check it to make the guide available publicly at **/help**.
6. Choose **Save Draft** or **Save Changes**, then complete the operation review.

The Published checkbox controls visibility even when the button says Save Draft. A good summary helps readers find the guide in search. Published help is readable by signed-out visitors; do not put private account or organization information into it.

To remove a guide from public view while retaining it, clear **Published** and save. Deleting permanently removes it and can break links from other articles. Review those links before deletion. The editor asks for the article name and then the administrative confirmation.

## Review operations and history

When an operation review appears, enter a reason of at least three characters and choose **Review operation**. Check the action, record count, changed fields, and related records that may be affected. Type the exact authorization text shown, then choose **Execute**. Choose **Cancel** if the preview is not what you intended.

Application owners use **Pending reviews** for requests requiring their decision. **Activity** contains the administrative audit history. Editing a team's organization history does not erase this separate audit trail.
