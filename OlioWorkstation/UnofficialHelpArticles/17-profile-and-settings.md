########
Title: Profile and Settings
Slug: profile-and-settings
Summary: Update your account info, customize the app theme, manage your organization membership, and sign out.
Sort Order: 17
########

## 🔎 Table of Contents

1. [Accessing Profile Settings](olio://help-anchor/accessing-profile-settings)
2. [Account Information](olio://help-anchor/account-information)
3. [Olio Launcher Devices](olio://help-anchor/olio-launcher-devices)
4. [Theme Customization](olio://help-anchor/theme-customization)
5. [Themes Explained](olio://help-anchor/themes-explained)
6. [Color Presets](olio://help-anchor/color-presets)
7. [Leaving an Organization](olio://help-anchor/leaving-an-organization)
8. [Deleting an Organization](olio://help-anchor/deleting-an-organization)
9. [Signing Out](olio://help-anchor/signing-out)

---

# ⚙️ Profile and Settings

The **Profile page** is where you manage your personal account settings, customize the app's appearance, and control your organization membership. Navigate here by opening the menu and selecting **Profile**.

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

The **Olio Launcher devices** section lists launchers approved for your account. It shows
only safe metadata: device name, connected time, last-used time, and connected or revoked
status. Credential values, pairing codes, hashes, and internal security fields are never
shown.

To remove a device:

1. Find its recognizable device name.
2. Choose **Revoke**.
3. Review the warning and choose **Revoke access**. Cancel if you selected the wrong
   device.
4. Refresh the list and confirm the status is **Revoked**.

Revocation immediately prevents later authenticated launcher operations and clears
Quick Pastes when the launcher observes the revoked credential. Reconnect from launcher
Settings if you still control the device. A newly approved launcher may read your private
Quick Pastes; an older connection may require disconnect and fresh approval because its
access is not silently broadened.

Do not share pairing codes or screenshots containing account information. Support will
never ask for your password, Supabase session, authorization header, device credential,
access token, private messages, financial information, or other sensitive content.

---

## 🎨 Theme Customization

Olio Workstation's animated background is fully customizable. To change your theme:

1. Click **Customize Theme**
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

> 💡 **Tip:** Try the **Sunset** preset with **Contour Drift** for a striking look that's easy to distinguish from other Olio Workstation windows at a glance.

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
