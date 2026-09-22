-- Refresh organization workspace guides; preserve publication choices.
BEGIN;

UPDATE public.help_articles SET summary='Join your team with an invite code or create a new organization.', content='An organization is your team''s workspace for shared links and organization projects. Your personal projects, Quick Pastes, and ClassDash schedule belong to your account.

## Join your team

1. On **Find your people**, choose **Join an organization**.
2. Enter the team''s 4-digit **Organization code**.
3. Choose **Join organization**.

Ask a teammate for the current code. If it fails, check all four digits and ask the owner or admin whether the code changed.

## Create an organization

1. Choose **Create an organization**.
2. Enter an **Organization name**.
3. Choose **Create organization**.

You become its owner. Click the large **Join code** in the Organization header to copy it and invite your team.

## Work with your team

Open **Organization → Resources → Shared links** for team bookmarks. Use **Utilities → Projects → Org** for organization projects. Choose **Personal** when creating a project for yourself.

Owners and admins manage the organization name, invite code, and members. Members use its shared tools and resources. See [Organization Management](olio://help/organization-management).

## Change organizations

Your account can belong to one organization at a time. Members and admins can use **Profile → Leave Organization**, type the organization name, and choose **Leave**. Then join another organization from setup.

Leaving removes access to the old team''s resources. To rejoin, use its current invite code. Owners can delete the organization from **Organization → Admin**. See [Organization Management](olio://help/organization-management) for the steps and effects.', updated_at=now() WHERE slug='organizations';

UPDATE public.help_articles SET summary='Create bookmarks, organize personal folders, and manage team links.', content='## Add a personal bookmark

1. Open **Utilities → Quick Links**.
2. Choose **Link**.
3. Enter a title and URL. Set an emoji or image URL for the icon if you want.
4. Choose a folder, or leave it at **No folder (root)**.
5. Choose **Create link**.

Open your personal bookmarks from Home. Use **Customize dashboard → Elements** if their cards are hidden.

## Organize folders

Choose **Folder**, enter a name, pick an icon, and create the folder. Drag a link onto a folder to move it inside, or edit the link and change its **Folder** selection.

Drag the handles to reorder personal links and folders. Expand a folder to reorder its links. To move a link out, edit it and select **No folder (root)**.

## Edit or delete

Use the pencil beside a link or folder to edit it, then save your changes. Use the trash button and confirm to delete a link.

When deleting a folder, choose **Move links to root** to keep its bookmarks, or **Delete folder and all links** to remove them. Deletion cannot be undone.

## Share bookmarks with your team

Open **Organization → Resources → Shared links** and choose **Link**. Links created here are available to everyone in the organization.

You can edit or delete shared links you created. Owners and admins can also manage other members'' shared links. Shared links appear as a list in the Organization page.', updated_at=now() WHERE slug='quick-links';

UPDATE public.help_articles SET summary='Share announcements and resources, follow team activity, and manage people and ownership.', content='Open **Organization** from the navigation menu. The header shows your team and its join code. Click the large **Join code** to copy it, then give it to a teammate to use during [organization setup](olio://help/organizations).

## Overview

**Overview** brings together recent announcements, activity, and people. Pinned announcements appear first. Use **Refresh organization** to load the latest changes.

## Announcements

Open **Announcements** to read and search team updates. Owners and admins can choose **New announcement**, enter a title and message, and choose **Publish announcement**. Check **Pin to the top of announcements** to keep an important post visible first.

Use a post''s edit, pin, or delete button to manage it. Deleting requires confirmation and cannot be undone.

## Activity

**Activity** shows new announcements, resource changes, membership and role changes, organization settings, shared link changes, and organization project changes. Choose a category to filter the feed, **Refresh activity** to get the latest updates, or **Load more activity** to read older entries.

The feed starts recording when the workspace features become available. Personal links and personal projects do not appear here.

## Resource library

Open **Resources → Library** to find your team''s guides, templates, references, and tools. Search by title, description, or note content, and use the category filter to narrow the list.

1. Choose **Add resource**.
2. Choose **Link** for an existing website or document, or **Note or guide** to write content in Olio.
3. Enter a title, choose a category, and optionally add a description.
4. Enter an http or https URL for a link, or write the note''s content.
5. Choose **Add resource**.

Everyone can add resources and edit or delete their own entries. Owners and admins can manage all entries. Links open in a new tab; **Read note** opens written content. Deleting a library entry does not delete the external document it links to.

Your team''s existing bookmarks are under **Resources → Shared links**. See [Quick Links](olio://help/quick-links).

## People and roles

Open **People** to search teammates by name, email, or role. Choose **Manage** beside a person to see the actions available to you.

- **Members** can read announcements and activity, use shared tools, and contribute resources.
- **Admins** can publish announcements, manage resources and settings, promote members to admin, and remove members.
- **Owners** can also manage admins and other owners, transfer ownership, and delete the organization.

An organization can have multiple owners with equal permissions. Application administrator access is separate from organization roles.

## Add or transfer ownership

Only owners can change ownership. The teammate must already belong to your organization.

To add an owner, open **People → Manage** beside a teammate, choose **Add as owner**, read the confirmation, and choose **Add owner**. You remain an owner. The new owner can manage other owners and delete the organization.

To hand off your own role, choose **Transfer my ownership** beside another teammate, then confirm with **Transfer ownership**. They become an owner and you become an admin. Other owners keep their roles.

Owners can use **Change to admin** or **Change to member** to change an owner''s role. The last owner cannot step down or be removed until another owner is added or ownership is transferred.

## Organization settings

Owners and admins can open **Admin**. Edit **Organization name** and choose **Save changes** to rename the team.

Under **Invite access**, choose **Regenerate code** and confirm to replace the join code. Copy the new code from the header. The old code stops working; current members keep their access.

## Leave or remove a teammate

Choose **Remove teammate** in a person''s management dialog and confirm to remove their access. Owners can remove other owners only when another owner remains. Admins can remove members.

To leave yourself, open **Profile → Leave Organization**, type the organization name, and confirm. Owners can leave when another owner remains; the last owner must add or transfer ownership first. See [Profile and Settings](olio://help/profile-and-settings).

## Delete the organization

Only owners can see and use **Delete Organization** in **Organization → Admin**.

1. Choose **Delete Organization**.
2. Read the warning and check the acknowledgment.
3. Type the organization name exactly.
4. Choose **Delete**.

This permanently deletes the organization and its data and removes all members. This cannot be undone.', updated_at=now() WHERE slug='organization-management';

UPDATE public.help_articles SET summary='Customize the background, manage Launcher devices, and leave an organization.', content='Open **Profile** from the navigation menu to view your account information and organization role.

## Customize the background

1. Under **App Background**, choose **Customize**.
2. Choose **Dynamic Waves** or **Contour Drift**.
3. Choose a color preset: Indigo, Ocean, Teal, or Sunset.
4. Choose **Select** to apply the preview, then close the customization window.

Your applied selection is remembered in this browser. To arrange cards, use [Home''s dashboard controls](olio://help/home-dashboard).

## Manage connected launchers

Under **Olio Launcher devices**, review each device''s name, connection date, and last-used time. Remove a device and confirm to revoke its access.

See [Connect Olio Launcher](olio://help/olio-launcher) for connection instructions.

## Leave an organization

Members and admins can choose **Leave Organization**, type the organization name exactly, and choose **Leave**. Owners can also leave when another owner remains. If you are the last owner, add another owner or transfer ownership from **Organization → People** first. See [Organization Management](olio://help/organization-management).

You lose access to its shared resources and return to organization setup. Use the team''s current code to rejoin, or join a different team.

## Sign out

Choose **Sign Out** on Profile to end your session.', updated_at=now() WHERE slug='profile-and-settings';

UPDATE public.help_articles SET content='Open **Utilities** from the navigation menu, then choose a tool.

| Tool | Use it to |
|:-----|:----------|
| [Quick Links](olio://help/quick-links) | Save and organize personal bookmarks |
| [Projects](olio://help/projects-center) | Organize work with boards, plans, files, and resources |
| Help Center | Search articles and read guides |
| [URL Shortener](olio://help/url-shortener) | Create a short link and see its click count |
| [Secret Sharing](olio://help/secret-sharing) | Send a message that can be opened once |
| [QR Generator](olio://help/qr-code-generator) | Make a downloadable QR code |
| [Quick Pastes](olio://help/quick-pastes) | Keep private text ready to reuse |
| [Pastebin](olio://help/pastebin) | Save text with a chosen audience and expiry |
| [Plugins & Dashboard](olio://help/plugins-and-classdash) | Install ClassDash and customize Home |

Choose **Back to Utilities** to return from a tool. Use the navigation menu to open Home at any time.

Team bookmarks are in **Organization → Resources → Shared links**. To change the shortcuts visible on Home, open **Customize dashboard → Elements**.', updated_at=now() WHERE slug='utilities-hub';

COMMIT;
