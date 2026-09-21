-- Refresh user guides while preserving article IDs and existing publication choices.
-- Unrelated custom articles are unchanged.
BEGIN;

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

If Olio asks you to change your password, enter a new password with at least 12 characters and confirm it. Choose **Save password and continue**. Follow any error shown before continuing.

## Start using Home

Open the navigation menu to reach **Utilities**, **Organization**, **Profile**, or **Help Center**. See [Home Dashboard](olio://help/home-dashboard) to arrange your workspace.

If your profile cannot load, choose **Try again** on the account setup screen.',true,1),
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

You become its owner. Open **Organization → Overview** and use **Copy** beside the organization code to invite your team.

## Work with your team

Open **Organization → Shared Links** for team bookmarks. Use **Utilities → Projects → Org** for organization projects. Choose **Personal** when creating a project for yourself.

Owners and admins manage the organization name, invite code, and members. Members use its shared tools and resources. See [Organization Management](olio://help/organization-management).

## Change organizations

Your account can belong to one organization at a time. Members and admins can use **Profile → Leave Organization**, type the organization name, and choose **Leave**. Then join another organization from setup.

Leaving removes access to the old team''s resources. To rejoin, use its current invite code. Owners have a **Delete Organization** action instead; it deletes the team''s data. See [Profile and Settings](olio://help/profile-and-settings) before using it.',true,2),
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
- Choose **Profile → Customize** to change the background theme and colors.',true,3),
('utilities-hub','Utilities Hub','Find the right tool for links, projects, text, QR codes, and plugins.','Open **Utilities** from the navigation menu, then choose a tool.

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

Team bookmarks are in **Organization → Shared Links**. To change the shortcuts visible on Home, open **Customize dashboard → Elements**.',true,4),
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

Open **Organization → Shared Links** and choose **Link**. Links created here are available to everyone in the organization.

You can edit or delete shared links you created. Owners and admins can also manage other members'' shared links. Shared links appear as a list in the Organization page.',true,5),
('url-shortener','URL Shortener','Create, copy, and remove short links.','## Create a short link

1. Open **Utilities → URL Shortener**.
2. Paste the full destination URL, including **https://**, into **Enter long URL**.
3. Enter a **Custom short code** if you want a recognizable ending, or leave it blank.
4. Choose **Shorten URL**.

If the code is already taken, choose another code and try again.

## Copy and use it

Choose the copy button beside the new short URL. Share that copied link. Anyone with it can open the destination; the destination website may require its own sign-in.

Use **Open short URL** to test the redirect or **Open destination** to visit the original address. The list shows each link''s click count.

You can turn the short link into a [QR code](olio://help/qr-code-generator) for printed materials.

## Delete a short link

Choose **Delete** beside the link and confirm. The short link stops working, including in messages and QR codes where you used it. The destination website is unaffected.',true,6),
('secret-sharing','Secret Sharing','Create a one-time message link and check whether it has been viewed.','## Create and share a secret

1. Open **Utilities → Secret Sharing**.
2. Enter your message.
3. Choose **Expires in**: 1 hour, 6 hours, 24 hours, 3 days, or 7 days.
4. Choose **Create Secret Link**.
5. Use the copy button beside the link and send it to your recipient.

Anyone with the link can open it before it expires. Opening it displays the message immediately and uses its one viewing, so copy the link rather than opening it to check it.

## Read the status

The list shows **Not viewed** or **Viewed**, plus the expiry time or **Expired**. Copying is unavailable after the secret has been viewed or has expired.

Ask the recipient to open the link only when ready to read it. If it is unavailable, create and share a new secret link.',true,7),
('qr-code-generator','QR Code Generator','Generate a QR code from text or a URL and download it as an image.','## Generate a code

1. Open **Utilities → QR Generator**.
2. Enter the text or full URL you want the code to contain.
3. Choose **Generate QR Code**.
4. Scan the preview with your phone to check the result.
5. Choose **Download QR Code** to save **qrcode.png**.

Changing the text requires choosing **Generate QR Code** again before downloading.

The text or URL is sent to an external QR-code service to create the image. Use content you are comfortable sending to that service.

## Share the image

Add the downloaded image to a document, poster, or message. Keep the code clear and leave its white border visible. Test it at its final display or print size.

A code containing a link depends on that link staying available. You can create a [short URL](olio://help/url-shortener) first, then use it to generate the code.

If generation or downloading fails, check your internet connection and try again.',true,8),
('pastebin','Pastebin','Save text, choose who can access it, and share a paste link.','## Create a paste

1. Open **Utilities → Pastebin** and choose **New Paste**.
2. Choose one or more audiences: **Personal**, **Org**, or **Public**. Org is selected initially, so deselect it if you want a personal-only paste.
3. Add an optional title and enter the content.
4. Choose a language label and expiry: **Never expires**, 1 hour, 1 day, 1 week, or 1 month.
5. Choose **Create Paste**.

## Choose the audience

| Audience | Who can access it |
|:---------|:------------------|
| Personal | You while signed in |
| Org | Members of your organization while signed in |
| Public | Anyone, including visitors who are signed out |

Audiences can be combined. Selecting Public makes the paste public even if Personal or Org is also selected. Public pastes can appear in the public paste list.

## Find and share a paste

Use the audience tabs to view your personal pastes, organization pastes, or public pastes you created. Use the copy button beside a paste to copy its link. Opening a paste displays its text and a **Copy** button for the content.

A copied link keeps the paste''s audience restrictions. An expired paste can no longer be read from its view page.

## Delete a paste

The trash button deletes the selected paste immediately. Check the item before clicking; its link will stop working.

For private text you want to edit and reuse regularly, see [Quick Pastes](olio://help/quick-pastes).',true,9),
('quick-pastes','Quick Pastes','Create, organize, and reuse private text.','Quick Pastes is your private collection of text to reuse, such as replies, notes, and templates.

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
3. Choose a template and enter a project name. Add a description if helpful.
4. Choose **Create Project**.
5. Open its card to start working.

Personal projects are for your account. Org projects are shared with your organization. A template choice does not replace the audience selection; check both before creating.

## Find a project

Switch between **Org** and **Personal**, then search by name, description, or tag. Use **All**, **Active**, **Completed**, or **Archived** to filter the list. Active includes projects in planning or review. Sort by recent updates, name, or status.

Use the search control at the top or **Ctrl/Cmd+K** when you are not typing to find project-opening and filtering actions.

## Work inside a project

Each project has Overview, Boards, Planner, Files, and Resources. See [Project Overview](olio://help/project-overview) for navigation and settings.

If a project seems missing, check its audience tab and clear your filters first.',true,11),
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

To reopen completed work, open the card, clear **Mark as completed**, and save. Moving it back to another lane keeps its completion setting until you change it.

## Delete a card

Open the card, choose **Delete Card**, and confirm. The card is permanently removed.

To bring planner tasks onto the board, see [Project Planner](olio://help/project-planner).',true,13),
('project-planner','Project Planner','Organize tasks and review AI-generated plan suggestions.','## Build your task list

Open a project''s **Planner**, enter a task title, and choose **Add Task**. Use **Add optional description** for more detail.

Drag tasks to reorder them. Select a task''s title to edit it, and expand its description to update the details. Finish editing by leaving the field. Use the completion circle to complete or reopen a task.

## Work with several tasks

Use the selection controls to choose tasks. Shift selects a range; Ctrl helps select individual tasks. Convert selected tasks into board cards or choose **Delete Selected** and confirm.

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

Accepting applies the suggested tasks and selected deletions. Check dates and removal choices before accepting. The project shows its remaining AI uses; generating or refining a plan uses that allowance.',true,14),
('project-files','Project Files','Create documents and folders, upload files, and link project items.','## Create folders and documents

Open a project''s **Files** workspace. Use **Folder** or **Doc** in the toolbar, enter a name, and confirm to create an item at the top level. To create an item inside a folder, use that folder''s add controls or context menu.

Expand folders in the file tree and select a document to edit it. Drag an item onto a folder to move it. Use the file tree''s context menu to rename an item or create content within a folder.

## Write a document

Type in the document editor. Content saves automatically; wait for **Saved** before leaving.

Use **Insert Link** to link to an external URL, a project file, a resource, a planner task, or a board card. Select text and press **Ctrl/Cmd+K** to use it as the link label. Right-click a link for its editing options.

## Upload and open a file

Choose **Upload**, then choose a file from your device. The file is added at the top level; drag it into a folder to organize it. Select an uploaded file in the tree to open it in a new tab.

Uploaded files can be opened through their direct links. Share those links only with the intended recipients.

## Delete an item

Use the item''s context menu and choose **Delete**. Deleting a folder removes its contents too, so check the folder before using this action.

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
('organization-management','Organization Management','View members, share the invite code, and manage team settings.','Open **Organization** from the navigation menu.

## View the team and invite someone

The **Overview** tab shows the organization name, code, and member list. Choose **Copy** beside the code and give it to the person you want to invite. They can use it during [organization setup](olio://help/organizations).

Open **Shared Links** to use or add team bookmarks.

## Change organization settings

Owners and admins can open **Manage**. Edit **Organization Name** and choose **Save Changes** to rename the team.

Under **Security**, choose **Regenerate** and confirm to replace the invite code. Copy the new code for future invitations. The old code stops working; existing members stay in the organization.

## Manage members

In **Manage Members**, use **Promote** to make a member an admin or **Demote** to return an admin to member. Owners and admins have management access; only the owner can delete the organization.

Choose **Remove** beside a member and confirm to remove their access to the organization. Check the person''s name before confirming.

## Leave or delete the organization

These actions are in **Profile → Organization Management**. See [Profile and Settings](olio://help/profile-and-settings) for the steps and effects.',true,17),
('profile-and-settings','Profile and Settings','Customize the background, manage Launcher devices, and leave or delete an organization.','Open **Profile** from the navigation menu to view your account information and organization role.

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

Members and admins can choose **Leave Organization**, type the organization name exactly, and choose **Leave**.

You lose access to its shared resources and return to organization setup. Use the team''s current code to rejoin, or join a different team.

## Delete an organization

Owners can choose **Delete Organization**. Read the warning, check the acknowledgment, type the organization name exactly, and choose **Delete**.

This permanently deletes the organization and its data and removes all members. Use it only when the team no longer needs that workspace.

## Sign out

Choose **Sign Out** on Profile to end your session.',true,18),
('my-tasks','My Tasks','Keep a personal checklist on Home.','## Add a task

Open **My Tasks** on Home, choose **Add task**, enter a title, and choose **Save task**. Use **Add note** for extra details.

## Keep your list up to date

Use a task''s completion control to move it between Open and Completed. Use the edit action to change its title or note, then save. The up and down controls reorder open tasks.

Use the delete action to remove a task you no longer need. Check the item first.

## Show My Tasks on Home

If the task control is hidden, choose **Customize dashboard → Elements** and enable the tasks group, then choose **Done**.

My Tasks is your personal checklist. For work inside a project, use [Project Planner](olio://help/project-planner).',true,19),
('public-pages','Opening Shared Links','Open short URLs, one-time secrets, and pastes shared with you.','## Short links

Opening a short URL takes you to its destination. If the link is unavailable, ask the sender for a current link. The destination website may require its own sign-in.

## One-time secret links

Open a secret link when you are ready to read it. The message appears immediately and the link is then unavailable for another viewing.

If the secret was already viewed or expired, ask the sender to create a new link. Opening it yourself to test it uses that viewing.

## Paste links

A paste page shows its title, language label, and text. Choose **Copy** to copy the content.

Public pastes are readable without signing in. For a personal or organization paste, sign in to the account that has access, then reopen the link. If the paste is expired or missing, ask its creator for a new one.

## Browse public pastes

The public paste list at **/pastes** shows publicly shared pastes, newest first, with previews and view counts. Choose **Load More** to browse further.

A public paste is discoverable by other visitors. When creating one, choose its audience carefully in [Pastebin](olio://help/pastebin).',true,20),
('plugins-and-classdash','Plugins and ClassDash','Install ClassDash, add or import classes, and see when to leave.','## Install ClassDash

Open **Utilities → Plugins & Dashboard** and choose **Install** on ClassDash. Use **Open & configure** to return to its settings later. Your schedule and map locations are private to your account.

## Set your home location

Enter your **Dorm or home name**, place the home pin on the map, and choose **Save home**. Use **Edit Home Location** to update it later.

## Add a class

1. Under **Weekly schedule**, choose **Add class**.
2. Enter the course code, start and end times, and building or location. Add the course name and section if helpful.
3. Select every meeting day and optional semester start and end dates.
4. Place the classroom pin on the map.
5. Choose **Add to schedule**.

Use the pencil to edit a class and **Save changes** to finish. Use the trash button and confirm to remove a class.

## Import a calendar or syllabus

1. Under **Import your schedule**, choose an ICS calendar or syllabus file, up to 3 MB.
2. Choose **Import calendar** for ICS, or **Extract classes** for a syllabus.
3. Choose **Review & place pin** for a result.
4. Check the days, times, dates, and location, place the classroom pin, then add it to your schedule.
5. Review the other results you want to add.

Supported syllabus formats include PDF, DOC, DOCX, TXT, MD, RTF, and ODT. Syllabus documents are sent to OpenAI for analysis. ICS calendars are read on your device.

## Read the countdown

ClassDash shows your next class and when to leave. Walking estimates include a five-minute buffer. The first trip starts from home; gaps of 45 minutes or less use the previous classroom. Check your pins and times if an estimate looks wrong.

## Show, hide, or uninstall

On Home, choose **Customize dashboard → Elements** to show or hide ClassDash. Drag and resize its card on a wide screen.

To uninstall, open **Plugins & Dashboard**, choose **Uninstall**, and confirm. Your saved schedule is kept for reinstalling.',true,21),
('olio-launcher','Connect Olio Launcher','Connect your desktop Launcher and use your Quick Pastes.','## Connect your account

1. In Olio Launcher, open **Settings** and enter a recognizable device name.
2. Choose **Connect Olio Account**.
3. Sign in to Olio Workstation in the browser if prompted.
4. Check that the device name and code match the Launcher in front of you.
5. Choose **Approve launcher**, then return to Launcher and wait for **Connected**.

Choose **Deny** for an unrecognized request. If a request expires, start again from Launcher Settings.

## Use Quick Pastes

Open **Quick Pastes** in Launcher to load your saved text. Search the list, choose a category or Favorites, then copy an item or use its paste action to paste into the application you were using before Launcher.

Refresh the list after changing your text in Workstation. Create, edit, and organize items in [Workstation Quick Pastes](olio://help/quick-pastes).

If Launcher asks for approval again to access Quick Pastes, reconnect and review the new request.

## Disconnect a device

In Workstation, open **Profile → Olio Launcher devices**, choose the device''s remove action, and confirm. Its access is revoked immediately.

You can also choose **Disconnect Olio Account** in Launcher Settings and confirm. Connect again later if you want to restore access.',true,22)
ON CONFLICT (slug) DO UPDATE SET
  title=EXCLUDED.title, summary=EXCLUDED.summary, content=EXCLUDED.content,
  sort_order=EXCLUDED.sort_order, updated_at=now();

-- Triggers has no reachable page in the current app; retain the old article as a draft.
UPDATE public.help_articles SET is_published=false, updated_at=now()
WHERE slug='triggers-and-webhooks';

COMMIT;
