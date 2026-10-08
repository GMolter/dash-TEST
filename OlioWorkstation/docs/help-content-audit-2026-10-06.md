# Help content audit — October 6, 2026

Reviewed all 22 maintained articles against the current application, its access-control migrations, and Launcher implementation. Updated 19, retained three after review, and added two guides. The library now has 24 maintained articles. No current article needed retirement; the previously retired Triggers/Webhooks guide remains absent and is explicitly removed from installed databases by the new snapshot migration.

## Article decisions and evidence

Paths below are relative to `OlioWorkstation` unless otherwise stated.

| Article slug | Decision | Evidence and result |
| --- | --- | --- |
| getting-started | Updated | `src/pages/Onboarding.tsx`, `ForcedPasswordChange.tsx`, `App.tsx`: account creation, password recovery after a successful reset, public help, restriction messaging. |
| organizations | Updated | `src/pages/OrgSetup.tsx`, `OrganizationPage.tsx`, `ProfileSettings.tsx`: corrected multi-owner leave rules. |
| home-dashboard | Updated | `src/components/DashboardCanvas.tsx`, `TargetedAlerts.tsx`, `DashboardPhotoSettings.tsx`: retained layout controls; added photo and dashboard-message coverage. |
| utilities-hub | Updated | `src/App.tsx`, `src/components/UtilitiesHub.tsx`: verified current tool inventory, added description toggle and Help Center link. |
| quick-links | Retained | `src/components/Quicklinks.tsx`: verified create/edit, folder movement, reorder, deletion options, and shared-link management. |
| url-shortener | Rewritten | `src/components/URLShortener.tsx`, `src/pages/URLRedirect.tsx`, `20261004120000_private_utilities.sql`: documented personal default, all three audiences, owner controls, and click behavior. |
| secret-sharing | Rewritten | `src/components/SecretSharing.tsx`, `src/pages/SecretView.tsx`, private-utilities and expired-secret-cleanup migrations: explicit reveal, owner preview, consumed status, deletion, and expiry cleanup. |
| qr-code-generator | Updated | `src/components/QRCodeGenerator.tsx`: preview layout, regeneration requirement, external service, inherited destination access. |
| pastebin | Updated | `src/components/Pastebin.tsx`, `src/pages/PasteList.tsx`, `PasteView.tsx`: removed nonexistent language chooser, clarified five-row lists and public View All destination. |
| projects-center | Updated | `src/pages/ProjectsCenterApp.tsx`: verified audience, template, filters, sorting, search palette; clarified archive behavior. |
| project-overview | Retained | `src/pages/ProjectDashboard.tsx`, `src/components/OverviewView.tsx`: verified workspace navigation, quick capture, settings, and deletion confirmations. |
| project-board | Updated | `src/components/BoardView.tsx`: reopening requires both a non-completion lane and clearing saved completion state. |
| project-planner | Updated | `src/components/PlannerView.tsx`, `api/planner/generate.ts`: Cmd selection and AI context disclosure; verified archive, conversion, and accept/deletion flow. |
| project-files | Updated | `src/projectFiles/store.tsx`, `DocEditor.tsx`, `FileTreePanel.tsx`, `src/pages/ProjectDashboard.tsx`: clarified public upload URLs and immediate tree deletion; retained autosave and link instructions. |
| project-resources | Retained | `src/components/ResourcesView.tsx`: verified categories, title requirements, external navigation, editing, and confirmation before deletion. |
| organization-management | Updated | `src/pages/OrganizationPage.tsx`, `src/features/organization`, `src/features/admin/AdminOrganizationPage.tsx`: verified roles/ownership, resources, activity, settings, deletion; clarified organization data scope and linked dedicated app-admin guidance. |
| profile-and-settings | Updated | `src/pages/ProfileSettings.tsx`, `src/components/DashboardPhotoSettings.tsx`: added photo upload, crop, apply/remove, limits, and theme interaction. |
| quick-pastes | Updated | `src/components/QuickPastes.tsx`, `src/features/quickPastes/model.ts`: verified editing, limits, ordering, favorite/duplicate/delete; clarified absence of shared audiences. |
| public-pages | Rewritten | `src/App.tsx`, `URLRedirect.tsx`, `SecretView.tsx`, `PasteView.tsx`, `PasteList.tsx`: corrected restricted short links and reveal behavior, documented both public-list routes. |
| plugins-and-classdash | Rewritten | `src/pages/ClassDashPage.tsx`, `SyllabusImporter.tsx`, `MapLocationPicker.tsx`, `PluginManager.tsx`, `src/features/classdash`: new workspace, saved import progress, map reuse, import limits, countdown semantics, and lifecycle. |
| my-tasks | Updated | `src/components/DashboardTodos.tsx`: immediate deletion, narrow-screen control, and closing the panel. |
| olio-launcher | Updated | `src/pages/LauncherAuthorization.tsx`, `LauncherDevices.tsx`, `../OlioLauncher/src/SettingsDialog.ahk`, `QuickPastesClient.ahk`: verified pairing/revocation and documented read-only permission scope. |
| help-center | Added | `src/pages/HelpPage.tsx`, `HelpArticlePage.tsx`, `api/public/help-articles.ts`, `help-article.ts`: search scope, topic filtering, section navigation, sharing, public access, and missing guides. |
| application-administration | Added | `src/features/admin`, `src/pages/Admin.tsx`, `api/_utils/adminResources.ts`: role distinctions, accounts, banners, data, help publishing, review, and audit workflow. |

## Delivery and verification

- `supabase/migrations/20261006235000_audit_help_guides.sql` contains the full maintained snapshot. It updates only named maintained slugs, keeps existing article IDs and publication states, publishes new guides, and leaves unrelated custom articles alone. It intentionally replaces the text and metadata of maintained guides, including any local edits to those same slugs.
- Existing slugs remain stable. Both new guides are assigned to Help Center topics and linked from existing guides.
- Historical migrations are unchanged. Apply the new migration through the normal database deployment process; editing the Markdown files alone does not update the live Help Center.
- Content tests verify exact metadata/body agreement with the new migration, unique slugs/sort orders, topic coverage, valid internal links and anchors, and retirement of the old tool.
- Help page and article tests cover search/filter behavior, loading retry, and resolution of slug and ID links. A local PostgreSQL-compatible check applies this migration to an empty help table and existing rows, verifies reapplication, and confirms preservation of custom articles, IDs, and unpublished state. This does not exercise the entire historical migration chain.

This audit changes documentation, topic mapping, and documentation checks. It does not change application behavior or apply a migration to a remote database.
