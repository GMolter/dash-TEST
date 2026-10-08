-- Current maintained guides after the October 6, 2026 application audit.
-- Keep IDs and existing publication choices; do not change unrelated custom guides.
-- Content and metadata for the listed maintained slugs are intentionally refreshed.
BEGIN;

DELETE FROM public.help_articles WHERE slug = 'triggers-and-webhooks';

INSERT INTO public.help_articles (slug,title,summary,content,is_published,sort_order) VALUES
('getting-started','Getting Started with Olio Workstation','Create your account, sign in, and open your workspace.','Olio Workstation brings your links, projects, reusable text, and schedule together on Home.

## Create an account

1. Open Olio and enter your email address and a password, then choose **Sign in**.
2. If you are new, choose **Yes, create an account** when prompted.
3. Add your name if you want, check your email address, and choose a password with at least 6 characters.
4. Choose **Create account**.
5. If **Check your inbox** appears, open the confirmation email and follow its link, then return to sign in. Check your spam folder if needed.
6. [Join or create an organization](olio://help/organizations) to finish setup.

## Sign in

Enter your email address and password, then choose **Sign in**. Use **Show password** to check for typing mistakes.

If you already have an account and see the invitation to create one, check your existing sign-in details and try again. For a forgotten password or an account access restriction, contact your app administrator.

## Complete a required password change

If Olio asks you to change your password, enter a new password with at least 12 characters and confirm it. Choose **Save password and continue**. If the password was saved but automatic sign-in fails, choose **Try continuing again**, or sign out and sign in with the new password. Contact your administrator if the account still requires a password change.

## Start using Home

Open the navigation menu to reach **Utilities**, **Organization**, **Profile**, or **Help Center**. See [Home Dashboard](olio://help/home-dashboard) to arrange your workspace.

If your profile cannot load, choose **Try again** on the account setup screen. If an account restriction screen appears, read its reason and any end time, then contact your app administrator if you need help.

You can read published guides at **/help** without signing in. See [Using the Help Center](olio://help/help-center) for search and navigation.',true,1),
('organizations','Organizations — Joining and Creating','Join your team with an invite code or create a new organization.','An organization is your team''s workspace for shared links and organization projects. Your personal projects, Quick Pastes, and ClassDash schedule belong to your account.

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

Your account can belong to one organization at a time. Use **Profile → Leave Organization**, type the organization name, and choose **Leave**. Owners can leave only when another owner remains; the last owner must add another owner or transfer ownership first. Then join another organization from setup.

Leaving removes access to the old team''s resources. To rejoin, use its current invite code. Owners can delete the organization from **Organization → Admin**. See [Organization Management](olio://help/organization-management) for the steps and effects.',true,2),
('home-dashboard','Home Dashboard','Arrange your cards, restore hidden items, and open your everyday tools.','Home contains your personal Quick Links, utility shortcuts, My Tasks, and installed dashboard plugins. Open a link or folder to use it. Use the navigation menu to move between Home, Utilities, Organization, Profile, and Help Center.

## Arrange your dashboard

1. Choose **Customize dashboard** near the bottom of Home.
2. On a wide screen, drag a card by its move handle. Use the lower-right resize control to change its size.
3. Use a card''s hide button to remove it from view.
4. Choose **Done** when finished.

Changes save as you work. On smaller screens, cards stack; widen the window to position them freely. You can also focus a move handle and use the arrow keys to move a card.

## Show or restore items

In edit mode, choose **Elements**. Toggle the groups you want shown, or choose **Restore** beside an individually hidden card. Install ClassDash before enabling its card.

Hiding a card keeps its saved content. Use **Manage links** to change your bookmarks, or see [Quick Links](olio://help/quick-links).

## Undo or reset a layout

Use **Undo layout change** or **Redo layout change** while arranging cards. **Reset dashboard** restores the default arrangement. These controls change the layout; manage saved links and tasks in their own tools.

If a save warning appears, check your connection before expecting the same layout on another device.

## Make Home your own

- Open [My Tasks](olio://help/my-tasks) for your personal checklist.
- Set up [ClassDash](olio://help/plugins-and-classdash) to see your next class.
- Choose **Profile → App Background → Customize** to change the built-in theme and colors or apply your own photo. See [Profile and Settings](olio://help/profile-and-settings).

## Dashboard messages

Application administrators can display a general banner or a message for your account. These may appear only during a scheduled window. Read the message and follow any relevant instructions; contact your administrator if you need clarification. Organization announcements are separate and appear under **Organization → Announcements**.',true,3),
('utilities-hub','Utilities Hub','Find the right tool for links, projects, text, QR codes, and plugins.','Open **Utilities** from the navigation menu, then choose a tool. Choose **Show Descriptions** for a short explanation of each tool, or **Hide Descriptions** for a simpler view.

| Tool | Use it to |
|:-----|:----------|
| [Quick Links](olio://help/quick-links) | Save and organize personal bookmarks |
| [Projects](olio://help/projects-center) | Organize work with boards, plans, files, and resources |
| [Help Center](olio://help/help-center) | Search articles and read guides |
| [URL Shortener](olio://help/url-shortener) | Create a short link and see its click count |
| [Secret Sharing](olio://help/secret-sharing) | Send a message that can be opened once |
| [QR Generator](olio://help/qr-code-generator) | Make a downloadable QR code |
| [Quick Pastes](olio://help/quick-pastes) | Keep private text ready to reuse |
| [Pastebin](olio://help/pastebin) | Save text with a chosen audience and expiry |
| [Plugins & Dashboard](olio://help/plugins-and-classdash) | Install ClassDash and customize Home |

Choose **Back to Utilities** to return from a tool. Use the navigation menu to open Home at any time.

Team bookmarks are in **Organization → Resources → Shared links**. To change the shortcuts visible on Home, open **Customize dashboard → Elements**.',true,4),
('quick-links','Quick Links','Create bookmarks, organize personal folders, and manage team links.','## Add a personal bookmark

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

You can edit or delete shared links you created. Owners and admins can also manage other members'' shared links. Shared links appear as a list in the Organization page.',true,5),
('url-shortener','URL Shortener','Create short links, choose their audience, and manage access.','## Create a short link

1. Open **Utilities → URL Shortener**.
2. Paste the full destination URL, including **https://**, into **Enter long URL**.
3. Enter a **Custom short code** for a recognizable ending, or leave it blank.
4. Under **Who can open this link?**, choose an audience. New links default to **Personal (only me)**.
5. Choose **Shorten URL**.

If the code is already taken, choose another code and try again.

## Choose who can open it

| Audience | Who can open the short link |
|:---------|:---------------------------|
| Personal (only me) | You while signed in |
| Shared (organization) | You and signed-in members of the organization selected when sharing |
| Public (anyone) | Anyone with the link, including signed-out visitors |

Shared is unavailable if you do not belong to an organization. Copying a link does not change its audience. For a restricted link, the recipient should sign in to an account with access, then reopen the link. The destination website may also require its own sign-in.

## Copy, test, or change access

Use **Copy** beside the short URL to copy its shareable address. **Open short URL** tests the redirect; **Open destination** visits the original address. Successful redirects increase the click count, including your own tests.

Use the audience selector on a link you own to change its visibility. Making a public link personal or shared restricts future use of that same short URL, including existing messages and printed [QR codes](olio://help/qr-code-generator). This does not change access permissions on the destination website.

## Delete a short link

Choose **Delete** on a link you own and confirm. Its short URL stops working wherever you shared it; the destination website is unaffected. You cannot delete another user''s short link from this tool.

If a shared link appears unavailable, check your sign-in and organization, then ask its creator to check the audience or provide a replacement.',true,6),
('secret-sharing','Secret Sharing','Share a one-time message, preview it safely, or revoke its link.','## Create and share a secret

1. Open **Utilities → Secret Sharing**.
2. Enter your message.
3. Choose **Expires in**: 1 hour, 6 hours, 24 hours, 3 days, or 7 days.
4. Choose **Create Secret Link**.
5. Choose **Copy link** in the creation confirmation or beside the saved link, then send it to your recipient.

The management list is private to your account. Anyone who has the secret link can reveal its message before expiry; the recipient does not need an Olio account. Share the link only with its intended recipient.

## Reveal or preview

Opening the link shows a **Reveal secret** button. The message is consumed when a recipient chooses that button, not when the page first opens. After revealing it, the recipient should read or copy what they need before leaving; refreshing cannot reveal it again.

To check your own message, stay signed in to the account that created it and choose **Preview my secret**, then **Reveal secret**. Your owner preview does not use the recipient''s one-time viewing. Testing while signed out or signed in as a different user does consume it.

## Read the status

The list shows **Not viewed** or **Viewed** and the expiry time. Copying is disabled for viewed or expired secrets. A consumed secret cannot be revealed again, including by its creator.

Expiry blocks access even if the row is still visible. Expired records are scheduled for automatic cleanup every minute, and the list refreshes periodically, so an expired entry can briefly remain before disappearing.

## Revoke a secret

Choose **Delete secret**, then **Confirm delete**, to permanently remove the message record and invalidate its link. Choose **Cancel** to keep it. If someone has already read or copied the message, deleting the link cannot retract their copy.

If a recipient sees **Secret Not Available**, it may be expired, already viewed, or deleted. Create a new secret if you still need to share the message. For text that should remain readable more than once, use [Pastebin](olio://help/pastebin).',true,7),
('qr-code-generator','QR Code Generator','Generate a QR code from text or a URL and download it as an image.','## Generate a code

1. Open **Utilities → QR Generator**.
2. Enter the text or full URL you want the code to contain.
3. Choose **Generate QR Code**.
4. Scan the preview with your phone to check the result.
5. Choose **Download QR Code** to save **qrcode.png**.

The preview appears beside the entry form on wider screens and below it on smaller screens. Changing the text requires choosing **Generate QR Code** again before downloading; the existing preview still contains the previous value.

The text or URL is sent to an external QR-code service to create the image. Use content you are comfortable sending to that service.

## Share the image

Add the downloaded image to a document, poster, or message. Keep the code clear and leave its white border visible. Test it at its final display or print size.

A QR code does not grant access to its destination. Personal and organization links still require the right signed-in account. A code containing a link depends on that link staying available. You can create a [short URL](olio://help/url-shortener) first, then use it to generate the code.

If generation or downloading fails, check your internet connection and try again.',true,8),
('pastebin','Pastebin','Save text, choose who can access it, and share a paste link.','## Create a paste

1. Open **Utilities → Pastebin** and choose **New Paste**.
2. Choose one or more audiences: **Personal**, **Org**, or **Public**. Org is selected initially, so deselect it if you want a personal-only paste.
3. Add an optional title and enter the content.
4. Choose an expiry: **Never expires**, 1 hour, 1 day, 1 week, or 1 month. New pastes are saved with a Markdown language label; this form does not have a language selector.
5. Choose **Create Paste**.

## Choose the audience

| Audience | Who can access it |
|:---------|:------------------|
| Personal | You while signed in |
| Org | Members of your organization while signed in |
| Public | Anyone, including visitors who are signed out |

Audiences can be combined. Selecting Public makes the paste public even if Personal or Org is also selected. Public pastes can appear in the public paste list.

## Find and share a paste

Use the audience tabs to view the five most recent matching personal pastes, organization pastes, or public pastes you created. **View All** opens the public paste list at **/p**; it is not a full private or organization archive. Use the copy button beside a paste to copy its link. Opening a paste displays its text and a **Copy** button for the content.

A copied link keeps the paste''s audience restrictions. An expired paste can no longer be read from its view page.

## Delete a paste

The trash button attempts to delete the selected paste immediately, subject to your access permissions. Check the item before clicking; its link will stop working.

For private text you want to edit and reuse regularly, see [Quick Pastes](olio://help/quick-pastes).',true,9),
('quick-pastes','Quick Pastes','Create, organize, and reuse private text.','Quick Pastes is your private collection of text to reuse, such as replies, notes, and templates. It has no organization or public sharing audience; use Pastebin when you want a shareable link.

## Create or edit a Quick Paste

1. Open **Utilities → Quick Pastes** or its shortcut on Home.
2. Choose **New Quick Paste**.
3. Enter a title and content. Add a category if helpful.
4. Choose **Create Quick Paste**.

Use the pencil on an existing item to edit it and save. Titles allow up to 120 characters, content up to 20,000, and categories up to 60.

## Find and organize text

Search by title, content, or category, or choose a category filter. Open an item''s editor to read its full content and select text to copy.

Use the star to mark a favorite. Use **Duplicate** to create another copy you can edit. Move items with the up and down controls; clear search and category filters before reordering.

## Use it in Launcher

[Connect Olio Launcher](olio://help/olio-launcher) to browse, search, copy, and paste this text from your desktop. Create and edit the saved text here in Workstation.

## Delete or retry

Use the trash action, review the item, and confirm to permanently delete it.

If loading fails, check your connection and choose **Try again**. If saving fails, keep the form open and retry after resolving the error.

To share text by link with an audience and expiry, use [Pastebin](olio://help/pastebin).',true,10),
('projects-center','Projects Center','Create personal or team projects and find your current work.','Open **Utilities → Projects** to reach the Projects Center.

## Create a project

1. Choose **New Project**.
2. Choose whether it belongs to **Org** or **Personal**.
3. Choose **Blank Project**, **Personal Project**, or **School Project** as the template, then enter a project name. Add a description if helpful.
4. Choose **Create Project**.
5. Open its card to start working.

Personal projects are for your account. Org projects are shared with your organization. A template choice does not replace the audience selection; check both before creating.

## Find a project

Switch between **Org** and **Personal**, then search by name, description, or tag. Use **All**, **Active**, **Completed**, or **Archived** to filter the list. Active includes projects in planning or review. Sort by recent updates, name, or status.

Use the search control at the top or **Ctrl/Cmd+K** when you are not typing to find project-opening and filtering actions.

## Work inside a project

Each project has Overview, Boards, Planner, Files, and Resources. See [Project Overview](olio://help/project-overview) for navigation and settings.

If a project seems missing, check its audience tab and clear your filters first. An archived project remains available under **Archived**; it has not been deleted. Leaving an organization removes access to its projects.',true,11),
('project-overview','Project Overview and Settings','Navigate a project, capture notes and links, and update its settings.','## Choose a workspace

Open a project from **Utilities → Projects**.

| Workspace | Purpose |
|:----------|:--------|
| Overview | Check completion, open work, and suggested next steps |
| [Boards](olio://help/project-board) | Move cards through stages of work |
| [Planner](olio://help/project-planner) | Build and order a task list |
| [Files](olio://help/project-files) | Write documents and organize uploads |
| [Resources](olio://help/project-resources) | Keep useful external links |

Overview shows board and planner progress separately. Choose a quick action to open the workspace you need, or **Open AI Plan Builder** to draft a plan.

## Capture a note or link

Use **Quick Note** to choose a destination folder, name the note, and open it in Files. Use **Quick Link** to save a URL with an optional title and description under Resources.

The project search field finds actions such as **Create New Task**, **Create New Document**, and **Capture Quick Note**. Press **Ctrl/Cmd+K** outside an editor to focus it.

## Update settings

Open **Settings**, change the project name, description, or status, then choose **Save Changes**. Status choices are Planning, Active, Review, Completed, and Archived.

## Delete a project

In Settings, choose **Delete Project...**. Read the warning, enter the project name, select the acknowledgment, and choose **Delete Project**.

Deleting removes the project and its contents. For an organization project, this affects everyone using it. Set the status to Archived if you want to keep the project.',true,12),
('project-board','Project Board','Create cards, move them between lanes, and track completion.','## Add cards and lanes

Open a project''s **Boards** workspace. New boards start with **To Do**, **In Progress**, and **Done**.

Use a lane''s add control, enter a task title, and add the card. Choose **Add Swim Lane**, enter a name, and choose **Create Lane** for another stage of work.

## Edit a card

Open the card to change its title, description, priority, due date, or assignee name. Choose **Save Changes** before closing. The assignee field is a name you enter.

## Move and complete work

Drag a card into its next lane. Moving it into Done, or a lane whose name contains “done” or “complete,” marks it completed.

To reopen completed work, move it to a lane whose name does not contain “done” or “complete,” then open the card, clear **Mark as completed**, and save. Moving it back alone keeps its saved completion setting; clearing the checkbox while it remains in a completion lane still makes it appear completed.

## Delete a card

Open the card, choose **Delete Card**, and confirm. The card is permanently removed.

To bring planner tasks onto the board, see [Project Planner](olio://help/project-planner).',true,13),
('project-planner','Project Planner','Organize tasks and review AI-generated plan suggestions.','## Build your task list

Open a project''s **Planner**, enter a task title, and choose **Add Task**. Use **Add optional description** for more detail.

Drag tasks to reorder them. Select a task''s title to edit it, and expand its description to update the details. Finish editing by leaving the field. Use the completion circle to complete or reopen a task.

## Work with several tasks

Use the selection controls to choose tasks. Shift selects a range; Ctrl or Cmd helps select individual tasks. Convert selected tasks into board cards or choose **Delete Selected** and confirm.

Conversion creates cards in the board''s To Do lane, or its first available lane, and keeps the original planner tasks. Updates to the copies are separate.

## Archive or delete

Use a task''s menu to archive it or delete it. **Show Archived** includes archived tasks in the list; **Hide Archived** hides them again. Review the confirmation before permanently deleting a task.

## Build a plan with AI

1. Choose **Generate with AI**.
2. Describe your project goal.
3. Choose whether to include existing planner tasks and board cards as context.
4. Enable **Allow AI deletion suggestions** only if you want cleanup suggestions.
5. Choose **Generate Suggestions**.
6. Review the suggested tasks and due dates. Add follow-up instructions and generate again if needed.
7. Review each proposed deletion, then choose **Accept Suggestions** when the changes are ready.

Accepting applies the suggested tasks and selected deletions. Check dates and removal choices before accepting. The project shows its remaining AI uses; generating or refining a plan uses that allowance. Your prompt and the selected project context are sent to the AI service for processing. Review the context choices before generating.',true,14),
('project-files','Project Files','Create documents and folders, upload files, and link project items.','## Create folders and documents

Open a project''s **Files** workspace. Use **Folder** or **Doc** in the toolbar, enter a name, and confirm to create an item at the top level. To create an item inside a folder, use that folder''s add controls or context menu.

Expand folders in the file tree and select a document to edit it. Drag an item onto a folder to move it. Use the file tree''s context menu to rename an item or create content within a folder.

## Write a document

Type in the document editor. Content saves automatically; wait for **Saved** before leaving.

Use **Insert Link** to link to an external URL, a project file, a resource, a planner task, or a board card. Select text and press **Ctrl/Cmd+K** to use it as the link label. Right-click a link for its editing options.

## Upload and open a file

Choose **Upload**, then choose a file from your device. The file is added at the top level; drag it into a folder to organize it. Select an uploaded file in the tree to open it in a new tab.

Uploaded files use direct public file URLs. Anyone who has an upload URL may be able to open it without signing in, even when the project itself is personal or limited to an organization. Project audience settings do not make the uploaded file URL private.

## Delete an item

Use the item''s context menu and choose **Delete**. This action removes the item without a separate confirmation. Deleting a folder removes its contents too, so check the folder first. Removing an uploaded item from the project tree does not guarantee that its direct file URL is revoked.

For a fast way to create a document, use **Quick Note** in the project and choose where to save it.',true,15),
('project-resources','Project Resources','Save and organize external links within a project.','## Add a resource

1. Open a project''s **Resources** workspace.
2. Choose **Add Resource**.
3. Enter the URL and a title. Add a description if helpful. A title is optional for the Quick Links category.
4. Choose a category, such as Documentation, Design, Reference, Tool, Code, Quick Links, or Other.
5. Choose **Add Resource** to save.

Choose a category filter to narrow the list. Select a resource''s title to open its website in a new tab.

## Edit or remove a resource

Open the resource''s three-dot menu and choose **Edit**. Update its details and save.

Choose **Delete** and confirm to remove the saved resource. This removes the project link; it does not delete the external website or file.

## Capture a link quickly

Use the project''s **Quick Link** action to save a URL under the Quick Links category. Project resource links stay with that project.

For bookmarks on Home or shared across the organization, see [Quick Links](olio://help/quick-links).',true,16),
('organization-management','Organization Management','Share announcements and resources, follow team activity, and manage people and ownership.','Open **Organization** from the navigation menu. The header shows your team and its join code. Click the large **Join code** to copy it, then give it to a teammate to use during [organization setup](olio://help/organizations).

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

Use **Announcements**, **Library**, and **History** to add, edit, or delete entries, including their authors and dates. The remaining sections manage records associated with that organization, including links, folders, projects, pastes, and shared short URLs. New secrets are personal and are not added to an organization. Search and filters help find records, and supported lists allow bulk changes.

Operations in the organization administration console require a reason and confirmation. Editing organization history changes the team’s activity feed; the separate admin audit log retains the administrative change. For account access, banners, Help Center publishing, and review workflows, see [Application Administration](olio://help/application-administration).',true,17),
('profile-and-settings','Profile and Settings','Apply a photo or built-in background, manage Launcher devices, and leave a team.','Open **Profile** from the navigation menu to view your account information and organization role.

## Customize the background

1. Under **App Background**, choose **Customize**.
2. Open **Built-in themes** and choose **Dynamic Waves** or **Contour Drift**.
3. Choose a color preset: Indigo, Ocean, Teal, or Sunset.
4. Choose **Select** to apply the preview, then close the customization window.

Your built-in theme selection is remembered in this browser. If a custom photo is active, choose **Your photo → Use built-in background** to remove it and reveal the built-in theme. To arrange cards, use [Home''s dashboard controls](olio://help/home-dashboard).

## Use your own photo

1. Open **App Background → Customize → Your photo**.
2. Choose **Choose a photo** and select a JPEG, PNG, or WebP image up to 5 MB.
3. Set **Crop shape** and **Output width**. Drag the preview or use the horizontal and vertical position sliders to frame it, and adjust **Zoom** as needed.
4. Use **Reset framing** to start the crop again, or **Choose another photo** to replace the selection.
5. Choose **Apply photo** and wait for the success message before closing.

Choosing a file or adjusting its crop only changes the preview until you apply it. The applied photo is saved to your account and is available in new tabs and other signed-in sessions. A dark overlay keeps dashboard text readable; different screen shapes may trim the edges.

If the crop is too large to save, choose a smaller output width. **Use built-in background** removes the saved custom photo.

## Manage connected launchers

Under **Olio Launcher devices**, review each device''s name, connection date, and last-used time. Remove a device and confirm to revoke its access.

See [Connect Olio Launcher](olio://help/olio-launcher) for connection instructions.

## Leave an organization

Members and admins can choose **Leave Organization**, type the organization name exactly, and choose **Leave**. Owners can also leave when another owner remains. If you are the last owner, add another owner or transfer ownership from **Organization → People** first. See [Organization Management](olio://help/organization-management).

You lose access to its shared resources and return to organization setup. Use the team''s current code to rejoin, or join a different team.

## Sign out

Choose **Sign Out** on Profile to end your session.',true,18),
('my-tasks','My Tasks','Keep a personal checklist on Home.','## Add a task

Open **My Tasks** on Home, choose **Add task**, enter a title, and choose **Save task**. Use **Add note** for extra details.

## Keep your list up to date

Use a task''s completion control to move it between Open and Completed. Use the edit action to change its title or note, then save. The up and down controls reorder open tasks.

Use the delete action to remove a task you no longer need. It deletes immediately without a confirmation, so check the item first.

## Show My Tasks on Home

If the task control is hidden, choose **Customize dashboard → Elements** and enable the tasks group, then choose **Done**.

On narrow screens, the task control may show a checklist icon and count instead of the My Tasks label. Close the task panel with its close button or Escape.

My Tasks is your personal checklist. For work inside a project, use [Project Planner](olio://help/project-planner).',true,19),
('public-pages','Opening Shared Links','Understand sign-in requirements for short links, secret reveals, and public pastes.','## Short links

Public short links redirect without sign-in. Personal short links require the creator''s account; shared organization links require the creator or a signed-in member of the linked organization. Sign in to Olio first, then reopen a restricted link.

If a link appears unavailable, it may be deleted or your account may not have access. Ask the sender to check its audience or provide a current link. The destination website may require a separate sign-in. See [URL Shortener](olio://help/url-shortener).

## One-time secret links

Open the link, then choose **Reveal secret** when ready. Opening the page alone does not consume it. A recipient''s successful reveal uses the one-time viewing; refreshing or reopening will not reveal the message again.

The creator can preview an unconsumed, unexpired secret while signed in to the account that created it. That preview does not consume the recipient''s viewing. The same person using a different account or a signed-out browser counts as a recipient.

Anyone holding the secret link can reveal it before expiry; no recipient sign-in is required. If it was already viewed, expired, or deleted, ask the sender for a new one. See [Secret Sharing](olio://help/secret-sharing).

## Paste links

A paste page shows its title, language label, and text. Choose **Copy** to copy the content.

Public pastes are readable without signing in. For a personal or organization paste, sign in to an account with access, then reopen the link. Copying a paste link does not change its audience. If the paste is expired or missing, ask its creator for a replacement.

## Browse public pastes

**View All** in Pastebin opens the public list at **/p**; **/pastes** also opens this list. It shows publicly shared pastes, newest first, with previews and view counts. Choose **Load More** to browse further. This list is not a private paste archive.

A public paste is discoverable by other visitors. Choose its audience carefully in [Pastebin](olio://help/pastebin).',true,20),
('plugins-and-classdash','Plugins and ClassDash','Filter your week, edit classes, import a schedule, and set campus locations.','## Install and open ClassDash

Open **Utilities → Plugins & Dashboard** and choose **Install** on ClassDash. Use **Open & configure** to return later. Your saved schedule and map locations belong to your account.

ClassDash has three sections: **Weekly schedule**, **Import classes**, and **Home base**. Use **Add class** for manual entry or **Import schedule** to start from a file.

## Set your home base

1. Open **Home base**.
2. Enter your **Dorm or home name**.
3. Search for the building or address, select a result, and check the pin. You can also click the map or use **Use my location** and allow browser location access.
4. Choose **Save home**.

Use **Edit Home Location** to update a saved home. Saving recalculates leave estimates. Location search sends your search text to the configured map search service; do not put private information into it.

## Browse your week

**Weekly schedule** shows a next-class countdown and your saved class cards. Choose **All classes** or a day to filter the cards. Classes are sorted by start time, and the number beside a day counts the saved classes that meet that day. These filters describe the recurring week; semester dates determine whether a class appears in the upcoming countdown.

## Add or edit a class

1. Choose **Add class**, or the pencil on a saved class.
2. Under **Class details**, enter a course code. Course name and section are optional.
3. Under **Weekly routine**, enter start and end times, choose every meeting day, and optionally set semester dates.
4. Under **Campus location**, enter the building or room and search or click the map to place its pin. Choose an existing classroom button to reuse its name and coordinates, then adjust the room name if needed.
5. Choose **Add to schedule** or **Save changes**.

The details and location appear side by side on wider screens and stack on smaller screens. A location name alone is not enough: every class needs a map pin. Choose at least one day; the end time must be later than the start time, and the semester end cannot precede its start.

Use separate entries when a course''s lecture and lab have different times or locations. **Back to schedule** or the close button leaves the editor without saving. The trash button on a class asks for confirmation before removing it.

## Import a calendar or syllabus

1. Open **Import classes**, or choose **Import schedule**.
2. Choose an ICS calendar or syllabus file up to 3 MB.
3. Choose **Import calendar** for ICS, or **Extract classes** for a syllabus.
4. Choose **Review class** beside a result. Check its code, days, times, semester dates, and location.
5. Place a classroom pin or reuse a saved location, then choose **Add to schedule**.
6. Continue from the import results. Successfully saved rows say **Saved to schedule**, and the progress count shows how many remain.

Importing creates review drafts; it does not add everything automatically. A failed save leaves the draft open and does not mark it saved. **Back to import results** returns without saving that draft. Keep ClassDash open while reviewing: pending results and their progress are not saved across a page reload. Choosing another file or extracting again starts a fresh set of results; previously saved classes stay on your schedule.

Supported syllabus formats are PDF, DOC, DOCX, TXT, MD, RTF, and ODT. Syllabus documents are sent to OpenAI for analysis and are not added to your project files. ICS calendars are parsed on your device. Imported files are snapshots, not a live calendar subscription.

## Check imported details

If no classes are found, use a calendar with named events and explicit start and end times, or enter classes manually. All-day entries are not imported as classes. Review times carefully when the file uses another time zone. ClassDash stores weekly meeting days and date bounds; calendar exceptions, holiday cancellations, and unusual recurrence patterns need manual review.

If extraction fails, check the file type and 3 MB limit. For a syllabus, check your connection and sign in again if requested. Avoid saving the same class again from a second import.

## Read the countdown

Before class, the countdown runs to its start time; during class, it runs to the end. Use the separate **Leave by** time to decide when to set off. Walking estimates include a five-minute buffer. The first trip starts from home; gaps of 45 minutes or less use the previous classroom, while longer gaps start from home again.

These are estimates based on map-pin distance and walking pace, not live route or traffic directions. Check both home and classroom pins if the estimate looks wrong. **You''re clear** means there are no upcoming classes in the next week; check days, times, and semester dates if that is unexpected.

## Show, hide, or uninstall

On Home, choose **Customize dashboard → Elements** to show or hide ClassDash. Drag and resize its card on a wide screen.

To uninstall, open **Plugins & Dashboard**, choose **Uninstall**, and confirm. Your saved schedule is kept for reinstalling. See [Home Dashboard](olio://help/home-dashboard) for layout controls.',true,21),
('olio-launcher','Connect Olio Launcher','Connect your desktop Launcher and use your Quick Pastes.','## Connect your account

1. In Olio Launcher, open **Settings** and enter a recognizable device name.
2. Choose **Connect Olio Account**.
3. Sign in to Olio Workstation in the browser if prompted.
4. Check that the device name and code match the Launcher in front of you.
5. Choose **Approve launcher**, then return to Launcher and wait for **Connected**.

Approval grants the connected device read-only access to your private Quick Pastes and its connection status. It cannot create, edit, delete, reorder, favorite, or share your saved data.

Choose **Deny** for an unrecognized request. If a request expires, start again from Launcher Settings.

## Use Quick Pastes

Open **Quick Pastes** in Launcher to load your saved text. Search the list, choose a category or Favorites, then copy an item or use its paste action to paste into the application you were using before Launcher.

Refresh the list after changing your text in Workstation. Create, edit, and organize items in [Workstation Quick Pastes](olio://help/quick-pastes).

If Launcher asks for approval again to access Quick Pastes, reconnect and review the new request.

## Disconnect a device

In Workstation, open **Profile → Olio Launcher devices**, choose the device''s remove action, and confirm. Its access is revoked immediately.

You can also choose **Disconnect Olio Account** in Launcher Settings and confirm. Connect again later if you want to restore access.',true,22),
('help-center','Using the Help Center','Search guides, filter topics, jump to a section, and share an article.','## Find a guide

Open **Help Center** from the navigation menu or **Utilities**, or visit **/help**. Published guides are available without signing in.

Enter a tool or task in **Search help articles**, such as “ClassDash” or “short links.” Search matches article titles, summaries, and topic names, rather than every word in the article body. Use a shorter phrase if you do not find the guide you need.

Choose a topic to narrow the library or **All guides** to browse everything. Editing your search resets the topic filter. Use **Clear search** or **Show all guides** to start over.

## Read and share

Open an article and use **In this guide** to jump to a section. On a smaller screen, expand that control above the article. Follow related guides under **Keep exploring**, or choose **Browse all guides** to return to the library.

Copy the article''s address from your browser to share it. After choosing a section, its address can include a section anchor. Links to other help articles remain available only while those articles are published.

## When something is missing

If loading fails, check your connection and choose **Try again**. **This guide isn''t available** can mean the article was unpublished, removed, or the address is incorrect. Return to the library and search for the current guide.

Some instructions require an organization role, an installed plugin, or application administrator access. Check the relevant guide if a control is absent. An organization admin is not automatically an application administrator.

If a guide no longer matches what you see, send your app administrator the article title and the step that needs correction. Administrators can maintain guides through [Application Administration](olio://help/application-administration).',true,23),
('application-administration','Application Administration','Manage accounts, banners, operational data, help publishing, and administrative reviews.','## Access the administration console

Open **/admin** and sign in with an account authorized for application administration. Organization owners and admins do not automatically have this access. Available sections and actions depend on your application permissions; application-owner review privileges are separate from organization ownership.

The console includes **Overview**, **People**, **Organizations**, **Banners**, **Workspace data**, **Integrations**, **Help Center**, and **Activity**. Application owners also have **Pending reviews**. Use **Refresh** to reload the current view.

## Manage an account

Open **People** and select an account. Review its profile, organization, and associated records before making changes. Available account controls include profile and access changes, temporary-password resets, bans or unbans, and deletion requests.

A temporary password must be at least 12 characters. Choose **Review password reset** and complete the operation review. The user must replace the temporary password before continuing into Olio. See [Getting Started](olio://help/getting-started).

For a ban, choose its duration and provide a reason; the reason is shown to the affected user. **Request account deletion** sends a request for application-owner review rather than immediately deleting the account. Admin-access requests also require owner review.

Account views also provide access to saved workspace records, background customization, and targeted dashboard messages. These are administrative actions on the selected user''s account, so check the account identity first.

## Manage organizations and records

Use **Organizations** to open a team''s settings, people, announcements, library, history, and associated data. Ownership and last-owner protections still apply. See [Organization Management](olio://help/organization-management) for the available organization controls.

Use **Workspace data** for projects and saved content, and **Integrations** for plugin and device records. Search and filter a list before selecting records. Some lists support bulk operations. Follow the available actions for the selected record; sensitive content may require a separate reveal operation and audit reason.

## Publish dashboard banners

Open **Banners** to manage the global **Everyone** message and targeted messages. For a global message, choose **Create global banner** or **Edit global banner**, write the message, and inspect **Live preview**.

Under **Visibility & schedule**, enable the banner and optionally set start and end times. Use the time zone displayed by the form. A blank start means immediately; a blank end means until disabled. A preview includes unsaved changes and does not mean the message is live. Save and complete any operation review shown.

For a targeted message, check its recipients, appearance, and schedule before saving. Dashboard messages are separate from organization announcements.

## Maintain Help Center articles

1. Open **Help Center → Help editor**.
2. Select an article or choose **New Article Draft**.
3. Set its title, slug, summary, sort order, and content. Keep an existing slug when possible so shared links continue to work.
4. Use the editor''s formatting tools, **MD Tips**, and **Insert Link** for article and section links.
5. Leave **Published** unchecked to keep a draft, or check it to make the guide available publicly at **/help**.
6. Choose **Save Draft** or **Save Changes**, then complete the operation review.

The Published checkbox controls visibility even when the button says Save Draft. A good summary helps readers find the guide in search. Published help is readable by signed-out visitors; do not put private account or organization information into it.

To remove a guide from public view while retaining it, clear **Published** and save. Deleting permanently removes it and can break links from other articles. Review those links before deletion. The editor asks for the article name and then the administrative confirmation.

## Review operations and history

When an operation review appears, enter a reason of at least three characters and choose **Review operation**. Check the action, record count, changed fields, and related records that may be affected. Type the exact authorization text shown, then choose **Execute**. Choose **Cancel** if the preview is not what you intended.

Application owners use **Pending reviews** for requests requiring their decision. **Activity** contains the administrative audit history. Editing a team''s organization history does not erase this separate audit trail.',true,24)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  content = EXCLUDED.content,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

COMMIT;
