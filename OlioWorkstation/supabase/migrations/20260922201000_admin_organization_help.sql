BEGIN;
UPDATE public.help_articles SET content='Open **Organization** from the navigation menu. The header shows your team and its join code. Click the large **Join code** to copy it, then give it to a teammate to use during [organization setup](olio://help/organizations).

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

This permanently deletes the organization and its data and removes all members. This cannot be undone.


## Application administrators

If you have access to the application admin panel, open **Admin → Organizations** and select an organization. Use **Settings** to edit its name, creation date, or four-digit join code, generate a code, or delete the organization. Changing the code immediately replaces the previous invitation code.

**People & owners** lets you add or remove members, change roles, add multiple owners, and transfer ownership. For a transfer, select the new owner, expand **Transfer ownership**, and select the owner to replace. The previous owner becomes an admin; other owners keep their roles. An organization must retain at least one owner. Remove someone from their current organization before adding them to another.

Use **Announcements**, **Library**, and **History** to add, edit, or delete entries, including their authors and dates. The remaining sections manage the organization’s links, folders, projects, pastes, secrets, short URLs, and triggers. Search and filters help find records, and supported lists allow bulk changes.

Changes require a reason and confirmation. Editing organization history changes the team’s activity feed; the separate admin audit log retains the administrative change.', updated_at=now() WHERE slug='organization-management';
COMMIT;
