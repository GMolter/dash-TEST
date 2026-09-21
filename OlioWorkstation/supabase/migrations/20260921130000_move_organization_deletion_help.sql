-- Update organization deletion instructions without changing publication settings.
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

You become its owner. Open **Organization → Overview** and use **Copy** beside the organization code to invite your team.

## Work with your team

Open **Organization → Shared Links** for team bookmarks. Use **Utilities → Projects → Org** for organization projects. Choose **Personal** when creating a project for yourself.

Owners and admins manage the organization name, invite code, and members. Members use its shared tools and resources. See [Organization Management](olio://help/organization-management).

## Change organizations

Your account can belong to one organization at a time. Members and admins can use **Profile → Leave Organization**, type the organization name, and choose **Leave**. Then join another organization from setup.

Leaving removes access to the old team''s resources. To rejoin, use its current invite code. Owners can delete the organization from **Organization → Manage**. See [Organization Management](olio://help/organization-management) for the steps and effects.', updated_at=now() WHERE slug='organizations';

UPDATE public.help_articles SET summary='View members, share the invite code, and manage team settings.', content='Open **Organization** from the navigation menu.

## View the team and invite someone

The **Overview** tab shows the organization name, code, and member list. Choose **Copy** beside the code and give it to the person you want to invite. They can use it during [organization setup](olio://help/organizations).

Open **Shared Links** to use or add team bookmarks.

## Change organization settings

Owners and admins can open **Manage**. Edit **Organization Name** and choose **Save Changes** to rename the team.

Under **Security**, choose **Regenerate** and confirm to replace the invite code. Copy the new code for future invitations. The old code stops working; existing members stay in the organization.

## Manage members

In **Manage Members**, use **Promote** to make a member an admin or **Demote** to return an admin to member. Owners and admins have management access; only the owner can delete the organization.

Choose **Remove** beside a member and confirm to remove their access to the organization. Check the person''s name before confirming.

## Delete the organization

Only the owner can see and use **Delete Organization** in **Organization → Manage**.

1. Choose **Delete Organization**.
2. Read the warning and check the acknowledgment.
3. Type the organization name exactly.
4. Choose **Delete**.

This permanently deletes the organization and its data and removes all members. This cannot be undone.

## Leave the organization

Members and admins can leave from **Profile → Organization Management**. See [Profile and Settings](olio://help/profile-and-settings) for the steps.', updated_at=now() WHERE slug='organization-management';

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

Members and admins can choose **Leave Organization**, type the organization name exactly, and choose **Leave**.

You lose access to its shared resources and return to organization setup. Use the team''s current code to rejoin, or join a different team.

## Sign out

Choose **Sign Out** on Profile to end your session.', updated_at=now() WHERE slug='profile-and-settings';

COMMIT;
