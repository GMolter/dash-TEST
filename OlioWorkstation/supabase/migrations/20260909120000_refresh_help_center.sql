-- Refresh maintained articles; retain IDs, publication choices, and unrelated custom articles.
INSERT INTO public.help_articles (slug,title,summary,content,is_published,sort_order) VALUES
('getting-started','Getting Started with Olio Workstation','Learn what Olio Workstation is, how to create your account, and how to sign in for the first time.','## 🔎 Table of Contents

1. [🧩 What is Olio Workstation?](olio://help-anchor/what-is-olio-workstation)
2. [📋 What You''ll Need](olio://help-anchor/what-you-ll-need)
3. [✍️ Creating an Account](olio://help-anchor/creating-an-account)
4. [🔑 Signing In](olio://help-anchor/signing-in)
5. [⚠️ Common Sign-In Issues](olio://help-anchor/common-sign-in-issues)
6. [➡️ What Happens Next](olio://help-anchor/what-happens-next)
7. [💡 Your first workspace](olio://help-anchor/your-first-workspace)

---

# 🚀 Getting Started with Olio Workstation

Welcome to **Olio Workstation** — your all-in-one productivity dashboard for managing tasks, projects, bookmarks, and team resources. Everything your team needs is consolidated into a single, organized workspace.

---

## 🧩 What is Olio Workstation?

Olio Workstation is a team productivity platform that brings together:

- **Quick Links** — a personal bookmark manager
- **URL Shortener** — shorten and track links
- **Secret Sharing** — send one-time messages
- **QR Code Generator** — generate scannable codes instantly
- **Pastebin** — share code and text snippets
- **Projects** — full project management with boards, planners, files, and resources
- **Triggers** — webhook automation

Everything is tied to your **organization**, so your team shares the same workspace.

---

## 📋 What You''ll Need

Before you begin, make sure you have:

- A valid **email address**
- A **password** (minimum 6 characters)

> 💡 **Tip:** If you''re joining an existing team, ask your organization owner for the 4-digit **organization invite code** before you start — you''ll need it right after creating your account.

---

## ✍️ Creating an Account

1. Open Olio Workstation in your browser
2. Click the **Sign Up** tab on the welcome screen
3. Enter your **Display Name** (optional, but recommended)
4. Enter your **Email Address**
5. Enter a **Password** (at least 6 characters)
6. Confirm your password in the **Confirm Password** field
7. Click **Create Account**

If there are any errors (mismatched passwords, email already in use), they will appear inline beneath the form.

> 💡 **Tip:** Check for typing mistakes and extra spaces in your email address. Passwords are case-sensitive.

---

## 🔑 Signing In

If you already have an account:

1. Click the **Sign In** tab on the welcome screen
2. Enter your **Email Address**
3. Enter your **Password**
4. Click **Sign In**

You will be taken directly to the dashboard if you already belong to an organization, or to the organization setup screen if you''re new.

---

## ⚠️ Common Sign-In Issues

| Problem | Solution |
|:--------|:---------|
| "Invalid login credentials" | Double-check your email and password — passwords are case-sensitive |
| Forgot password | Contact your system administrator (self-serve reset is not currently available) |
| Account not found | You may need to create a new account with the **Sign Up** tab |
| Password rejected on sign-up | Make sure your password is at least 6 characters long |

> ⚠️ **Warning:** There is currently no self-service password reset. Keep your credentials stored safely.

---

## ➡️ What Happens Next

After your first successful sign-in, you will be taken to the **Organization Setup** screen. From there you can:

- **Join** an existing organization using a 4-digit invite code
- **Create** a new organization and become its Owner

See the [Organizations — Joining and Creating](olio://help/organizations) article for full instructions on this step.

---

## 💡 Your first workspace

After signing in, finish organization setup if prompted, then open Home. Use the navigation drawer for Utilities, Organization, Profile, Help Center, and plugin access. Personal Quick Links, Quick Pastes, and dashboard preferences belong to your account.

If your account requires a password change, complete that screen before continuing. See [Home Dashboard](olio://help/home-dashboard) to arrange your workspace.',true,1),
('organizations','Organizations — Joining and Creating','Understand how organizations work in Olio Workstation and how to join an existing one or create your own.','## 🔎 Table of Contents

1. [🧩 What is an Organization?](olio://help-anchor/what-is-an-organization)
2. [🤝 Joining an Existing Organization](olio://help-anchor/joining-an-existing-organization)
3. [🆕 Creating a New Organization](olio://help-anchor/creating-a-new-organization)
4. [🔗 Shared Quick Links](olio://help-anchor/shared-quick-links)
5. [👥 Roles Explained](olio://help-anchor/roles-explained)
6. [🔄 Switching Organizations](olio://help-anchor/switching-organizations)
7. [❓ FAQ](olio://help-anchor/faq)
8. [💡 Personal and team work](olio://help-anchor/personal-and-team-work)

---

# 🏢 Organizations — Joining and Creating

Every user in Olio Workstation belongs to an **organization**. Your organization is your shared workspace — it determines who you collaborate with and controls access to shared features like links, projects, secrets, and triggers.

---

## 🧩 What is an Organization?

An organization is a group that shares:

- **Projects** (accessible by all members)
- **Shared Quick Links** (organization-wide bookmarks)
- **URL Shortener** links (org-scoped)
- **Secrets** and **Pastebin** content (depending on scope settings)
- **Triggers/Webhooks**

> 💡 **Tip:** You must belong to an organization to access most features. The organization setup screen appears automatically after your first login.

---

## 🤝 Joining an Existing Organization

If your team already has an Olio Workstation organization, you can join it with a 4-digit invite code:

1. On the **Organization Setup** screen, select **Join Organization**
2. Enter the **4-digit invite code** provided by your team
3. Click **Join Organization**
4. You will immediately be added as a **Member** and taken to the dashboard

> ⚠️ **Warning:** The invite code must be exactly 4 digits (numbers only). If you receive an error, confirm the code with your organization owner — the code may have changed.

---

## 🆕 Creating a New Organization

If you''re starting fresh or setting up a workspace for your team:

1. On the **Organization Setup** screen, select **Create Organization**
2. Enter a name for your organization in the **Organization Name** field
3. Click **Create Organization**
4. You will be taken to the dashboard as the **Owner** of the new org

Your organization will be assigned a unique 4-digit invite code automatically. Share this code with teammates so they can join.

> 💡 **Tip:** Open **Organization** to view your team and the management controls available to your role.

---

## 🔗 Shared Quick Links

The **Shared Links** tab on the Organization page contains bookmarks intended for everyone in the organization. Any link created from this tab is shared automatically.

Personal links are created under **Utilities → Quick Links** and appear only on that user''s dashboard. Moving shared-link creation into the Organization page keeps personal and team bookmarks clearly separated.

---

## 👥 Roles Explained

Every member of an organization has one of three roles:

| Role | Description | Key Permissions |
|:-----|:------------|:----------------|
| **Owner** | The creator of the organization | Full access; can manage members, rename the org, and delete it |
| **Admin** | Organization administrator | Can access permitted organization management actions |
| **Member** | Standard user | Can access all shared features; cannot manage members |

---

## 🔄 Switching Organizations

You can only belong to **one organization at a time**. To switch:

1. Go to **Profile Settings**
2. Click **Leave Organization**
3. Confirm by typing your organization name
4. You will be returned to the **Organization Setup** screen
5. Join or create a different organization

> ⚠️ **Warning:** Leaving an organization is immediate and irreversible through the UI. You will need a new invite code to re-join.

---

## ❓ FAQ

> **Q: What happens if I enter the wrong invite code?**
> An error message will appear. Your account is not affected — simply re-enter the correct code and try again.

> **Q: Can I be in multiple organizations at the same time?**
> No. Each account belongs to exactly one organization at a time. You must leave your current org before joining another.

> **Q: What happens to my data if I leave an organization?**
> Personal data (your personal Quick Links, pastes marked personal-only) remains associated with your account. Shared org content stays with the organization.

---

## 💡 Personal and team work

Create personal bookmarks in **Utilities → Quick Links** and team bookmarks in **Organization → Shared Links**. Joining a team does not turn your private Quick Pastes into shared content.

Owners and admins can access management controls according to their permissions. Ask an owner for the current invite code when joining fails.',true,2),
('home-dashboard','Home Dashboard Overview','A tour of the main dashboard — the greeting widget, personal Quick Links, tasks, and navigation drawer.','## 🔎 Table of Contents

1. [👋 Greeting and Date/Time Widget](olio://help-anchor/greeting-and-date-time-widget)
2. [⚡ Quick Links on the Home View](olio://help-anchor/quick-links-on-the-home-view)
3. [🧭 Navigation Drawer](olio://help-anchor/navigation-drawer)
4. [📢 Organization Banner](olio://help-anchor/organization-banner)
5. [🎨 Customizing the Look](olio://help-anchor/customizing-the-look)
6. [💡 Arrange and restore your dashboard](olio://help-anchor/arrange-and-restore-your-dashboard)

---

# 🏠 Home Dashboard Overview

The **Home Dashboard** is the first screen you see after logging in. It gives you an at-a-glance view of your workspace and serves as the launchpad for everything in Olio Workstation.

---

## 👋 Greeting and Date/Time Widget

At the top of the dashboard you''ll find a real-time greeting that adapts to the time of day:

| Time Range | Greeting |
|:-----------|:---------|
| 5:00 AM – 11:59 AM | Good morning |
| 12:00 PM – 4:59 PM | Good afternoon |
| 5:00 PM – 8:59 PM | Good evening |
| 9:00 PM – 4:59 AM | Good night |

The current **date and time** are displayed and update live — no refresh needed.

Your organization name appears at the top of the navigation drawer.

---

## ⚡ Quick Links on the Home View

The main content area of the Home Dashboard displays only your **personal Quick Links**. Shared organization links are kept in **Organization → Shared Links** so the dashboard stays focused on your own shortcuts.

On desktop, cards occupy a customizable canvas. Smaller screens use a compact arrangement.

From the home view you can:

- **Click any link** to open it in a new tab
- **Expand folders** to reveal grouped links inside

> 💡 **Tip:** Open links from Home and use dashboard edit mode to arrange or hide their cards. To add, edit, or reorder links, navigate to **Utilities → Quick Links**. See the [Quick Links](olio://help/quick-links) article for full details.

---

## 🧭 Navigation Drawer

Use the floating menu button in the top-left corner to open the navigation drawer. It gives you access to every section of Olio Workstation without moving the page content:

| Section | Purpose |
|:--------|:--------|
| `Home` | Return to the dashboard |
| `Utilities` | Access all built-in tools |
| `Organization` | View and manage your org |
| `Profile` | Account settings and theme |
| `Help Center` | Browse documentation and guides |

The drawer starts closed on every screen. Click outside it, press **Escape**, or use its close button to dismiss it.

Open the Projects Center from the **Projects** tile inside **Utilities**.

---

## 📢 Organization Banner

If a banner has been configured, it appears as a highlighted strip at the top of the screen. Banners are used for important notices, maintenance alerts, or team announcements.

Banners are configured by your site administrator and appear automatically when active.

---

## 🎨 Customizing the Look

Olio Workstation supports two animated background themes and four color presets. To change your theme:

1. Open the menu and go to **Profile**
2. Click **Customize**
3. Pick a theme (Dynamic Waves or Contour Drift) and a color preset (Indigo, Ocean, Teal, or Sunset)
4. Your selection is applied immediately and saved

See [Profile and Settings](olio://help/profile-and-settings) for the full theme guide.

---

## 💡 Arrange and restore your dashboard

Enter dashboard edit mode to move cards, resize them on supported desktop layouts, or hide individual elements such as the QR shortcut. Open **Dashboard elements** to show or hide whole groups and restore hidden cards. **Undo** and **Redo** apply to layout edits during the current session; **Reset dashboard** restores the default arrangement.

Your saved positions, sizes, hidden cards, module visibility, plugin installation state, and personal Quick Links are cached on this browser for subsequent tabs. The dashboard checks for current account data in the background. With no saved browser cache, a placeholder appears while configuration loads. ClassDash uses its saved slot and shows a placeholder when its data is unavailable.

A layout-save warning means the browser has kept your layout but account synchronization did not finish. Keep the tab open and resolve the reported error before expecting another device to match. Clearing browser site data removes this local head start; the next load retrieves account data again.

See [Plugins and ClassDash](olio://help/plugins-and-classdash) for schedule setup.',true,3),
('utilities-hub','Utilities Hub','Discover all available tools from the Utilities Hub grid and learn how to navigate to each one.','## 🔎 Table of Contents

1. [🧩 What is the Utilities Hub?](olio://help-anchor/what-is-the-utilities-hub)
2. [🗂️ Available Tools](olio://help-anchor/available-tools)
3. [🔍 Navigating to a Tool](olio://help-anchor/navigating-to-a-tool)
4. [📌 Quick Access from Home](olio://help-anchor/quick-access-from-home)
5. [💡 Descriptions and dashboard shortcuts](olio://help-anchor/descriptions-and-dashboard-shortcuts)

---

# 🛠️ Utilities Hub

---

## 🧩 What is the Utilities Hub?

The **Utilities Hub** is your central launchpad for all of Olio Workstation''s built-in tools. Open it from `Utilities` in the navigation drawer to see every tool in a clean, tile-based grid.

---

## 🗂️ Available Tools

Olio Workstation includes the following utilities:

| Tool | What It Does | Article |
|:-----|:-------------|:--------|
| **Quick Links** | Manage personal bookmarks in organized folders | [Quick Links](olio://help/quick-links) |
| **URL Shortener** | Shorten long URLs with optional custom codes and track click counts | [URL Shortener](olio://help/url-shortener) |
| **Secret Sharing** | Send one-time messages that self-destruct after being viewed | [Secret Sharing](olio://help/secret-sharing) |
| **QR Code Generator** | Generate QR codes from any text or URL and download as PNG | [QR Code Generator](olio://help/qr-code-generator) |
| **Quick Pastes** | Manage private reusable text available only to your account | [Quick Pastes](olio://help/quick-pastes) |
| **Pastebin** | Share code and text snippets with a language label and expiry options | [Pastebin](olio://help/pastebin) |
| **Triggers** | Create webhook triggers to connect Olio Workstation to external services | [Triggers and Webhooks](olio://help/triggers-and-webhooks) |

---

## 🔍 Navigating to a Tool

To open any tool:

1. Open the menu and click **Utilities**
2. The Hub grid will appear with all available tools
3. Click any tool tile to open it directly

The selected tool will load in the main content area. You can return to the Hub with its back control or by choosing **Utilities** from the navigation drawer.

> 💡 **Tip:** You can toggle tool descriptions on or off in the Hub view. Look for the **Show Descriptions** button near the top of the grid to see a one-line summary of each tool.

---

## 📌 Quick Access from Home

**Quick Links** is the only utility directly embedded on the Home Dashboard. All other tools require navigating to the Utilities Hub first.

> 💡 **Tip:** If you use a particular tool constantly, consider adding it as a Quick Link so you can access it with one click from the home screen.

---

## 💡 Descriptions and dashboard shortcuts

Use **Show Descriptions** or **Hide Descriptions** to change the tool tiles; this preference persists in this browser. Dashboard shortcuts open the same tools. Hiding a shortcut only removes its dashboard card, so you can still open the tool through Utilities.

Quick Pastes is for private reusable text; Pastebin creates shareable pastes. Plugins such as ClassDash have their own setup and dashboard controls.',true,4),
('quick-links','Quick Links — Bookmark Manager','Create personal bookmarks and manage organization-wide shared links from their dedicated workspaces.','## 🔎 Table of Contents

1. [🧩 What are Quick Links?](olio://help-anchor/what-are-quick-links)
2. [➕ Adding a Link](olio://help-anchor/adding-a-link)
3. [👥 Shared Quick Links](olio://help-anchor/shared-quick-links)
4. [📁 Creating a Folder](olio://help-anchor/creating-a-folder)
5. [✏️ Editing and Deleting](olio://help-anchor/editing-and-deleting)
6. [↕️ Drag-and-Drop Reordering](olio://help-anchor/drag-and-drop-reordering)
7. [📂 Expanding Folders](olio://help-anchor/expanding-folders)
8. [✅ Quick-Start Checklist](olio://help-anchor/quick-start-checklist)
9. [💡 Dashboard layout and link management](olio://help-anchor/dashboard-layout-and-link-management)

---

# 🔗 Quick Links — Bookmark Manager

---

## 🧩 What are Quick Links?

**Quick Links** is Olio Workstation''s bookmark manager. Personal links appear on your dashboard and can be organized into folders. Shared links live in the Organization page and are available to everyone in that organization.

---

## ➕ Adding a Link

1. Navigate to **Utilities → Quick Links**
2. Click **+ Add Link**
3. Fill in the **Title** (what the link will be labeled)
4. Paste or type the **URL**
5. Choose an **Emoji Icon** to visually identify the link
6. Optionally select a **Folder** to place it in
7. Click **Save**

The link is personal automatically and will appear immediately in your personal grid and on the dashboard. There is no visibility selector in this form.

> 💡 **Tip:** Use descriptive titles rather than raw URLs — `Team Figma` is much easier to scan than `figma.com/file/abc123xyz`.

---

## 👥 Shared Quick Links

To create a link for everyone in your organization:

1. Open the menu and go to **Organization**
2. Select the **Shared Links** tab
3. Click **+ Add Link**
4. Enter the icon, title, and URL
5. Click **Save**

Links created there are shared automatically and do not appear on personal dashboards. Shared links use a flat list rather than personal folders.

---

## 📁 Creating a Folder

Personal folders help you group related links together:

1. Click **+ Folder**
2. Enter a **Folder Name**
3. Choose an **Emoji Icon** for the folder
4. Click **Save**

The folder will appear as a tile in the grid. Click it to expand or collapse the links inside.

---

## ✏️ Editing and Deleting

To edit a link or folder:

1. Click the **pencil (edit) icon** that appears when you hover over a tile
2. Update any fields
3. Click **Save**

To delete a link or folder:

1. Click the **pencil icon** to enter edit mode
2. Click the **trash icon** on the item you want to remove
3. Confirm deletion

> ⚠️ **Warning:** Deleting a folder removes the folder and **all links inside it**. This cannot be undone.

---

## ↕️ Drag-and-Drop Reordering

To reorder links or folders in the grid:

1. Hover over a tile until the **grip handle** appears
2. Click and hold the grip handle
3. Drag the tile to its new position
4. Release to drop

Reordering is saved automatically.

> 💡 **Tip:** Folders can be reordered just like individual links — drag the entire folder tile to a new position.

---

## 📂 Expanding Folders

Click any **folder tile** to expand it and reveal the links inside. Click it again to collapse. Folder state (open or closed) persists while you stay on the page.

---

## ✅ Quick-Start Checklist

Use this checklist to get Quick Links set up:

- [ ] Create a folder for your most-used links (e.g., `Work`, `Dev Tools`)
- [ ] Add your most-visited URLs with descriptive titles
- [ ] Add emoji icons to make tiles visually distinct
- [ ] Drag tiles into the order you want them
- [ ] Add team-wide bookmarks from **Organization → Shared Links**

---

## 💡 Dashboard layout and link management

Manage link titles, destinations, icons, folders, and order in **Utilities → Quick Links**. Use **Organization → Shared Links** for team bookmarks. The dashboard has its own card positions and sizes: arranging a card there does not rewrite the bookmark URL.

Saved links and folders are restored from browser cache while current data loads. If a change made on another device has not appeared yet, allow the background refresh to finish. Hiding a dashboard card does not delete the saved link.',true,5),
('url-shortener','URL Shortener','Shorten long URLs with optional custom codes, copy them instantly, and track how many times they''ve been clicked.','## 🔎 Table of Contents

1. [🧩 What is the URL Shortener?](olio://help-anchor/what-is-the-url-shortener)
2. [✂️ Creating a Short URL](olio://help-anchor/creating-a-short-url)
3. [📋 Copying Your Short URL](olio://help-anchor/copying-your-short-url)
4. [📊 Click Tracking](olio://help-anchor/click-tracking)
5. [🗑️ Deleting a Short URL](olio://help-anchor/deleting-a-short-url)
6. [⚠️ Custom Code Rules](olio://help-anchor/custom-code-rules)
7. [🌐 How Redirects Work](olio://help-anchor/how-redirects-work)
8. [💡 Check a saved short link](olio://help-anchor/check-a-saved-short-link)

---

# 🔗 URL Shortener

---

## 🧩 What is the URL Shortener?

The **URL Shortener** lets you turn any long URL into a compact, shareable link that points back to your Olio Workstation instance. All shortened URLs are scoped to your organization and include click tracking.

---

## ✂️ Creating a Short URL

1. Navigate to **Utilities → URL Shortener**
2. Paste or type the **destination URL** into the input field
3. Optionally enter a **Custom Code** (e.g., `q1-report` or `team-docs`)
4. Click **Shorten**
5. Your new short URL will appear in the list below

If you leave the **Custom Code** field empty, a random 6-character alphanumeric code is generated automatically.

> 💡 **Tip:** Custom codes make your short URLs more memorable and easier to share verbally. For example, `yourapp.com/team-docs` is cleaner than `yourapp.com/xK93pL`.

---

## 📋 Copying Your Short URL

Click the **copy icon** next to any short URL in the list to copy the full link to your clipboard. The link is in the format:

```text
https://your-domain.com/short-code
```

The copied URL is ready to paste into emails, messages, or documents.

---

## 📊 Click Tracking

Every short URL displays a **click count** that increments each time someone follows the link. This lets you gauge how often a resource is being accessed.

| Column | Description |
|:-------|:------------|
| Short Code | The unique identifier for the link |
| Destination | The original long URL |
| Clicks | Total number of times the link has been followed |
| Created | When the short URL was created |

Click counts reset to zero only if the short URL is deleted and recreated.

---

## 🗑️ Deleting a Short URL

1. Click the **trash icon** next to the short URL you want to remove
2. Confirm deletion in the dialog
3. The short URL is immediately deactivated

> ⚠️ **Warning:** Once deleted, the short code is no longer active. Anyone who clicks the old link will see a "not found" page. The code itself becomes available for reuse.

---

## ⚠️ Custom Code Rules

Custom codes must follow these rules:

- **Alphanumeric only** — letters and numbers, no spaces or special characters
- **Unique within your organization** — no two short URLs can share the same code
- **Case-sensitive** — `TeamDocs` and `teamdocs` are treated as different codes

If you try to use a code that''s already taken, an error message will appear. Choose a different code and try again.

---

## 🌐 How Redirects Work

Short URLs are **publicly accessible** — no login is required to follow them. When someone visits a short URL:

1. The system looks up the short code
2. If found, the visitor is immediately redirected to the destination URL
3. The click counter increments by one
4. If the code is not found, a "not found" error page is shown

> 💡 **Tip:** Because short URLs are public, avoid creating short codes that point to sensitive internal resources without additional authentication on the destination.

See [Public Pages](olio://help/public-pages) for more detail on how the redirect page works.

---

## 💡 Check a saved short link

After creating a link, use its copy action and verify the destination in a separate tab. A custom code must be available; use another code if creation fails.

Deleting a saved short URL makes future visits to that code fail. A QR image that contains the deleted short URL will still scan, but its destination will no longer resolve.',true,6),
('secret-sharing','Secret Sharing — One-Time Links','Create expiring secret links and understand what happens when a recipient opens one.','## 🔎 Table of Contents

1. [✍️ Create a link](olio://help-anchor/create-a-link)
2. [👁️ Opening a secret](olio://help-anchor/opening-a-secret)
3. [⏰ Expiry and reuse](olio://help-anchor/expiry-and-reuse)
4. [🔐 Handling the content](olio://help-anchor/handling-the-content)

---

# 🔒 Secret Sharing — One-Time Links

## ✍️ Create a link

1. Open **Utilities → Secret Sharing**.
2. Enter the message.
3. Choose an expiry: 1 hour, 6 hours, 24 hours, 3 days, or 7 days.
4. Create the secret and use its copy action to copy the link.

The link uses `/s/secret-code`. The list shows the code, viewed status, and expiry. Use its copy action again if you need the link later.

## 👁️ Opening a secret

The page checks the code, expiry, and viewed status. An available secret displays immediately on opening, and the page marks it viewed. There is no separate reveal confirmation. Later visits show an unavailable-secret message.

> 💡 **Tip:** Leave the first opening for your recipient. Opening the link yourself can consume that view.

## ⏰ Expiry and reuse

Expired links display an error. You cannot extend an existing secret through the creation form; create a new one when more time is needed. The page blocks viewed and expired secrets, but this is not a guarantee that the stored content has been physically deleted.

## 🔐 Handling the content

Anyone with an available link may open it, and recipients can copy what they see. The current creation form sends content to the service; it does not provide browser-side or end-to-end encryption. Choose content and a delivery channel accordingly.

See [Public Pages](olio://help/public-pages) for other shared-link formats.',true,7),
('qr-code-generator','QR Code Generator','Generate QR codes from any text or URL instantly and download them as PNG images.','## 🔎 Table of Contents

1. [🧩 What is the QR Code Generator?](olio://help-anchor/what-is-the-qr-code-generator)
2. [🖊️ Generating a QR Code](olio://help-anchor/generating-a-qr-code)
3. [📥 Downloading Your QR Code](olio://help-anchor/downloading-your-qr-code)
4. [💡 Tips for Best Results](olio://help-anchor/tips-for-best-results)
5. [🗂️ Common Use Cases](olio://help-anchor/common-use-cases)
6. [💡 Generation and dashboard visibility](olio://help-anchor/generation-and-dashboard-visibility)

---

# 📷 QR Code Generator

The **QR Code Generator** lets you instantly convert any text or URL into a scannable QR code image, which you can download and use in print materials, presentations, or digital displays.

---

## 🧩 What is the QR Code Generator?

A QR code is a square barcode that smartphones and tablets can scan with their camera to instantly open a URL, view text, or trigger an action. Olio Workstation''s generator creates standard QR codes from any input you provide.

---

## 🖊️ Generating a QR Code

1. Navigate to **Utilities → QR Code Generator**
2. Type or paste your **text or URL** into the input field
3. The QR code **preview updates live** as you type — no need to click a button
4. Review the preview to confirm the code looks correct

That''s it — your QR code is ready as soon as you finish typing.

> 💡 **Tip:** Test-scan your QR code before distributing it. Point your phone''s camera app at the preview on screen to confirm it resolves correctly.

---

## 📥 Downloading Your QR Code

1. Once satisfied with the preview, click **Download PNG**
2. The QR code image saves to your browser''s default download folder as a `.png` file
3. Use the image in any design tool, document, or presentation

The downloaded image has a white background and is suitable for print and digital use.

---

## 💡 Tips for Best Results

> 💡 **Tip:** Keep your input as short as possible. QR codes with shorter content have larger, easier-to-scan squares. Dense codes (from very long URLs) can be harder to scan.

| Input Length | Scan Reliability |
|:-------------|:----------------:|
| Short (< 50 chars) | Excellent |
| Medium (50–150 chars) | Good |
| Long (150–300 chars) | Fair |
| Very long (300+ chars) | May be difficult |

**If your URL is long:**

1. Use the **URL Shortener** tool first to create a compact short URL
2. Paste the short URL into the QR Code Generator
3. The resulting QR code will be much cleaner and easier to scan

---

## 🗂️ Common Use Cases

| Use Case | Example Input |
|:---------|:-------------|
| Link to a webpage | `https://yoursite.com/team-docs` |
| Share a shortened link | `https://yourapp.com/team` |
| Display contact info | Name, email, and phone number as plain text |
| Wi-Fi credentials | `WIFI:T:WPA;S:NetworkName;P:Password;;` |
| Event or meeting note | Plain text with time, location, and details |

---

## 💡 Generation and dashboard visibility

Enter text or a full URL, choose **Generate QR Code**, then **Download QR Code** to save the PNG. Generation uses the external QR service at api.qrserver.com, so the entered content is sent to that service and an internet connection is required.

Scan the downloaded image before distributing it. To hide only the Home shortcut, use dashboard edit mode and hide the QR card; the generator remains available in Utilities.',true,8),
('pastebin','Pastebin — Code and Text Snippets','Save and share code snippets and text with a language label, expiration options, and visibility controls.','## 🔎 Table of Contents

1. [🧩 What is Pastebin?](olio://help-anchor/what-is-pastebin)
2. [➕ Creating a Paste](olio://help-anchor/creating-a-paste)
3. [🌍 Visibility and Scope](olio://help-anchor/visibility-and-scope)
4. [🎨 Language Label](olio://help-anchor/language-label)
5. [⏳ Expiry Options](olio://help-anchor/expiry-options)
6. [👁️ View Counter](olio://help-anchor/view-counter)
7. [🔗 Sharing a Paste](olio://help-anchor/sharing-a-paste)
8. [🗑️ Deleting a Paste](olio://help-anchor/deleting-a-paste)
9. [📋 Browsing Pastes](olio://help-anchor/browsing-pastes)
10. [💡 Choose the audience before creating](olio://help-anchor/choose-the-audience-before-creating)

---

# 📄 Pastebin — Code and Text Snippets

**Pastebin** lets you save and share code snippets, configuration files, notes, or any block of text. Unlike a plain text file, pastes support **a language label**, **expiry timers**, and **visibility scopes** — giving you control over who sees your content and for how long.

> 💡 **Quick Pastes are different:** Use [Quick Pastes](olio://help/quick-pastes) for private, reusable personal text that does not need a URL, audience, expiry, or view count. Pastebin remains the sharing tool.

---

## 🧩 What is Pastebin?

Olio Workstation''s Pastebin is a quick way to:

- Share a config file or code snippet with a teammate
- Save a useful snippet for future reference
- Publish a paste publicly so anyone with the link can view it
- Give a paste a short lifespan so it disappears after a set time

---

## ➕ Creating a Paste

1. Navigate to **Utilities → Pastebin**
2. Click **+ New Paste**
3. Enter a **Title** for the paste
4. Paste or type your **content** in the editor
5. Choose a **Language** for a language label (or select `Plain Text`)
6. Set an **Expiry** duration
7. Select the **Scope** (visibility)
8. Click **Save**

Your paste is created immediately and a shareable link is generated.

---

## 🌍 Visibility and Scope

Every paste has a scope that controls who can see it:

| Scope | Who Can See It | Notes |
|:------|:--------------:|:------|
| **Personal** | Only you | Private drafts, personal reference snippets |
| **Organization** | All org members | Shared internal resources |
| **Public** | Anyone with the link | No login required to view |

> ⚠️ **Warning:** Public pastes are accessible to anyone with the link — no login required. Never put passwords, API keys, or sensitive data in a public paste.

---

## 🎨 Language Label

Choosing a language applies **a language label** to the paste when viewed. Supported languages include:

- JavaScript / TypeScript
- Python
- Bash / Shell
- JSON
- HTML / CSS
- SQL
- Markdown
- Java, C, C++, Go, Rust, and more
- Plain Text (no highlighting)

> 💡 **Tip:** If your language isn''t listed, use `Plain Text` — the content will still be displayed in a monospace font and can be copied easily.

---

## ⏳ Expiry Options

| Option | Duration | Use Case |
|:-------|:--------:|:---------|
| Never | Permanent | Reference snippets you want to keep indefinitely |
| 1 Hour | 60 minutes | Temporary scratch pads |
| 24 Hours | 1 day | Day-of sharing |
| 7 Days | 1 week | Short-term team resources |
| 30 Days | 30 days | Monthly review materials |

Once a paste expires, the link will show an expiration error and the content is removed.

---

## 👁️ View Counter

Every paste has a **view counter** that increments each time the paste''s public URL is loaded. This lets you see how many times a paste has been accessed.

The view counter appears in the paste list and on the individual paste page.

---

## 🔗 Sharing a Paste

1. Click the **copy icon** next to a paste in the list
2. The full paste URL is copied to your clipboard:

```text
https://your-domain.com/p/paste-code
```

3. Share this link with your recipient

Public pastes can be viewed without logging in. Personal and org-scoped pastes require the recipient to be logged in and a member of your organization.

---

## 🗑️ Deleting a Paste

1. Click the **trash icon** next to the paste you want to remove
2. Confirm deletion
3. The paste and its link are permanently removed

> ⚠️ **Warning:** Deletion is permanent. The paste code cannot be recovered or reused.

---

## 📋 Browsing Pastes

The Pastebin tool shows your **most recent 5 pastes** by default. To browse further:

- Filter by **Personal**, **Organization**, or **Public** using the scope tabs
- Visit the public **Paste List** page (`/pastes`) to see all public pastes from all users

See [Public Pages](olio://help/public-pages) for details on the public paste list.

---

## 💡 Choose the audience before creating

Review the Personal, Organization, and Public audience controls before saving. Public access makes a paste available through its public link; adding a private audience does not cancel public access. Select at least one audience and choose the expiry deliberately.

For reusable text that should stay private and does not need a URL, use [Quick Pastes](olio://help/quick-pastes).',true,9),
('projects-center','Projects Center — Managing Your Projects','Create, search, filter, and manage all of your projects from the Projects Center.','## 🔎 Table of Contents

1. [🧩 What is the Projects Center?](olio://help-anchor/what-is-the-projects-center)
2. [➕ Creating a Project](olio://help-anchor/creating-a-project)
3. [📋 Templates Explained](olio://help-anchor/templates-explained)
4. [🔍 Searching and Filtering](olio://help-anchor/searching-and-filtering)
5. [🏷️ Project Statuses](olio://help-anchor/project-statuses)
6. [⚙️ Project Settings](olio://help-anchor/project-settings)
7. [🗃️ Archiving vs Deleting](olio://help-anchor/archiving-vs-deleting)
8. [💡 Tips](olio://help-anchor/tips)
9. [💡 Find the right project](olio://help-anchor/find-the-right-project)

---

# 📂 Projects Center — Managing Your Projects

The **Projects Center** is your home for all project management in Olio Workstation. From here you can create new projects, browse existing ones, filter by status, and open any project to dive into its board, planner, files, and resources.

---

## 🧩 What is the Projects Center?

Projects are the primary unit of work in Olio Workstation. Each project is a self-contained workspace that includes:

- A **Board** for kanban-style task management
- A **Planner** for linear step-by-step planning
- A **Files** tab for documents and file uploads
- A **Resources** tab for external link libraries
- An **Overview** tab with stats and progress

Projects belong to your organization, so all org members can access and collaborate on them.

---

## ➕ Creating a Project

1. Open the menu and select **Utilities**
2. Select the **Projects** tile
3. Click **New Project**
4. Enter a **Project Name**
5. Optionally add a **Description** and **Tags**
6. Choose a **Template** (see below)
7. Click **Create**

Your new project opens immediately.

> 💡 **Tip:** Tags are a great way to cross-reference projects. Use consistent tags like `q1`, `client-name`, or `internal` to make filtering easier.

---

## 📋 Templates Explained

| Template | What It Pre-Configures |
|:---------|:-----------------------|
| **Blank** | Empty board and planner — build from scratch |
| **Personal** | Board columns: Backlog, In Progress, Done |
| **School** | Board columns: To Do, In Progress, Grading, Complete |

You can rename, add, or remove columns after creating a project regardless of which template you chose.

---

## 🔍 Searching and Filtering

The Projects Center toolbar lets you narrow down your project list:

- **Search bar** — type any part of a project name to filter instantly
- **Status filter** — use the dropdown to show only projects with a specific status
- **Sort options** — sort by Recent (last modified), Name (A-Z), or Status

Filters apply immediately with no page reload needed.

---

## 🏷️ Project Statuses

| Status | Color | Meaning |
|:-------|:-----:|:--------|
| **Planning** | 🔵 Blue | Scoping and preparation phase |
| **Active** | 🟢 Green | Currently in progress |
| **Review** | 🟡 Yellow | Under review or awaiting feedback |
| **Completed** | ✅ Teal | Finished work |
| **Archived** | ⬜ Gray | Inactive; hidden from main view by default |

Change a project''s status from within the project''s settings panel.

---

## ⚙️ Project Settings

Inside any project, you can:

- **Rename** the project from the header
- **Change the status** using the status badge dropdown
- **Add or remove tags** from the project details panel
- **Update the description** for context

Settings changes take effect immediately.

---

## 🗃️ Archiving vs Deleting

| Action | What It Does | Reversible? |
|:-------|:------------|:-----------:|
| **Archive** | Sets status to `Archived`; hides from default view | ✅ Yes |
| **Delete** | Permanently removes the project and all its data | ❌ No |

> ⚠️ **Warning:** Deleting a project destroys all associated board cards, planner steps, files, and resources. This cannot be undone. Use **Archive** when in doubt.

---

## 💡 Tips

> 💡 **Tip:** Use the `Archived` status as a soft-delete. You can always filter by Archived to find and restore old projects by changing their status back to Active.

> 💡 **Tip:** Tags don''t have a fixed list — type anything you want. Just be consistent across projects so your filters stay useful.

---

## 💡 Find the right project

Open **Utilities → Projects**, select a project, then choose Overview, Board, Planner, Files, or Resources. Project search helps you navigate its contents and actions.

Use project settings to edit its name, description, or status. Review the confirmation carefully before deleting a project; archiving is a status change, while deletion removes the project.',true,10),
('project-overview','Project Overview Tab','Understand your project at a glance with stats cards, progress bars, and suggested actions.','## 🔎 Table of Contents

1. [🧩 What is the Overview Tab?](olio://help-anchor/what-is-the-overview-tab)
2. [📈 Stats Cards](olio://help-anchor/stats-cards)
3. [📉 Progress Bars](olio://help-anchor/progress-bars)
4. [💡 Suggested Actions](olio://help-anchor/suggested-actions)
5. [🧭 Quick Navigation](olio://help-anchor/quick-navigation)
6. [🤖 AI Plan Generation](olio://help-anchor/ai-plan-generation)
7. [💡 Continue into project tools](olio://help-anchor/continue-into-project-tools)

---

# 📊 Project Overview Tab

The **Overview Tab** is the first thing you see when you open a project. It aggregates data from all other project tabs into a single at-a-glance dashboard, giving you a snapshot of progress, workload, and where to focus next.

---

## 🧩 What is the Overview Tab?

The Overview Tab answers three questions:

1. **How much work exists?** (Stats Cards)
2. **How much is done?** (Progress Bars)
3. **What should I do next?** (Suggested Actions)

It doesn''t store any data of its own — everything displayed is pulled live from your Board, Planner, Files, and Resources tabs.

---

## 📈 Stats Cards

Four stat cards summarize the scope of your project:

| Card | What It Shows |
|:-----|:-------------|
| **Board Cards** | Total open cards across all board columns |
| **Planner Steps** | Total steps in the planner (excluding archived) |
| **Files** | Total documents and uploaded files |
| **Resources** | Total external links saved |

Each card shows both a **completed count** and a **total count** where applicable (e.g., `5 / 12 cards complete`).

---

## 📉 Progress Bars

The overall project progress is a **weighted combination** of two metrics:

| Source | Weight |
|:-------|:------:|
| Board card completion | 70% |
| Planner step completion | 30% |

The combined score determines the **progress label**:

| Score | Label |
|:-----:|:------|
| 80%+ | Strong momentum |
| 50–79% | Steady progress |
| Below 50% | Needs focus |

> 💡 **Tip:** The board carries more weight in the progress calculation because it typically tracks day-to-day tasks. Use the planner for milestone-level tracking.

---

## 💡 Suggested Actions

Below the progress bars, the system suggests where to direct your attention based on current workload:

- If you have many **open board cards**, it recommends focusing on the Board
- If you have many **incomplete planner steps**, it recommends the Planner
- If all steps and cards are complete, it surfaces a congratulatory message

These suggestions are heuristic — use them as a prompt, not a directive.

---

## 🧭 Quick Navigation

Each **stat card is clickable**. Clicking a card jumps you directly to the corresponding tab:

| Card | Navigates To |
|:-----|:------------|
| Board Cards | Board Tab |
| Planner Steps | Planner Tab |
| Files | Files Tab |
| Resources | Resources Tab |

This makes the Overview a fast navigation hub for large projects.

---

## 🤖 AI Plan Generation

The Overview Tab surfaces the **Generate AI Plan** option if your project doesn''t yet have planner steps. Clicking it opens the AI plan generation interface in the Planner tab.

See the [Project Planner](olio://help/project-planner) article for full details on AI plan generation, including usage limits.

---

## 💡 Continue into project tools

Use Overview for project context, then open **Board** for task lanes, **Planner** for dates, **Files** for documents and attachments, or **Resources** for reference links.

Project status and task progress are separate. Update the project status in settings when its overall phase changes.',true,11),
('project-board','Project Board — Kanban Task Management','Manage tasks visually with drag-and-drop columns and cards, priorities, due dates, and assignees.','## 🔎 Table of Contents

1. [🧩 What is the Project Board?](olio://help-anchor/what-is-the-project-board)
2. [➕ Adding a Column](olio://help-anchor/adding-a-column)
3. [🃏 Adding a Card](olio://help-anchor/adding-a-card)
4. [✏️ Editing a Card](olio://help-anchor/editing-a-card)
5. [🎯 Priority Levels](olio://help-anchor/priority-levels)
6. [↕️ Drag-and-Drop](olio://help-anchor/drag-and-drop)
7. [✅ Completing Cards](olio://help-anchor/completing-cards)
8. [🗃️ Archiving Cards and Columns](olio://help-anchor/archiving-cards-and-columns)
9. [✅ Quick-Start Checklist](olio://help-anchor/quick-start-checklist)
10. [💡 Task details and lanes](olio://help-anchor/task-details-and-lanes)

---

# 🗂️ Project Board — Kanban Task Management

The **Board Tab** is a visual kanban-style task tracker. Work is represented as **cards** organized into **columns** (called lanes). Move cards between columns as work progresses to reflect the current state of every task at a glance.

---

## 🧩 What is the Project Board?

A kanban board models work as items moving through stages — typically from left to right. Default columns created from templates are:

- **To Do** — work not yet started
- **In Progress** — work actively being done
- **Done** — completed work

You can rename, add, remove, and reorder columns to fit any workflow.

---

## ➕ Adding a Column

1. Scroll to the rightmost column on the Board
2. Click **+ Add Lane**
3. Type the column **Name**
4. Press **Enter** or click the confirm button

The new column appears at the right end of the board. You can drag it to reposition it.

---

## 🃏 Adding a Card

1. Click the **+** button at the top or bottom of any column
2. Enter the card **Title**
3. Click **Save** (or press Enter for a quick save)

The card appears in the column immediately. Click it to add more details.

---

## ✏️ Editing a Card

Click any card to open its **detail panel**. You can edit:

| Field | Description |
|:------|:------------|
| **Title** | The name of the task |
| **Description** | Rich text notes (supports markdown) |
| **Priority** | Visual urgency indicator (see below) |
| **Due Date** | When the task should be completed |
| **Assignee** | The name of the person responsible |
| **Completed** | Toggle to mark the card done manually |

All changes are saved automatically as you type.

---

## 🎯 Priority Levels

| Priority | Color | When to Use |
|:---------|:-----:|:------------|
| **None** | ⚪ Gray | Default; no urgency indicator |
| **Low** | 🔵 Blue | Nice to have; not blocking |
| **Medium** | 🟡 Yellow | Normal priority; should be done soon |
| **High** | 🔴 Red | Urgent or blocking other work |

Priority colors appear on the card tile so you can spot urgent items at a glance without opening the detail panel.

---

## ↕️ Drag-and-Drop

**Moving cards between columns:**
1. Click and hold a card
2. Drag it to the target column
3. Release to drop

**Reordering cards within a column:**
Drag a card up or down within the same column to change its position.

**Reordering columns:**
Click and hold the column header, then drag the entire column left or right.

All positions are saved automatically after each drag operation.

---

## ✅ Completing Cards

Cards count toward the project''s progress in two ways:

1. **Automatic:** Cards in a column named `Done` (or any column whose name contains "done" or "complete") are automatically counted as complete
2. **Manual:** Toggle the **Completed** checkbox in the card detail panel

Completed cards contribute to the [Project Overview](olio://help/project-overview) progress bar.

> 💡 **Tip:** Rename your "Done" column to anything containing the word "done" or "complete" and cards inside it will still count as complete automatically.

---

## 🗃️ Archiving Cards and Columns

**Archiving a card** removes it from the board view but keeps the data:
1. Open the card detail panel
2. Click the **Archive** option
3. The card disappears from the board but its data is preserved

**Archiving a column** hides the entire lane:
1. Click the column''s **options menu** (⋯)
2. Select **Archive Column**
3. All cards in the column are also archived

> ⚠️ **Warning:** Archived cards no longer count toward progress metrics. Archive carefully.

---

## ✅ Quick-Start Checklist

Get your board set up in minutes:

- [ ] Rename default columns to match your workflow
- [ ] Add a **High priority** card for the most urgent task
- [ ] Assign cards to team members with the Assignee field
- [ ] Set due dates on time-sensitive cards
- [ ] Drag a card to `In Progress` when work starts

---

## 💡 Task details and lanes

Open a task to edit its description, priority, due date, or assignee name. Available priorities are None, Low, Medium, and High. Use lanes to represent the stages that suit your project.

After a move or edit, check for a save error before leaving the page. Planner and Board work with the same project tasks, so confirm dates in Planner when scheduling work.',true,12),
('project-planner','Project Planner — Step-by-Step Task Tracking','Plan your project as an ordered sequence of steps with due dates, completion tracking, and AI plan generation.','## 🔎 Table of Contents

1. [🧩 What is the Project Planner?](olio://help-anchor/what-is-the-project-planner)
2. [➕ Adding a Step](olio://help-anchor/adding-a-step)
3. [✅ Completing Steps](olio://help-anchor/completing-steps)
4. [↕️ Reordering Steps](olio://help-anchor/reordering-steps)
5. [📅 Due Dates](olio://help-anchor/due-dates)
6. [🤖 AI Plan Generation](olio://help-anchor/ai-plan-generation)
7. [🗑️ Archiving Steps](olio://help-anchor/archiving-steps)
8. [📊 Planner vs Board](olio://help-anchor/planner-vs-board)
9. [💡 Review generated plans](olio://help-anchor/review-generated-plans)

---

# 📅 Project Planner — Step-by-Step Task Tracking

The **Planner Tab** models your project as an **ordered sequence of steps** — like a recipe or a checklist. Unlike the Board (which handles parallel streams of work), the Planner is designed for linear, milestone-style planning where order matters.

---

## 🧩 What is the Project Planner?

Use the Planner when your project has a clear sequence — when Step 2 can''t start until Step 1 is done. Each step can have a title, description, and due date. Steps display in order and can be reordered by drag-and-drop.

> 💡 **Tip:** Use the Planner for **milestones** (design approved, backend complete, user testing done) and the Board for **day-to-day tasks** that run in parallel.

---

## ➕ Adding a Step

1. Click **+ Add Step**
2. Enter a **Title** for the step
3. Optionally add a **Description** with context, notes, or links
4. Optionally set a **Due Date**
5. Click **Save**

The step appears at the bottom of the list. Drag it to reposition if needed.

---

## ✅ Completing Steps

Click the **circle icon** to the left of a step title to toggle completion:

- ⭕ Empty circle = incomplete
- ✅ Filled circle = complete

Completed steps are shown with a strikethrough and contribute to the project''s overall progress (30% weighting). See [Project Overview](olio://help/project-overview) for details.

---

## ↕️ Reordering Steps

1. Hover over a step to reveal the **grip handle** on the left
2. Click and hold the grip handle
3. Drag the step up or down to its new position
4. Release to drop

Order is saved automatically.

---

## 📅 Due Dates

Each step can have an optional **due date**. Steps with passed due dates display a **visual overdue indicator** (typically a red or orange highlight) to draw attention.

> ⚠️ **Warning:** Due dates are informational only — no automatic notifications are sent when a step is overdue. Check the Planner regularly to catch slipping timelines.

---

## 🤖 AI Plan Generation

The Planner can generate an initial set of steps using AI based on your project''s name and description.

### How to Generate a Plan

1. Click **Generate Plan** (available from the Planner tab or Project Overview)
2. Review the AI-suggested steps (titles, descriptions, and recommended due dates)
3. Accept steps you want to keep, or discard suggestions
4. Accepted steps are added to your Planner automatically

### Usage Limits

AI plan generation is limited to **5 generations per project**.

> 💡 **Tip:** Write a detailed **project description** before generating a plan — the AI uses it to produce more relevant and specific steps.

---

## 🗑️ Archiving Steps

Steps can be **archived** without deletion:

1. Click the options menu (⋯) on a step
2. Select **Archive**
3. The step is hidden from the Planner view

Archived steps are **excluded from the progress calculation** — they don''t count as complete or incomplete.

> 💡 **Tip:** Archive steps that turned out to be unnecessary. This keeps your progress metrics accurate without permanently deleting the record.

---

## 📊 Planner vs Board

| Feature | Planner | Board |
|:--------|:-------:|:-----:|
| Order matters | ✅ Yes | ❌ Not necessarily |
| Parallel work | ❌ Linear | ✅ Yes |
| Visual columns | ❌ | ✅ |
| AI generation | ✅ | ❌ |
| Best for | Milestones & phases | Day-to-day tasks |

Use both together for the most complete picture of your project.

---

## 💡 Review generated plans

When using the AI planning controls, describe your goal and review the proposed tasks and dates before applying them. Check any usage limit shown for the project; access can vary by project configuration.

Use ordinary task editing to correct titles, descriptions, and dates after planning. Do not treat a generated schedule as a verified deadline.',true,13),
('project-files','Project Files — Documents and File Tree','Create documents, organize folders, write rich markdown, upload files, and link between project items.','## 🔎 Table of Contents

1. [🧩 What is the Files Tab?](olio://help-anchor/what-is-the-files-tab)
2. [📂 Creating Folders](olio://help-anchor/creating-folders)
3. [📝 Creating a Document](olio://help-anchor/creating-a-document)
4. [✏️ The Markdown Editor](olio://help-anchor/the-markdown-editor)
5. [🔗 Internal Cross-Linking](olio://help-anchor/internal-cross-linking)
6. [📎 File Uploads](olio://help-anchor/file-uploads)
7. [🗂️ File Tree Navigation](olio://help-anchor/file-tree-navigation)
8. [↕️ Moving Files and Folders](olio://help-anchor/moving-files-and-folders)
9. [🗑️ Deleting Files](olio://help-anchor/deleting-files)
10. [💡 Tips](olio://help-anchor/tips)
11. [💡 Choose a destination for new files](olio://help-anchor/choose-a-destination-for-new-files)

---

# 📁 Project Files — Documents and File Tree

The **Files Tab** is a hierarchical document workspace inside each project. It supports rich markdown documents, organized folders, and file uploads — all in one place. You can also cross-link between documents, board cards, planner steps, and resources using Olio''s internal link system.

---

## 🧩 What is the Files Tab?

The Files Tab contains two types of items:

| Type | Description |
|:-----|:------------|
| **Document** | A rich markdown file you write and edit in the browser |
| **Upload** | An external file (image, PDF, etc.) attached to the project |

Both live in the same **file tree** and can be organized into folders.

---

## 📂 Creating Folders

1. Right-click anywhere in the file tree, or click the **toolbar icon** for New Folder
2. Select **New Folder**
3. Enter a **Folder Name**
4. Press Enter or click **Confirm**

Folders appear in the tree and can be expanded or collapsed by clicking them.

---

## 📝 Creating a Document

**Standard document:**

1. Click **New Doc** in the file tree toolbar
2. A new untitled document is created and opened in the editor
3. Click the document name at the top to rename it

**Quick Note:**

Click **Quick Note** to create a timestamped draft document instantly — useful for capturing ideas without stopping to name and organize the file.

> 💡 **Tip:** Create a document named `README` at the root of your file tree to summarize the project for collaborators.

---

## ✏️ The Markdown Editor

Documents use a **rich markdown editor**. Supported formatting includes:

| Element | Syntax |
|:--------|:-------|
| Headings | `# H1` through `###### H6` |
| Bold | `**bold**` |
| Italic | `*italic*` |
| Inline code | `` `code` `` |
| Code block | ```` ```language ```` |
| Bullet list | `- item` |
| Numbered list | `1. item` |
| Blockquote | `> text` |
| Table | `\| col \| col \|` |
| Horizontal rule | `---` |
| Checkbox | `- [ ] task` / `- [x] done` |

Changes save automatically as you type.

---

## 🔗 Internal Cross-Linking

You can link between any items inside your project (or to help center articles) using `olio://` links.

**Using the Link Picker:**

1. Position your cursor in the editor where you want a link
2. Right-click to open the **context menu** and select **Insert Link**, or use the toolbar link button
3. The **Link Picker Modal** opens — search for and select a target:
   - Help Center articles and anchors
   - Project files and documents
   - Board cards
   - Planner steps
   - Project resources
4. The link is inserted automatically in the correct format

**Example internal link syntax:**

```markdown
[See the design spec](olio://file/file-id)
[Review card](olio://board_card/card-id)
```

When viewing a document, internal links open the target directly within the project context. Hover over a link to see a **preview tooltip**.

---

## 📎 File Uploads

To upload a file (image, PDF, spreadsheet, etc.):

1. Click the **Upload** button in the file tree toolbar
2. Select a file from your computer, or drag and drop it onto the file tree panel
3. The file appears in the tree with a file-type icon

Uploaded files can be viewed and downloaded from within the project. Images display inline when referenced in a document.

---

## 🗂️ File Tree Navigation

- **Click** a document to open it in the editor
- **Click** a folder to expand or collapse it
- **Right-click** any item to open the **context menu** (rename, move, delete)
- Use the **breadcrumb** at the top of the editor to navigate up the folder hierarchy

---

## ↕️ Moving Files and Folders

**By drag-and-drop:**

1. Click and hold a file or folder in the tree
2. Drag it over the target folder
3. Release to move it

**By context menu:**

1. Right-click the item
2. Select **Move**
3. Choose the destination folder

---

## 🗑️ Deleting Files

1. Right-click the file or folder in the tree
2. Select **Delete**
3. Confirm deletion in the dialog

> ⚠️ **Warning:** Deletion is permanent and cannot be undone. Deleting a folder removes all documents and subfolders inside it. There is no trash or recycle bin.

---

## 💡 Tips

> 💡 **Tip:** Use a `README` doc at the root of your project''s file tree to describe the project structure and link to key documents — this helps new collaborators get oriented quickly.

> 💡 **Tip:** Use Quick Notes to capture ideas during a meeting, then organize them into proper documents afterward.

---

## 💡 Choose a destination for new files

Select the intended folder before creating a document or uploading an attachment. Use the file tree and context menu to rename, move, and organize entries. Quick notes let you capture text without leaving the project.

Before deleting a folder, check its contents. A link to a removed document or attachment may no longer open.',true,14),
('project-resources','Project Resources — External Link Library','Organize external links for your project by category — documentation, design, tools, and more.','## 🔎 Table of Contents

1. [🧩 What is the Resources Tab?](olio://help-anchor/what-is-the-resources-tab)
2. [➕ Adding a Resource](olio://help-anchor/adding-a-resource)
3. [🏷️ Categories](olio://help-anchor/categories)
4. [✏️ Editing a Resource](olio://help-anchor/editing-a-resource)
5. [🗑️ Deleting a Resource](olio://help-anchor/deleting-a-resource)
6. [🌐 Opening Links](olio://help-anchor/opening-links)
7. [💡 Tips](olio://help-anchor/tips)
8. [💡 Resource categories](olio://help-anchor/resource-categories)

---

# 🔗 Project Resources — External Link Library

The **Resources Tab** is a curated library of **external links** relevant to your project. Use it to collect documentation, design files, reference articles, development tools, and any other URL your team returns to repeatedly.

---

## 🧩 What is the Resources Tab?

Resources differs from the Files Tab in one key way:

| | Files Tab | Resources Tab |
|:-|:---------|:--------------|
| Content type | Documents you create or upload | External URLs you link to |
| Lives in | Olio Workstation | An external website |
| Best for | Project documentation, notes | Specs, APIs, design tools, references |

> 💡 **Tip:** Use the Files Tab for content you own and edit. Use the Resources Tab for content hosted elsewhere that your team needs to reference.

---

## ➕ Adding a Resource

1. Click **+ Add Resource**
2. Enter a **Title** (how the link will be labeled)
3. Paste or type the **URL**
   - If you omit `https://`, it will be added automatically
4. Optionally add a **Description** for context
5. Select a **Category** from the dropdown
6. Click **Save**

The resource card appears in the grid immediately. If the URL points to a site with a favicon, the icon loads automatically.

---

## 🏷️ Categories

Categories group your resources into logical sections:

| Category | Icon | Typical Use |
|:---------|:-----:|:------------|
| **Documentation** | 📄 | API docs, wikis, official guides |
| **Design** | 🎨 | Figma files, style guides, mockups |
| **Reference** | 📖 | Articles, blog posts, tutorials |
| **Tool** | 🔧 | Online tools, utilities, converters |
| **Code** | 💻 | GitHub repos, CodeSandbox, Replit |
| **Quick Links** | ⚡ | High-priority links surfaced at the top |
| **Other** | 📎 | Anything that doesn''t fit elsewhere |

Filter the Resources view by category using the category tabs above the grid.

---

## ✏️ Editing a Resource

1. Click the **three-dot menu** (⋯) on any resource card
2. Select **Edit**
3. Update any fields
4. Click **Save**

All fields are editable including the URL and category.

---

## 🗑️ Deleting a Resource

1. Click the **three-dot menu** (⋯) on the resource card
2. Select **Delete**

> ⚠️ **Warning:** Deletion is immediate — there is no confirmation dialog. The resource is removed instantly.

---

## 🌐 Opening Links

Click anywhere on a resource card (outside the menu button) to open the link in a **new browser tab**. The original resource card stays in place — you won''t lose your place in the Resources view.

Favicons are automatically fetched from the destination site and displayed on the card to make resources easier to identify visually.

---

## 💡 Tips

> 💡 **Tip:** Use the **Quick Links** category to surface your most important resources at the top of the view. They appear in a highlighted section separate from other categories.

> 💡 **Tip:** Add a **Description** to resources that aren''t self-explanatory from the title alone — this saves teammates from clicking through to figure out what a link is for.

---

## 💡 Resource categories

Give each resource a recognizable title and full destination URL. Categories include Documentation, Design, Reference, Tool, Code, Quick Links, and Other. A short description helps teammates choose the right reference.

Editing a resource changes its saved reference; it does not edit the external website. Confirm the external destination still allows your teammates access.',true,15),
('organization-management','Organization Management','Understand roles, manage members, and find shared organization links.','## 🔎 Table of Contents

1. [👥 Roles and access](olio://help-anchor/roles-and-access)
2. [⚙️ Manage members](olio://help-anchor/manage-members)
3. [🔗 Share links](olio://help-anchor/share-links)
4. [🚪 Leave or delete](olio://help-anchor/leave-or-delete)

---

# 🏢 Organization Management

## 👥 Roles and access

Open **Organization** from the navigation drawer. Overview provides organization and membership context; **Shared Links** contains team bookmarks. **Manage** appears when your permissions allow organization management.

| Role | Access |
|:-----|:-------|
| Owner | Organization ownership and permitted management actions |
| Admin | Permitted member-management actions |
| Member | Shared features without management controls |

## ⚙️ Manage members

Open **Manage** and find the intended member. Use **Promote** to change a member to admin or **Demote** to change an admin to member. Owner accounts do not use these ordinary role controls. Use the removal action only after checking the selected member.

## 🔗 Share links

Create and organize team bookmarks in **Shared Links**. Personal bookmarks remain in **Utilities → Quick Links**. Ask your owner for the current organization invite code when inviting someone to join.

## 🚪 Leave or delete

Open **Profile** for the available organization actions. Leaving removes your membership; you need the current invite code to rejoin. Organization deletion is restricted to the owner and requires the confirmation shown in the interface.

See [Profile and Settings](olio://help/profile-and-settings) for account and organization controls.',true,16),
('profile-and-settings','Profile and Settings','Update your account info, customize the app theme, manage your organization membership, and sign out.','## 🔎 Table of Contents

1. [👤 Accessing Profile Settings](olio://help-anchor/accessing-profile-settings)
2. [🪪 Account Information](olio://help-anchor/account-information)
3. [💻 Olio Launcher Devices](olio://help-anchor/olio-launcher-devices)
4. [🎨 Theme Customization](olio://help-anchor/theme-customization)
5. [🎭 Themes Explained](olio://help-anchor/themes-explained)
6. [🌈 Color Presets](olio://help-anchor/color-presets)
7. [🚪 Leaving an Organization](olio://help-anchor/leaving-an-organization)
8. [🗑️ Deleting an Organization](olio://help-anchor/deleting-an-organization)
9. [🔓 Signing Out](olio://help-anchor/signing-out)
10. [💡 Dashboard and plugin preferences](olio://help-anchor/dashboard-and-plugin-preferences)

---

# ⚙️ Profile and Settings

The **Profile page** is where you manage your personal account settings, customize the app''s appearance, and control your organization membership. Navigate here by opening the menu and selecting **Profile**.

---

## 👤 Accessing Profile Settings

Open the navigation drawer and click **Profile**. The floating menu is available from every signed-in section of the app.

---

## 🪪 Account Information

The Account section displays:

- Your **display name**
- Your **email address**
- Your current **organization** and **role**

Account details are currently read-only in the UI. Contact your system administrator if you need to update your email address.

---

## 💻 Olio Launcher Devices

The **Olio Launcher devices** section lists active launchers approved for your account.
It shows only safe metadata: device name, connected time, and last-used time. Removed
devices do not remain in this list. Credential values, pairing codes, hashes, and
internal security fields are never shown.

To remove a device:

1. Find its recognizable device name.
2. Choose **Remove**.
3. Review the warning and choose **Remove launcher**. Cancel if you selected the wrong
   device.
4. Confirm the device card disappears.

Removal immediately blocks later authenticated launcher operations and clears Quick
Pastes when the launcher observes the invalid credential. The device row, stored
credential hash, and completed pairing history are deleted together; the old credential
stays blocked because there is no matching device record. Reconnect from launcher
Settings if you still control the device. A newly approved launcher may read your private
Quick Pastes; an older connection may require disconnect and fresh approval because its
access is not silently broadened.

Do not share pairing codes or screenshots containing account information. Support will
never ask for your password, Supabase session, authorization header, device credential,
access token, private messages, financial information, or other sensitive content.

---

## 🎨 Theme Customization

Olio Workstation''s animated background is fully customizable. To change your theme:

1. Click **Customize**
2. The theme modal opens with a live preview
3. Select a **Theme** (background animation style)
4. Select a **Color Preset** (color palette)
5. Your selection applies immediately — no save button needed
6. Close the modal when satisfied

Your theme preference is saved to your browser and persists between sessions.

---

## 🎭 Themes Explained

| Theme | Description |
|:------|:------------|
| **Dynamic Waves** | Smooth, flowing wave animations that drift across the background |
| **Contour Drift** | A topographic contour-map pattern that slowly shifts and flows |

Both themes support all four color presets.

---

## 🌈 Color Presets

| Preset | Color Palette Description |
|:-------|:--------------------------|
| **Indigo** | Deep purple and blue tones — the default classic look |
| **Ocean** | Teal-to-blue gradient with a cool, aquatic feel |
| **Teal** | Bright green-cyan — fresh and high-contrast |
| **Sunset** | Warm red, orange, and purple — vibrant and bold |

> 💡 **Tip:** Try the **Sunset** preset with **Contour Drift** for a striking look that''s easy to distinguish from other Olio Workstation windows at a glance.

---

## 🚪 Leaving an Organization

If you want to leave your current organization and join or create a different one:

1. Scroll to the **Organization** section on the Profile page
2. Click **Leave Organization**
3. A confirmation dialog appears — type your **organization name** exactly as shown
4. Click **Confirm**

You will immediately lose access to all shared org resources and be redirected to the organization setup screen.

> ⚠️ **Warning:** Leaving an organization is **immediate and irreversible** through the UI. Your personal data is retained, but you must receive a new invite code to rejoin the organization.

---

## 🗑️ Deleting an Organization

> ⚠️ **Warning:** This option is only available to the **Owner** of the organization. Deleting an organization **permanently destroys all shared data** — all shared projects, resources, links, secrets, and pastes created by all members. This cannot be undone.

To delete your organization:

1. Scroll to the **Danger Zone** section on the Profile page
2. Click **Delete Organization**
3. In the confirmation dialog:
   - Type the **organization name** exactly
   - Check the **acknowledgment checkbox**
4. Click **Delete Permanently**

All members are immediately removed from the organization and returned to the setup screen.

---

## 🔓 Signing Out

To sign out of Olio Workstation:

1. On the Profile page, click **Sign Out**
2. You are immediately logged out and redirected to the sign-in screen

Your session is terminated and your browser credentials are cleared.

---

## 💡 Dashboard and plugin preferences

Use dashboard edit mode for individual card positions, sizes, and visibility, and plugin controls for installation and dashboard availability. These preferences are separate from the background theme.

Choose **Customize** to open **Customize App Background**. Theme and color preferences persist in the browser. See [Home Dashboard](olio://help/home-dashboard) and [Plugins and ClassDash](olio://help/plugins-and-classdash) for the layout controls.',true,17),
('triggers-and-webhooks','Triggers and Webhooks','Set up webhook triggers to connect Olio Workstation to external services like Slack, CI pipelines, and automation tools.','## 🔎 Table of Contents

1. [🧩 What are Triggers?](olio://help-anchor/what-are-triggers)
2. [➕ Creating a Trigger](olio://help-anchor/creating-a-trigger)
3. [🔀 HTTP Methods](olio://help-anchor/http-methods)
4. [▶️ Testing a Trigger](olio://help-anchor/testing-a-trigger)
5. [✏️ Editing a Trigger](olio://help-anchor/editing-a-trigger)
6. [🗑️ Deleting a Trigger](olio://help-anchor/deleting-a-trigger)
7. [🕐 Last Triggered Timestamp](olio://help-anchor/last-triggered-timestamp)
8. [🔐 Security Notes](olio://help-anchor/security-notes)
9. [💡 Delivery and troubleshooting](olio://help-anchor/delivery-and-troubleshooting)

---

# ⚡ Triggers and Webhooks

**Triggers** let you connect Olio Workstation to external services by making HTTP requests on demand. Use them to post a message to Slack, kick off a CI/CD pipeline, call an automation endpoint, or trigger any service that accepts webhooks.

---

## 🧩 What are Triggers?

A Trigger is a saved HTTP request configuration — a name, a URL, and a method. When you fire a trigger, Olio Workstation sends the request to the configured URL immediately. All triggers are shared within your organization.

Common use cases:

- 📣 Post a message to a **Slack** or **Teams** channel
- 🔁 Start a **GitHub Actions** or **CircleCI** build
- 🤖 Trigger an **n8n**, **Zapier**, or **Make** automation
- 🔔 Hit a **notification endpoint** (PagerDuty, OpsGenie, etc.)

---

## ➕ Creating a Trigger

1. Navigate to **Utilities → Triggers** (found in the Utilities Hub)
2. Click **+ New Trigger**
3. Enter a **Name** — something descriptive like `Deploy to Staging` or `Notify Slack`
4. Enter the **Webhook URL** — the full endpoint URL including any query parameters
5. Choose the **HTTP Method** (POST or GET)
6. Optionally add a **Description** explaining what the trigger does and when to use it
7. Click **Save**

The trigger appears in the list and is immediately ready to use.

---

## 🔀 HTTP Methods

| Method | When to Use |
|:-------|:------------|
| **POST** | Most webhooks — sends a JSON request body to the endpoint |
| **GET** | Simple HTTP pings that don''t require a request body |

When using POST, the trigger sends a JSON body with basic metadata:

```json
{
  "triggered_at": "2026-09-09T10:30:00Z"
}
```

Check your webhook service''s documentation to confirm which method it expects.

---

## ▶️ Testing a Trigger

To fire a trigger immediately:

1. Find the trigger in the list
2. Click the **Play button** (▶️) next to it
3. Olio Workstation sends the HTTP request right away
4. Check your external service to confirm receipt

> 💡 **Tip:** Use the Test button during setup to verify your webhook URL is correct before sharing the trigger with your team.

The `last_triggered_at` timestamp updates after a successful trigger response.

---

## ✏️ Editing a Trigger

1. Click the **pencil (edit) icon** next to the trigger
2. Update any fields (name, URL, method, description)
3. Click **Save**

All changes apply immediately. Existing firing history (the timestamp) is preserved.

---

## 🗑️ Deleting a Trigger

1. Click the **trash icon** next to the trigger
2. Confirm deletion in the dialog
3. The trigger is permanently removed

> ⚠️ **Warning:** Deletion is permanent. Any automations or bookmarks that reference this trigger''s configuration will need to be updated manually.

---

## 🕐 Last Triggered Timestamp

Every trigger displays a **Last Triggered** field showing when the trigger was last fired. This is useful for:

- Confirming a trigger was actually sent
- Debugging if a webhook delivery was missed
- Auditing when automations ran

The timestamp is in your local timezone and updates in real time after each fire.

---

## 🔐 Security Notes

> ⚠️ **Warning:** Webhook URLs often contain **API keys, tokens, or secrets** embedded directly in the URL. Because triggers are visible to all organization members, avoid using webhooks that grant broad permissions.

Best practices:

- Use webhook URLs with **narrow, single-purpose permissions** (e.g., a Slack webhook that only posts to one channel)
- Rotate webhook tokens regularly
- Do not share trigger lists or screenshots in public channels
- Prefer **POST** over **GET** for endpoints that perform actions — GET requests may be logged in server access logs without authentication

---

## 💡 Delivery and troubleshooting

Firing a trigger sends a real request from your browser. For POST, the current payload contains **triggered_at**; GET does not include a body. The endpoint must accept the selected method and browser cross-origin requests.

The last-triggered timestamp is updated after a successful response. A failed request does not confirm delivery, and retrying may repeat an action if the destination processed the earlier request. Inspect the destination before repeating a consequential trigger.',true,18),
('quick-pastes','Quick Pastes — Private Reusable Text','Create, organize, search, and reorder private reusable text for your signed-in account.','## 🔎 Table of Contents

1. [Quick Pastes and Pastebin](olio://help-anchor/quick-pastes-and-pastebin)
2. [Create or edit](olio://help-anchor/create-or-edit)
3. [Organize and find](olio://help-anchor/organize-and-find)
4. [Use Quick Pastes in Olio Launcher](olio://help-anchor/use-quick-pastes-in-olio-launcher)
5. [Delete](olio://help-anchor/delete)
6. [Recover from an error](olio://help-anchor/recover-from-an-error)
7. [💡 Fast access from Home](olio://help-anchor/fast-access-from-home)

---

# Quick Pastes — Private Reusable Text

Quick Pastes keeps reusable text in a private list available only to your signed-in
account. It does not create a link or share content with an organization or the public.

> ⚠️ **Testing safety:** Use harmless sample text. Do not enter passwords, access tokens,
> private messages, financial information, or other sensitive content for a test.

## Quick Pastes and Pastebin

Use **Quick Pastes** when you want private text to reuse later. Use **Pastebin** when you
need a shareable resource with a URL, audience, expiry, or view count. The two utilities
store separate records and changing one does not change the other.

## Create or edit

1. Open **Utilities → Quick Pastes**.
2. Choose **New Quick Paste**.
3. Enter a title and non-empty content. A category is optional.
4. Choose **Create Quick Paste**.
5. Use the pencil action on a saved item to edit it without changing its position.

Titles may contain up to 120 characters, content up to 20,000 characters, and categories
up to 60 characters.

## Organize and find

- Use the star to favorite or unfavorite an item.
- Use the up/down actions to set your preferred order. Clear search and category filters
  first; reordering is disabled while only part of the list is visible.
- Search checks the title, content, and category in your private loaded list.
- Choose a category to show only matching items.
- Duplicate makes a private copy at the end of the list.

Your order remains after refresh. Quick Paste content is not saved in browser storage.

## Use Quick Pastes in Olio Launcher

A freshly approved Olio Launcher can read your private list. Open **Quick Pastes** there
to synchronize, search, choose a saved category or **Favorites** from the Category
selector, refresh, copy, or explicitly paste into the application that was active before
the launcher.

The launcher is read-only. Create, edit, delete, reorder, duplicate, and change favorites
here in Workstation. Its synchronized list exists only in launcher memory; it has no
offline cache and clears on disconnect, revocation, or exit. An older approved launcher
may ask for a new approval because existing device access is not silently broadened.

## Delete

Choose the trash action, review the permanent-deletion warning, then confirm. Cancel if
you selected the wrong item. A deleted Quick Paste cannot be recovered.

## Recover from an error

If loading fails, check your connection and choose **Try again**. If saving fails, the
form stays open so you can retry. Do not paste the content into a support message or
diagnostic log.

---

## 💡 Fast access from Home

Open Quick Pastes from its dashboard shortcut or **Utilities → Quick Pastes**. Hiding the shortcut does not remove your saved text. Quick Paste content is intentionally excluded from persistent browser dashboard caches.

Approve an Olio Launcher connection from your own account to use its read-only Quick Pastes features. Manage connected launchers in Profile; editing the source text remains a Workstation action.',true,10),
('public-pages','Public Pages — URLs, Secrets, and Pastes','Understand how public-facing URL redirects, one-time secret views, and paste views work — no login required.','## 🔎 Table of Contents

1. [🧩 What are Public Pages?](olio://help-anchor/what-are-public-pages)
2. [🔀 URL Redirect](olio://help-anchor/url-redirect)
3. [🔒 Secret View Page](olio://help-anchor/secret-view-page)
4. [📄 Paste View Page](olio://help-anchor/paste-view-page)
5. [📋 Public Paste List](olio://help-anchor/public-paste-list)
6. [🔐 Privacy Reminder](olio://help-anchor/privacy-reminder)
7. [💡 Access and expired links](olio://help-anchor/access-and-expired-links)

---

# 🌐 Public Pages — URLs, Secrets, and Pastes

Several features in Olio Workstation generate **publicly accessible URLs** — links that anyone can open without logging in. This article explains how each type of public page works.

> ⚠️ **Warning:** Content shared via public pages is accessible to **anyone with the link** — no login required. Treat these links as if they were public.

---

## 🧩 What are Public Pages?

Olio Workstation has three types of public pages:

| Page Type | URL Pattern | Created By |
|:----------|:-----------:|:----------:|
| **URL Redirect** | `/short-code` | URL Shortener |
| **Secret View** | `/s/secret-code` | Secret Sharing |
| **Paste View** | `/p/paste-code` | Pastebin (public scope) |

Each is designed for a specific sharing scenario and has different behavior around access and self-destruction.

---

## 🔀 URL Redirect

**How it works:**

When someone visits a short URL (e.g., `yourapp.com/team-docs`):

1. The system looks up the short code in the database
2. If found: the visitor is **immediately redirected** to the destination URL
3. The **click counter** increments by one
4. If not found: a "Link Not Found" error page is shown

The redirect is seamless — there is no interstitial page. Visitors are forwarded instantly.

| Scenario | What Happens |
|:---------|:-------------|
| Valid code | Instant redirect to destination |
| Invalid / deleted code | "Not Found" error page |
| No code in URL | The app''s main page loads (if authenticated) |

> 💡 **Tip:** Combine the URL Shortener with the QR Code Generator: shorten your URL first, then generate a QR code from the short URL for cleaner, scannable codes.

---

## 🔒 Secret View Page

**How it works:**

When a recipient opens a secret link (e.g., `yourapp.com/s/abc123`):

1. The page checks whether the secret exists, has expired, or was already viewed
2. An available secret is displayed immediately
3. The page marks the secret as viewed
4. Later visits show an unavailable-secret message

**Error states:**

| State | Message Shown |
|:------|:-------------|
| Not yet viewed | Content displays on opening |
| Already viewed | "This secret has already been viewed" |
| Expired | "This secret has expired" |
| Code doesn''t exist | "Secret not found" |

> 💡 **Tip:** Instruct recipients to only open the link when they are in a private location — the reveal is one-time and cannot be repeated.

---

## 📄 Paste View Page

**How it works:**

When someone opens a paste link (e.g., `yourapp.com/p/xyz789`):

1. The paste content is displayed with **a language label** applied based on the paste''s language setting
2. The **view counter** increments by one on each page load
3. A **copy button** lets the visitor copy the paste content to their clipboard
4. The paste''s **title** and **language** are displayed at the top

**Paste states:**

| State | What Happens |
|:------|:------------|
| Active public paste | Content displays normally |
| Expired paste | "This paste has expired" error |
| Personal / org-scoped paste | Not accessible without login |
| Deleted paste | "Paste not found" error |

> 💡 **Tip:** Only **public-scoped** pastes are accessible without login. Personal and org-scoped pastes are protected and require authentication.

---

## 📋 Public Paste List

The public paste list is available at `/pastes` (or `/p`). It shows:

- All **public-scoped** pastes from all users across all organizations
- Sorted by **creation date** (newest first)
- Truncated content previews for each paste
- Expiry status indicators (active vs expired)
- View counts

Anyone can browse this list — no login required. Load more pastes by clicking the **Load More** button at the bottom.

> 💡 **Tip:** If you want to share a paste with a specific person but not list it publicly, use **org scope** instead. Org pastes aren''t visible on the public list.

---

## 🔐 Privacy Reminder

> ⚠️ **Warning:** Public pages are truly public. There is no access control, no login gate, and no way to restrict who views public content once the link is shared. Before creating a public paste or short URL, ask yourself: "Would I be comfortable if this content appeared in a search engine index?" If not, use personal or org scope instead.

Best practices:

- Use **Secret Sharing** for sensitive one-time information — it self-destructs after viewing
- Use **org scope** for internal team pastes that shouldn''t be broadly accessible
- Use **personal scope** for private drafts and notes
- Use **public scope** only for genuinely public-safe content like code examples or reference snippets

---

## 💡 Access and expired links

Share the URL produced by the tool so the recipient receives the correct route and code. Short links, secret links, and paste links have different access and expiry behavior; a successful QR scan does not establish that the destination is still active.

If a paste is unavailable, check its audience and expiry with its creator. A consumed secret requires a newly created secret link. Private Quick Pastes do not have a public view URL.',true,20),
('plugins-and-classdash','Plugins and ClassDash','Install ClassDash, set up classes and map locations, and control its dashboard card.','## 🔎 Table of Contents

1. [🧩 Install and show a plugin](olio://help-anchor/install-and-show-a-plugin)
2. [📍 Set your starting location](olio://help-anchor/set-your-starting-location)
3. [📅 Add classes](olio://help-anchor/add-classes)
4. [⏱️ Read the countdown](olio://help-anchor/read-the-countdown)
5. [⚡ Dashboard loading](olio://help-anchor/dashboard-loading)

---

# 🎓 Plugins and ClassDash

## 🧩 Install and show a plugin

Open the plugin manager and install **ClassDash**. Installation makes its page available; dashboard visibility controls whether its card appears on Home. Hide the card without uninstalling if you only want to open the full page.

## 📍 Set your starting location

Open ClassDash, enter your dorm or home name, place its map pin, and save your settings. Check the pin rather than relying only on a typed building name.

## 📅 Add classes

1. Choose **Add a class**.
2. Enter the course code, optional course name and section, start and end times, and building or location.
3. Select the meeting days and optional semester start and end dates.
4. Place the classroom pin and save.

Use the edit action to correct a class and the delete action to remove it after confirmation. A syllabus import creates a draft for review: verify its details and place the classroom pin before saving.

## ⏱️ Read the countdown

The card shows your next class, location, leave-by time, and countdown. Its status changes between waiting, leave now, and in class. Walking estimates include a buffer; check that your locations and class times are correct.

## ⚡ Dashboard loading

Home restores the saved card placement and visibility from this browser while account data refreshes. A ClassDash placeholder fills the card when its data is still loading. Cached schedule data refreshes in the background; after changing a schedule on another device, allow that refresh to finish.

See [Home Dashboard](olio://help/home-dashboard) to move, resize, hide, or restore the card.',true,21)
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title,summary=EXCLUDED.summary,content=EXCLUDED.content,sort_order=EXCLUDED.sort_order,updated_at=now();
