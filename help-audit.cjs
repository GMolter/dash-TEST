const fs = require('fs');
const base = 'OlioWorkstation/UnofficialHelpArticles/';
function edit(file, changes) {
  const path = base + file;
  let text = fs.readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
  for (const [before, after] of changes) {
    if (!text.includes(before)) throw new Error(`Missing passage in ${file}: ${before}`);
    text = text.replace(before, after);
  }
  fs.writeFileSync(path, text);
}
function article(file, title, slug, summary, order, content) {
  fs.writeFileSync(base + file, `########\nTitle: ${title}\nSlug: ${slug}\nSummary: ${summary}\nSort Order: ${order}\n########\n\n${content.trim()}\n`);
}

edit('01-getting-started.md', [
  ['Follow any error shown before continuing.', 'If the password was saved but automatic sign-in fails, choose **Try continuing again**, or sign out and sign in with the new password. Contact your administrator if the account still requires a password change.'],
  ['If your profile cannot load, choose **Try again** on the account setup screen.', 'If your profile cannot load, choose **Try again** on the account setup screen. If an account restriction screen appears, read its reason and any end time, then contact your app administrator if you need help.\n\nYou can read published guides at **/help** without signing in. See [Using the Help Center](olio://help/help-center) for search and navigation.'],
]);
edit('02-organizations.md', [
  ['Members and admins can use **Profile → Leave Organization**, type the organization name, and choose **Leave**. Then join another organization from setup.', 'Use **Profile → Leave Organization**, type the organization name, and choose **Leave**. Owners can leave only when another owner remains; the last owner must add another owner or transfer ownership first. Then join another organization from setup.'],
]);
edit('03-home-dashboard.md', [
  ['- Choose **Profile → Customize** to change the background theme and colors.', '- Choose **Profile → App Background → Customize** to change the built-in theme and colors or apply your own photo. See [Profile and Settings](olio://help/profile-and-settings).\n\n## Dashboard messages\n\nApplication administrators can display a general banner or a message for your account. These may appear only during a scheduled window. Read the message and follow any relevant instructions; contact your administrator if you need clarification. Organization announcements are separate and appear under **Organization → Announcements**.'],
]);
edit('04-utilities-hub.md', [
  ['| Help Center | Search articles and read guides |', '| [Help Center](olio://help/help-center) | Search articles and read guides |'],
  ['Open **Utilities** from the navigation menu, then choose a tool.', 'Open **Utilities** from the navigation menu, then choose a tool. Choose **Show Descriptions** for a short explanation of each tool, or **Hide Descriptions** for a simpler view.'],
]);
article('06-url-shortener.md', 'URL Shortener', 'url-shortener', 'Create short links, choose their audience, and manage access.', 6, `
## Create a short link

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

Choose **Delete** on a link you own and confirm. Its short URL stops working wherever you shared it; the destination website is unaffected. You cannot delete another user's short link from this tool.

If a shared link appears unavailable, check your sign-in and organization, then ask its creator to check the audience or provide a replacement.
`);
article('07-secret-sharing.md', 'Secret Sharing', 'secret-sharing', 'Share a one-time message, preview it safely, or revoke its link.', 7, `
## Create and share a secret

1. Open **Utilities → Secret Sharing**.
2. Enter your message.
3. Choose **Expires in**: 1 hour, 6 hours, 24 hours, 3 days, or 7 days.
4. Choose **Create Secret Link**.
5. Choose **Copy link** in the creation confirmation or beside the saved link, then send it to your recipient.

The management list is private to your account. Anyone who has the secret link can reveal its message before expiry; the recipient does not need an Olio account. Share the link only with its intended recipient.

## Reveal or preview

Opening the link shows a **Reveal secret** button. The message is consumed when a recipient chooses that button, not when the page first opens. After revealing it, the recipient should read or copy what they need before leaving; refreshing cannot reveal it again.

To check your own message, stay signed in to the account that created it and choose **Preview my secret**, then **Reveal secret**. Your owner preview does not use the recipient's one-time viewing. Testing while signed out or signed in as a different user does consume it.

## Read the status

The list shows **Not viewed** or **Viewed** and the expiry time. Copying is disabled for viewed or expired secrets. A consumed secret cannot be revealed again, including by its creator.

Expiry blocks access even if the row is still visible. Expired records are scheduled for automatic cleanup every minute, and the list refreshes periodically, so an expired entry can briefly remain before disappearing.

## Revoke a secret

Choose **Delete secret**, then **Confirm delete**, to permanently remove the message record and invalidate its link. Choose **Cancel** to keep it. If someone has already read or copied the message, deleting the link cannot retract their copy.

If a recipient sees **Secret Not Available**, it may be expired, already viewed, or deleted. Create a new secret if you still need to share the message. For text that should remain readable more than once, use [Pastebin](olio://help/pastebin).
`);
edit('08-qr-code-generator.md', [
  ['Changing the text requires choosing **Generate QR Code** again before downloading.', 'The preview appears beside the entry form on wider screens and below it on smaller screens. Changing the text requires choosing **Generate QR Code** again before downloading; the existing preview still contains the previous value.'],
  ['A code containing a link depends on that link staying available.', 'A QR code does not grant access to its destination. Personal and organization links still require the right signed-in account. A code containing a link depends on that link staying available.'],
]);
edit('09-pastebin.md', [
  ['4. Choose a language label and expiry: **Never expires**, 1 hour, 1 day, 1 week, or 1 month.', '4. Choose an expiry: **Never expires**, 1 hour, 1 day, 1 week, or 1 month. New pastes are saved with a Markdown language label; this form does not have a language selector.'],
  ['Use the audience tabs to view your personal pastes, organization pastes, or public pastes you created.', 'Use the audience tabs to view the five most recent matching personal pastes, organization pastes, or public pastes you created. **View All** opens the public paste list at **/p**; it is not a full private or organization archive.'],
  ['The trash button deletes the selected paste immediately.', 'The trash button attempts to delete the selected paste immediately, subject to your access permissions.' ],
]);
edit('10-projects-center.md', [
  ['3. Choose a template and enter a project name. Add a description if helpful.', '3. Choose **Blank**, **Personal Project**, or **School Project** as the template, then enter a project name. Add a description if helpful.'],
  ['If a project seems missing, check its audience tab and clear your filters first.', 'If a project seems missing, check its audience tab and clear your filters first. An archived project remains available under **Archived**; it has not been deleted. Leaving an organization removes access to its projects.'],
]);
edit('12-project-board.md', [
  ['To reopen completed work, open the card, clear **Mark as completed**, and save. Moving it back to another lane keeps its completion setting until you change it.', 'To reopen completed work, move it to a lane whose name does not contain “done” or “complete,” then open the card, clear **Mark as completed**, and save. Moving it back alone keeps its saved completion setting; clearing the checkbox while it remains in a completion lane still makes it appear completed.'],
]);
edit('13-project-planner.md', [
  ['Shift selects a range; Ctrl helps select individual tasks.', 'Shift selects a range; Ctrl or Cmd helps select individual tasks.'],
  ['The project shows its remaining AI uses; generating or refining a plan uses that allowance.', 'The project shows its remaining AI uses; generating or refining a plan uses that allowance. Your prompt and the selected project context are sent to the AI service for processing. Review the context choices before generating.'],
]);
edit('14-project-files.md', [
  ['Uploaded files can be opened through their direct links. Share those links only with the intended recipients.', 'Uploaded files use direct public file URLs. Anyone who has an upload URL may be able to open it without signing in, even when the project itself is personal or limited to an organization. Project audience settings do not make the uploaded file URL private.'],
  ['Deleting a folder removes its contents too, so check the folder before using this action.', 'This action removes the item without a separate confirmation. Deleting a folder removes its contents too, so check the folder first. Removing an uploaded item from the project tree does not guarantee that its direct file URL is revoked.'],
]);
edit('16-organization-management.md', [
  ['The remaining sections manage the organization’s links, folders, projects, pastes, secrets, and short URLs.', 'The remaining sections manage records associated with that organization, including links, folders, projects, pastes, and shared short URLs. New secrets are personal and are not added to an organization.'],
  ['Changes require a reason and confirmation. Editing organization history changes the team’s activity feed; the separate admin audit log retains the administrative change.', 'Operations in the organization administration console require a reason and confirmation. Editing organization history changes the team’s activity feed; the separate admin audit log retains the administrative change. For account access, banners, Help Center publishing, and review workflows, see [Application Administration](olio://help/application-administration).'],
]);
edit('17-profile-and-settings.md', [
  ['Summary: Customize the background, manage Launcher devices, and leave an organization.', 'Summary: Apply a photo or built-in background, manage Launcher devices, and leave a team.'],
  ['2. Choose **Dynamic Waves** or **Contour Drift**.', '2. Open **Built-in themes** and choose **Dynamic Waves** or **Contour Drift**.'],
  ['Your applied selection is remembered in this browser. To arrange cards, use [Home\'s dashboard controls](olio://help/home-dashboard).', `Your built-in theme selection is remembered in this browser. If a custom photo is active, choose **Your photo → Use built-in background** to remove it and reveal the built-in theme. To arrange cards, use [Home's dashboard controls](olio://help/home-dashboard).

## Use your own photo

1. Open **App Background → Customize → Your photo**.
2. Choose **Choose a photo** and select a JPEG, PNG, or WebP image up to 5 MB.
3. Set **Crop shape** and **Output width**. Drag the preview or use the horizontal and vertical position sliders to frame it, and adjust **Zoom** as needed.
4. Use **Reset framing** to start the crop again, or **Choose another photo** to replace the selection.
5. Choose **Apply photo** and wait for the success message before closing.

Choosing a file or adjusting its crop only changes the preview until you apply it. The applied photo is saved to your account and is available in new tabs and other signed-in sessions. A dark overlay keeps dashboard text readable; different screen shapes may trim the edges.

If the crop is too large to save, choose a smaller output width. **Use built-in background** removes the saved custom photo.`],
]);
edit('19-quick-pastes.md', [
  ['Quick Pastes is your private collection of text to reuse, such as replies, notes, and templates.', 'Quick Pastes is your private collection of text to reuse, such as replies, notes, and templates. It has no organization or public sharing audience; use Pastebin when you want a shareable link.'],
]);
article('20-public-pages.md', 'Opening Shared Links', 'public-pages', 'Understand sign-in requirements for short links, secret reveals, and public pastes.', 20, `
## Short links

Public short links redirect without sign-in. Personal short links require the creator's account; shared organization links require the creator or a signed-in member of the linked organization. Sign in to Olio first, then reopen a restricted link.

If a link appears unavailable, it may be deleted or your account may not have access. Ask the sender to check its audience or provide a current link. The destination website may require a separate sign-in. See [URL Shortener](olio://help/url-shortener).

## One-time secret links

Open the link, then choose **Reveal secret** when ready. Opening the page alone does not consume it. A recipient's successful reveal uses the one-time viewing; refreshing or reopening will not reveal the message again.

The creator can preview an unconsumed, unexpired secret while signed in to the account that created it. That preview does not consume the recipient's viewing. The same person using a different account or a signed-out browser counts as a recipient.

Anyone holding the secret link can reveal it before expiry; no recipient sign-in is required. If it was already viewed, expired, or deleted, ask the sender for a new one. See [Secret Sharing](olio://help/secret-sharing).

## Paste links

A paste page shows its title, language label, and text. Choose **Copy** to copy the content.

Public pastes are readable without signing in. For a personal or organization paste, sign in to an account with access, then reopen the link. Copying a paste link does not change its audience. If the paste is expired or missing, ask its creator for a replacement.

## Browse public pastes

**View All** in Pastebin opens the public list at **/p**; **/pastes** also opens this list. It shows publicly shared pastes, newest first, with previews and view counts. Choose **Load More** to browse further. This list is not a private paste archive.

A public paste is discoverable by other visitors. Choose its audience carefully in [Pastebin](olio://help/pastebin).
`);
article('21-plugins-and-classdash.md', 'Plugins and ClassDash', 'plugins-and-classdash', 'Filter your week, edit classes, import a schedule, and set campus locations.', 21, `
## Install and open ClassDash

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

Use separate entries when a course's lecture and lab have different times or locations. **Back to schedule** or the close button leaves the editor without saving. The trash button on a class asks for confirmation before removing it.

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

These are estimates based on map-pin distance and walking pace, not live route or traffic directions. Check both home and classroom pins if the estimate looks wrong. **You're clear** means there are no upcoming classes in the next week; check days, times, and semester dates if that is unexpected.

## Show, hide, or uninstall

On Home, choose **Customize dashboard → Elements** to show or hide ClassDash. Drag and resize its card on a wide screen.

To uninstall, open **Plugins & Dashboard**, choose **Uninstall**, and confirm. Your saved schedule is kept for reinstalling. See [Home Dashboard](olio://help/home-dashboard) for layout controls.
`);
edit('22-my-tasks.md', [
  ['Use the delete action to remove a task you no longer need. Check the item first.', 'Use the delete action to remove a task you no longer need. It deletes immediately without a confirmation, so check the item first.'],
  ['My Tasks is your personal checklist.', 'On narrow screens, the task control may show a checklist icon and count instead of the My Tasks label. Close the task panel with its close button or Escape.\n\nMy Tasks is your personal checklist.'],
]);
edit('23-olio-launcher.md', [
  ['Choose **Deny** for an unrecognized request.', 'Approval grants the connected device read-only access to your private Quick Pastes and its connection status. It cannot create, edit, delete, reorder, favorite, or share your saved data.\n\nChoose **Deny** for an unrecognized request.'],
]);

article('24-help-center.md', 'Using the Help Center', 'help-center', 'Search guides, filter topics, jump to a section, and share an article.', 23, `
## Find a guide

Open **Help Center** from the navigation menu or **Utilities**, or visit **/help**. Published guides are available without signing in.

Enter a tool or task in **Search help articles**, such as “ClassDash” or “short links.” Search matches article titles, summaries, and topic names, rather than every word in the article body. Use a shorter phrase if you do not find the guide you need.

Choose a topic to narrow the library or **All guides** to browse everything. Editing your search resets the topic filter. Use **Clear search** or **Show all guides** to start over.

## Read and share

Open an article and use **In this guide** to jump to a section. On a smaller screen, expand that control above the article. Follow related guides under **Keep exploring**, or choose **Browse all guides** to return to the library.

Copy the article's address from your browser to share it. After choosing a section, its address can include a section anchor. Links to other help articles remain available only while those articles are published.

## When something is missing

If loading fails, check your connection and choose **Try again**. **This guide isn't available** can mean the article was unpublished, removed, or the address is incorrect. Return to the library and search for the current guide.

Some instructions require an organization role, an installed plugin, or application administrator access. Check the relevant guide if a control is absent. An organization admin is not automatically an application administrator.

If a guide no longer matches what you see, send your app administrator the article title and the step that needs correction. Administrators can maintain guides through [Application Administration](olio://help/application-administration).
`);
article('25-application-administration.md', 'Application Administration', 'application-administration', 'Manage accounts, banners, operational data, help publishing, and administrative reviews.', 24, `
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
`);
