-- Schema, explicit v1 backfill, and enforcement ship together. Apply before the API/UI release.
begin;
create table public.admin_permission_catalog (key text primary key, parent text, is_write boolean not null, protected boolean not null default false, owner_only boolean not null default false, version integer not null);
create table public.admin_permission_assignments (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 preset text not null check (preset in ('standard','read-only','custom','full')), preset_version integer not null,
 revision integer not null default 1, updated_by uuid references auth.users(id) on delete set null, updated_at timestamptz not null default now()
);
create table public.admin_permission_grants (
 user_id uuid references public.admin_permission_assignments(user_id) on delete cascade,
 permission_key text references public.admin_permission_catalog(key), primary key(user_id, permission_key)
);
alter table public.admin_permission_catalog enable row level security;
alter table public.admin_permission_assignments enable row level security;
alter table public.admin_permission_grants enable row level security;
revoke all on public.admin_permission_catalog, public.admin_permission_assignments, public.admin_permission_grants from public, anon, authenticated;
grant all on public.admin_permission_catalog, public.admin_permission_assignments, public.admin_permission_grants to service_role;
insert into public.admin_permission_catalog(key,parent,is_write,protected,owner_only,version) values
('sections.features.read',null,false,false,false,1),
('sections.features.update','sections.features.read',true,false,false,1),
('sections.people.read',null,false,false,false,1),
('sections.people.update','sections.people.read',true,false,false,1),
('sections.organizations.read',null,false,false,false,1),
('sections.organizations.update','sections.organizations.read',true,false,false,1),
('sections.workspace.read',null,false,false,false,1),
('sections.workspace.update','sections.workspace.read',true,false,false,1),
('sections.integrations.read',null,false,false,false,1),
('sections.integrations.update','sections.integrations.read',true,false,false,1),
('sections.platform.read',null,false,false,false,1),
('sections.platform.update','sections.platform.read',true,false,false,1),
('sections.banner.read',null,false,false,false,1),
('sections.banner.update','sections.banner.read',true,false,false,1),
('sections.reviews.read',null,false,false,true,1),
('sections.reviews.update','sections.reviews.read',true,false,true,1),
('sections.audit.read',null,false,false,false,1),
('sections.audit.update','sections.audit.read',true,false,false,1),
('features.read','sections.features.read',false,false,false,1),
('features.control','sections.features.update',true,false,false,1),
('features.create','features.control',true,false,false,1),
('features.update','features.control',true,false,false,1),
('features.fields.id.read','features.read',false,false,false,1),
('features.fields.title.read','features.read',false,false,false,1),
('features.fields.title.update','features.control',true,false,false,1),
('features.fields.notes.read','features.read',false,false,false,1),
('features.fields.notes.update','features.control',true,false,false,1),
('features.fields.status.read','features.read',false,false,false,1),
('features.fields.status.update','features.control',true,false,false,1),
('features.fields.plan_name.read','features.read',false,false,false,1),
('features.fields.plan_name.update','features.control',true,false,false,1),
('features.fields.plan_content.read','features.read',false,false,false,1),
('features.fields.plan_content.update','features.control',true,false,false,1),
('features.fields.created_by.read','features.read',false,false,false,1),
('features.fields.created_at.read','features.read',false,false,false,1),
('users.read','sections.people.read',false,false,false,1),
('users.control','sections.people.update',true,false,false,1),
('users.create','users.control',true,false,false,1),
('users.update','users.control',true,false,false,1),
('users.request-admin','users.control',true,false,true,1),
('users.revoke-admin','users.control',true,false,true,1),
('users.set-access','users.control',true,false,true,1),
('users.ban','users.control',true,false,false,1),
('users.unban','users.control',true,false,false,1),
('users.reset-password','users.control',true,false,false,1),
('users.request-delete','users.control',true,false,false,1),
('users.remove-organization','users.control',true,false,false,1),
('users.fields.id.read','users.read',false,false,false,1),
('users.fields.email.read','users.read',false,false,false,1),
('users.fields.email.update','users.control',true,false,false,1),
('users.fields.temporary_password.read','users.read',false,true,false,1),
('users.fields.temporary_password.update','users.control',true,false,false,1),
('users.fields.display_name.read','users.read',false,false,false,1),
('users.fields.display_name.update','users.control',true,false,false,1),
('users.fields.org_id.read','users.read',false,false,false,1),
('users.fields.org_id.update','users.control',true,false,false,1),
('users.fields.role.read','users.read',false,false,false,1),
('users.fields.role.update','users.control',true,false,false,1),
('users.fields.app_admin.read','users.read',false,false,false,1),
('users.fields.app_owner.read','users.read',false,false,false,1),
('users.fields.email_confirmed_at.read','users.read',false,false,false,1),
('users.fields.last_sign_in_at.read','users.read',false,false,false,1),
('users.fields.last_active_at.read','users.read',false,false,false,1),
('users.fields.banned_until.read','users.read',false,false,false,1),
('users.fields.force_password_change.read','users.read',false,false,false,1),
('users.fields.created_at.read','users.read',false,false,false,1),
('users.fields.updated_at.read','users.read',false,false,false,1),
('organizations.read','sections.organizations.read',false,false,false,1),
('organizations.control','sections.organizations.update',true,false,false,1),
('organizations.create','organizations.control',true,false,false,1),
('organizations.update','organizations.control',true,false,false,1),
('organizations.delete','organizations.control',true,false,false,1),
('organizations.reveal','organizations.read',false,true,false,1),
('organizations.transfer-owner','organizations.control',true,false,false,1),
('organizations.regenerate-code','organizations.control',true,false,false,1),
('organizations.set-member','organizations.control',true,false,false,1),
('organizations.remove-member','organizations.control',true,false,false,1),
('organizations.fields.id.read','organizations.read',false,false,false,1),
('organizations.fields.name.read','organizations.read',false,false,false,1),
('organizations.fields.name.update','organizations.control',true,false,false,1),
('organizations.fields.code.read','organizations.read',false,true,false,1),
('organizations.fields.code.update','organizations.control',true,false,false,1),
('organizations.fields.owner_id.read','organizations.read',false,false,false,1),
('organizations.fields.owner_id.update','organizations.control',true,false,false,1),
('organizations.fields.created_at.read','organizations.read',false,false,false,1),
('organizations.fields.created_at.update','organizations.control',true,false,false,1),
('org-announcements.read','sections.organizations.read',false,false,false,1),
('org-announcements.control','sections.organizations.update',true,false,false,1),
('org-announcements.create','org-announcements.control',true,false,false,1),
('org-announcements.update','org-announcements.control',true,false,false,1),
('org-announcements.delete','org-announcements.control',true,false,false,1),
('org-announcements.fields.id.read','org-announcements.read',false,false,false,1),
('org-announcements.fields.org_id.read','org-announcements.read',false,false,false,1),
('org-announcements.fields.org_id.update','org-announcements.control',true,false,false,1),
('org-announcements.fields.title.read','org-announcements.read',false,false,false,1),
('org-announcements.fields.title.update','org-announcements.control',true,false,false,1),
('org-announcements.fields.body.read','org-announcements.read',false,false,false,1),
('org-announcements.fields.body.update','org-announcements.control',true,false,false,1),
('org-announcements.fields.pinned.read','org-announcements.read',false,false,false,1),
('org-announcements.fields.pinned.update','org-announcements.control',true,false,false,1),
('org-announcements.fields.created_by.read','org-announcements.read',false,false,false,1),
('org-announcements.fields.created_by.update','org-announcements.control',true,false,false,1),
('org-announcements.fields.created_at.read','org-announcements.read',false,false,false,1),
('org-announcements.fields.created_at.update','org-announcements.control',true,false,false,1),
('org-announcements.fields.updated_at.read','org-announcements.read',false,false,false,1),
('org-announcements.fields.updated_at.update','org-announcements.control',true,false,false,1),
('org-resources.read','sections.organizations.read',false,false,false,1),
('org-resources.control','sections.organizations.update',true,false,false,1),
('org-resources.create','org-resources.control',true,false,false,1),
('org-resources.update','org-resources.control',true,false,false,1),
('org-resources.delete','org-resources.control',true,false,false,1),
('org-resources.fields.id.read','org-resources.read',false,false,false,1),
('org-resources.fields.org_id.read','org-resources.read',false,false,false,1),
('org-resources.fields.org_id.update','org-resources.control',true,false,false,1),
('org-resources.fields.title.read','org-resources.read',false,false,false,1),
('org-resources.fields.title.update','org-resources.control',true,false,false,1),
('org-resources.fields.description.read','org-resources.read',false,false,false,1),
('org-resources.fields.description.update','org-resources.control',true,false,false,1),
('org-resources.fields.kind.read','org-resources.read',false,false,false,1),
('org-resources.fields.kind.update','org-resources.control',true,false,false,1),
('org-resources.fields.category.read','org-resources.read',false,false,false,1),
('org-resources.fields.category.update','org-resources.control',true,false,false,1),
('org-resources.fields.url.read','org-resources.read',false,false,false,1),
('org-resources.fields.url.update','org-resources.control',true,false,false,1),
('org-resources.fields.content.read','org-resources.read',false,false,false,1),
('org-resources.fields.content.update','org-resources.control',true,false,false,1),
('org-resources.fields.created_by.read','org-resources.read',false,false,false,1),
('org-resources.fields.created_by.update','org-resources.control',true,false,false,1),
('org-resources.fields.created_at.read','org-resources.read',false,false,false,1),
('org-resources.fields.created_at.update','org-resources.control',true,false,false,1),
('org-resources.fields.updated_at.read','org-resources.read',false,false,false,1),
('org-resources.fields.updated_at.update','org-resources.control',true,false,false,1),
('org-activity.read','sections.organizations.read',false,false,false,1),
('org-activity.control','sections.organizations.update',true,false,false,1),
('org-activity.create','org-activity.control',true,false,false,1),
('org-activity.update','org-activity.control',true,false,false,1),
('org-activity.delete','org-activity.control',true,false,false,1),
('org-activity.fields.id.read','org-activity.read',false,false,false,1),
('org-activity.fields.org_id.read','org-activity.read',false,false,false,1),
('org-activity.fields.org_id.update','org-activity.control',true,false,false,1),
('org-activity.fields.actor_id.read','org-activity.read',false,false,false,1),
('org-activity.fields.actor_id.update','org-activity.control',true,false,false,1),
('org-activity.fields.actor_name.read','org-activity.read',false,false,false,1),
('org-activity.fields.actor_name.update','org-activity.control',true,false,false,1),
('org-activity.fields.category.read','org-activity.read',false,false,false,1),
('org-activity.fields.category.update','org-activity.control',true,false,false,1),
('org-activity.fields.action.read','org-activity.read',false,false,false,1),
('org-activity.fields.action.update','org-activity.control',true,false,false,1),
('org-activity.fields.subject.read','org-activity.read',false,false,false,1),
('org-activity.fields.subject.update','org-activity.control',true,false,false,1),
('org-activity.fields.created_at.read','org-activity.read',false,false,false,1),
('org-activity.fields.created_at.update','org-activity.control',true,false,false,1),
('projects.read','sections.workspace.read',false,false,false,1),
('projects.control','sections.workspace.update',true,false,false,1),
('projects.create','projects.control',true,false,false,1),
('projects.update','projects.control',true,false,false,1),
('projects.delete','projects.control',true,false,false,1),
('projects.fields.id.read','projects.read',false,false,false,1),
('projects.fields.name.read','projects.read',false,false,false,1),
('projects.fields.name.update','projects.control',true,false,false,1),
('projects.fields.description.read','projects.read',false,false,false,1),
('projects.fields.description.update','projects.control',true,false,false,1),
('projects.fields.url.read','projects.read',false,false,false,1),
('projects.fields.url.update','projects.control',true,false,false,1),
('projects.fields.status.read','projects.read',false,false,false,1),
('projects.fields.status.update','projects.control',true,false,false,1),
('projects.fields.tags.read','projects.read',false,false,false,1),
('projects.fields.tags.update','projects.control',true,false,false,1),
('projects.fields.org_id.read','projects.read',false,false,false,1),
('projects.fields.org_id.update','projects.control',true,false,false,1),
('projects.fields.user_id.read','projects.read',false,false,false,1),
('projects.fields.user_id.update','projects.control',true,false,false,1),
('projects.fields.ai_plan_usage_count.read','projects.read',false,false,false,1),
('projects.fields.ai_plan_usage_count.update','projects.control',true,false,false,1),
('projects.fields.ai_plan_unlimited.read','projects.read',false,false,false,1),
('projects.fields.ai_plan_unlimited.update','projects.control',true,false,false,1),
('projects.fields.created_at.read','projects.read',false,false,false,1),
('projects.fields.updated_at.read','projects.read',false,false,false,1),
('project-board-columns.read','sections.workspace.read',false,false,false,1),
('project-board-columns.control','sections.workspace.update',true,false,false,1),
('project-board-columns.create','project-board-columns.control',true,false,false,1),
('project-board-columns.update','project-board-columns.control',true,false,false,1),
('project-board-columns.delete','project-board-columns.control',true,false,false,1),
('project-board-columns.fields.id.read','project-board-columns.read',false,false,false,1),
('project-board-columns.fields.project_id.read','project-board-columns.read',false,false,false,1),
('project-board-columns.fields.project_id.update','project-board-columns.control',true,false,false,1),
('project-board-columns.fields.name.read','project-board-columns.read',false,false,false,1),
('project-board-columns.fields.name.update','project-board-columns.control',true,false,false,1),
('project-board-columns.fields.position.read','project-board-columns.read',false,false,false,1),
('project-board-columns.fields.position.update','project-board-columns.control',true,false,false,1),
('project-board-columns.fields.archived.read','project-board-columns.read',false,false,false,1),
('project-board-columns.fields.archived.update','project-board-columns.control',true,false,false,1),
('project-board-columns.fields.created_at.read','project-board-columns.read',false,false,false,1),
('project-board-columns.fields.updated_at.read','project-board-columns.read',false,false,false,1),
('project-board-cards.read','sections.workspace.read',false,false,false,1),
('project-board-cards.control','sections.workspace.update',true,false,false,1),
('project-board-cards.create','project-board-cards.control',true,false,false,1),
('project-board-cards.update','project-board-cards.control',true,false,false,1),
('project-board-cards.delete','project-board-cards.control',true,false,false,1),
('project-board-cards.fields.id.read','project-board-cards.read',false,false,false,1),
('project-board-cards.fields.project_id.read','project-board-cards.read',false,false,false,1),
('project-board-cards.fields.project_id.update','project-board-cards.control',true,false,false,1),
('project-board-cards.fields.column_id.read','project-board-cards.read',false,false,false,1),
('project-board-cards.fields.column_id.update','project-board-cards.control',true,false,false,1),
('project-board-cards.fields.title.read','project-board-cards.read',false,false,false,1),
('project-board-cards.fields.title.update','project-board-cards.control',true,false,false,1),
('project-board-cards.fields.description.read','project-board-cards.read',false,false,false,1),
('project-board-cards.fields.description.update','project-board-cards.control',true,false,false,1),
('project-board-cards.fields.priority.read','project-board-cards.read',false,false,false,1),
('project-board-cards.fields.priority.update','project-board-cards.control',true,false,false,1),
('project-board-cards.fields.due_date.read','project-board-cards.read',false,false,false,1),
('project-board-cards.fields.due_date.update','project-board-cards.control',true,false,false,1),
('project-board-cards.fields.assignee_name.read','project-board-cards.read',false,false,false,1),
('project-board-cards.fields.assignee_name.update','project-board-cards.control',true,false,false,1),
('project-board-cards.fields.position.read','project-board-cards.read',false,false,false,1),
('project-board-cards.fields.position.update','project-board-cards.control',true,false,false,1),
('project-board-cards.fields.archived.read','project-board-cards.read',false,false,false,1),
('project-board-cards.fields.archived.update','project-board-cards.control',true,false,false,1),
('project-board-cards.fields.completed.read','project-board-cards.read',false,false,false,1),
('project-board-cards.fields.completed.update','project-board-cards.control',true,false,false,1),
('project-board-cards.fields.created_at.read','project-board-cards.read',false,false,false,1),
('project-board-cards.fields.updated_at.read','project-board-cards.read',false,false,false,1),
('project-planner-steps.read','sections.workspace.read',false,false,false,1),
('project-planner-steps.control','sections.workspace.update',true,false,false,1),
('project-planner-steps.create','project-planner-steps.control',true,false,false,1),
('project-planner-steps.update','project-planner-steps.control',true,false,false,1),
('project-planner-steps.delete','project-planner-steps.control',true,false,false,1),
('project-planner-steps.fields.id.read','project-planner-steps.read',false,false,false,1),
('project-planner-steps.fields.project_id.read','project-planner-steps.read',false,false,false,1),
('project-planner-steps.fields.project_id.update','project-planner-steps.control',true,false,false,1),
('project-planner-steps.fields.title.read','project-planner-steps.read',false,false,false,1),
('project-planner-steps.fields.title.update','project-planner-steps.control',true,false,false,1),
('project-planner-steps.fields.description.read','project-planner-steps.read',false,false,false,1),
('project-planner-steps.fields.description.update','project-planner-steps.control',true,false,false,1),
('project-planner-steps.fields.completed.read','project-planner-steps.read',false,false,false,1),
('project-planner-steps.fields.completed.update','project-planner-steps.control',true,false,false,1),
('project-planner-steps.fields.position.read','project-planner-steps.read',false,false,false,1),
('project-planner-steps.fields.position.update','project-planner-steps.control',true,false,false,1),
('project-planner-steps.fields.archived.read','project-planner-steps.read',false,false,false,1),
('project-planner-steps.fields.archived.update','project-planner-steps.control',true,false,false,1),
('project-planner-steps.fields.ai_generated.read','project-planner-steps.read',false,false,false,1),
('project-planner-steps.fields.ai_generated.update','project-planner-steps.control',true,false,false,1),
('project-planner-steps.fields.due_date.read','project-planner-steps.read',false,false,false,1),
('project-planner-steps.fields.due_date.update','project-planner-steps.control',true,false,false,1),
('project-planner-steps.fields.created_at.read','project-planner-steps.read',false,false,false,1),
('project-planner-steps.fields.updated_at.read','project-planner-steps.read',false,false,false,1),
('project-resources.read','sections.workspace.read',false,false,false,1),
('project-resources.control','sections.workspace.update',true,false,false,1),
('project-resources.create','project-resources.control',true,false,false,1),
('project-resources.update','project-resources.control',true,false,false,1),
('project-resources.delete','project-resources.control',true,false,false,1),
('project-resources.fields.id.read','project-resources.read',false,false,false,1),
('project-resources.fields.project_id.read','project-resources.read',false,false,false,1),
('project-resources.fields.project_id.update','project-resources.control',true,false,false,1),
('project-resources.fields.title.read','project-resources.read',false,false,false,1),
('project-resources.fields.title.update','project-resources.control',true,false,false,1),
('project-resources.fields.url.read','project-resources.read',false,false,false,1),
('project-resources.fields.url.update','project-resources.control',true,false,false,1),
('project-resources.fields.description.read','project-resources.read',false,false,false,1),
('project-resources.fields.description.update','project-resources.control',true,false,false,1),
('project-resources.fields.category.read','project-resources.read',false,false,false,1),
('project-resources.fields.category.update','project-resources.control',true,false,false,1),
('project-resources.fields.position.read','project-resources.read',false,false,false,1),
('project-resources.fields.position.update','project-resources.control',true,false,false,1),
('project-resources.fields.favicon_url.read','project-resources.read',false,false,false,1),
('project-resources.fields.favicon_url.update','project-resources.control',true,false,false,1),
('project-resources.fields.created_at.read','project-resources.read',false,false,false,1),
('project-resources.fields.updated_at.read','project-resources.read',false,false,false,1),
('project-files.read','sections.workspace.read',false,false,false,1),
('project-files.control','sections.workspace.update',true,false,false,1),
('project-files.create','project-files.control',true,false,false,1),
('project-files.update','project-files.control',true,false,false,1),
('project-files.delete','project-files.control',true,false,false,1),
('project-files.reveal','project-files.read',false,true,false,1),
('project-files.fields.id.read','project-files.read',false,false,false,1),
('project-files.fields.project_id.read','project-files.read',false,false,false,1),
('project-files.fields.project_id.update','project-files.control',true,false,false,1),
('project-files.fields.type.read','project-files.read',false,false,false,1),
('project-files.fields.type.update','project-files.control',true,false,false,1),
('project-files.fields.name.read','project-files.read',false,false,false,1),
('project-files.fields.name.update','project-files.control',true,false,false,1),
('project-files.fields.parent_id.read','project-files.read',false,false,false,1),
('project-files.fields.parent_id.update','project-files.control',true,false,false,1),
('project-files.fields.sort_index.read','project-files.read',false,false,false,1),
('project-files.fields.sort_index.update','project-files.control',true,false,false,1),
('project-files.fields.content.read','project-files.read',false,true,false,1),
('project-files.fields.content.update','project-files.control',true,false,false,1),
('project-files.fields.meta.read','project-files.read',false,false,false,1),
('project-files.fields.created_at.read','project-files.read',false,false,false,1),
('project-files.fields.updated_at.read','project-files.read',false,false,false,1),
('project-activity.read','sections.workspace.read',false,false,false,1),
('project-activity.control','sections.workspace.update',true,false,false,1),
('project-activity.reveal','project-activity.read',false,true,false,1),
('project-activity.fields.id.read','project-activity.read',false,false,false,1),
('project-activity.fields.project_id.read','project-activity.read',false,false,false,1),
('project-activity.fields.action_type.read','project-activity.read',false,false,false,1),
('project-activity.fields.description.read','project-activity.read',false,false,false,1),
('project-activity.fields.metadata.read','project-activity.read',false,true,false,1),
('project-activity.fields.created_at.read','project-activity.read',false,false,false,1),
('pastes.read','sections.workspace.read',false,false,false,1),
('pastes.control','sections.workspace.update',true,false,false,1),
('pastes.create','pastes.control',true,false,false,1),
('pastes.update','pastes.control',true,false,false,1),
('pastes.delete','pastes.control',true,false,false,1),
('pastes.reveal','pastes.read',false,true,false,1),
('pastes.fields.id.read','pastes.read',false,false,false,1),
('pastes.fields.paste_code.read','pastes.read',false,true,false,1),
('pastes.fields.paste_code.update','pastes.control',true,false,false,1),
('pastes.fields.title.read','pastes.read',false,false,false,1),
('pastes.fields.title.update','pastes.control',true,false,false,1),
('pastes.fields.content.read','pastes.read',false,true,false,1),
('pastes.fields.content.update','pastes.control',true,false,false,1),
('pastes.fields.language.read','pastes.read',false,false,false,1),
('pastes.fields.language.update','pastes.control',true,false,false,1),
('pastes.fields.visibility.read','pastes.read',false,false,false,1),
('pastes.fields.visibility.update','pastes.control',true,false,false,1),
('pastes.fields.scope_personal.read','pastes.read',false,false,false,1),
('pastes.fields.scope_personal.update','pastes.control',true,false,false,1),
('pastes.fields.scope_org.read','pastes.read',false,false,false,1),
('pastes.fields.scope_org.update','pastes.control',true,false,false,1),
('pastes.fields.scope_public.read','pastes.read',false,false,false,1),
('pastes.fields.scope_public.update','pastes.control',true,false,false,1),
('pastes.fields.user_id.read','pastes.read',false,false,false,1),
('pastes.fields.user_id.update','pastes.control',true,false,false,1),
('pastes.fields.org_id.read','pastes.read',false,false,false,1),
('pastes.fields.org_id.update','pastes.control',true,false,false,1),
('pastes.fields.views.read','pastes.read',false,false,false,1),
('pastes.fields.views.update','pastes.control',true,false,false,1),
('pastes.fields.expires_at.read','pastes.read',false,false,false,1),
('pastes.fields.expires_at.update','pastes.control',true,false,false,1),
('pastes.fields.created_at.read','pastes.read',false,false,false,1),
('quick-pastes.read','sections.workspace.read',false,false,false,1),
('quick-pastes.control','sections.workspace.update',true,false,false,1),
('quick-pastes.create','quick-pastes.control',true,false,false,1),
('quick-pastes.update','quick-pastes.control',true,false,false,1),
('quick-pastes.delete','quick-pastes.control',true,false,false,1),
('quick-pastes.reveal','quick-pastes.read',false,true,false,1),
('quick-pastes.fields.id.read','quick-pastes.read',false,false,false,1),
('quick-pastes.fields.user_id.read','quick-pastes.read',false,false,false,1),
('quick-pastes.fields.user_id.update','quick-pastes.control',true,false,false,1),
('quick-pastes.fields.title.read','quick-pastes.read',false,false,false,1),
('quick-pastes.fields.title.update','quick-pastes.control',true,false,false,1),
('quick-pastes.fields.content.read','quick-pastes.read',false,true,false,1),
('quick-pastes.fields.content.update','quick-pastes.control',true,false,false,1),
('quick-pastes.fields.category.read','quick-pastes.read',false,false,false,1),
('quick-pastes.fields.category.update','quick-pastes.control',true,false,false,1),
('quick-pastes.fields.sort_order.read','quick-pastes.read',false,false,false,1),
('quick-pastes.fields.sort_order.update','quick-pastes.control',true,false,false,1),
('quick-pastes.fields.is_favorite.read','quick-pastes.read',false,false,false,1),
('quick-pastes.fields.is_favorite.update','quick-pastes.control',true,false,false,1),
('quick-pastes.fields.created_at.read','quick-pastes.read',false,false,false,1),
('quick-pastes.fields.updated_at.read','quick-pastes.read',false,false,false,1),
('secrets.read','sections.workspace.read',false,false,false,1),
('secrets.control','sections.workspace.update',true,false,false,1),
('secrets.delete','secrets.control',true,false,false,1),
('secrets.fields.id.read','secrets.read',false,false,false,1),
('secrets.fields.user_id.read','secrets.read',false,false,false,1),
('secrets.fields.viewed.read','secrets.read',false,false,false,1),
('secrets.fields.expires_at.read','secrets.read',false,false,false,1),
('secrets.fields.created_at.read','secrets.read',false,false,false,1),
('quicklinks.read','sections.workspace.read',false,false,false,1),
('quicklinks.control','sections.workspace.update',true,false,false,1),
('quicklinks.create','quicklinks.control',true,false,false,1),
('quicklinks.update','quicklinks.control',true,false,false,1),
('quicklinks.delete','quicklinks.control',true,false,false,1),
('quicklinks.bulk-quicklinks','quicklinks.control',true,false,false,1),
('quicklinks.fields.id.read','quicklinks.read',false,false,false,1),
('quicklinks.fields.title.read','quicklinks.read',false,false,false,1),
('quicklinks.fields.title.update','quicklinks.control',true,false,false,1),
('quicklinks.fields.url.read','quicklinks.read',false,false,false,1),
('quicklinks.fields.url.update','quicklinks.control',true,false,false,1),
('quicklinks.fields.icon.read','quicklinks.read',false,false,false,1),
('quicklinks.fields.icon.update','quicklinks.control',true,false,false,1),
('quicklinks.fields.order_index.read','quicklinks.read',false,false,false,1),
('quicklinks.fields.order_index.update','quicklinks.control',true,false,false,1),
('quicklinks.fields.scope.read','quicklinks.read',false,false,false,1),
('quicklinks.fields.scope.update','quicklinks.control',true,false,false,1),
('quicklinks.fields.folder_id.read','quicklinks.read',false,false,false,1),
('quicklinks.fields.folder_id.update','quicklinks.control',true,false,false,1),
('quicklinks.fields.user_id.read','quicklinks.read',false,false,false,1),
('quicklinks.fields.user_id.update','quicklinks.control',true,false,false,1),
('quicklinks.fields.org_id.read','quicklinks.read',false,false,false,1),
('quicklinks.fields.org_id.update','quicklinks.control',true,false,false,1),
('quicklinks.fields.created_at.read','quicklinks.read',false,false,false,1),
('quicklink-folders.read','sections.workspace.read',false,false,false,1),
('quicklink-folders.control','sections.workspace.update',true,false,false,1),
('quicklink-folders.create','quicklink-folders.control',true,false,false,1),
('quicklink-folders.update','quicklink-folders.control',true,false,false,1),
('quicklink-folders.delete','quicklink-folders.control',true,false,false,1),
('quicklink-folders.fields.id.read','quicklink-folders.read',false,false,false,1),
('quicklink-folders.fields.name.read','quicklink-folders.read',false,false,false,1),
('quicklink-folders.fields.name.update','quicklink-folders.control',true,false,false,1),
('quicklink-folders.fields.icon.read','quicklink-folders.read',false,false,false,1),
('quicklink-folders.fields.icon.update','quicklink-folders.control',true,false,false,1),
('quicklink-folders.fields.order_index.read','quicklink-folders.read',false,false,false,1),
('quicklink-folders.fields.order_index.update','quicklink-folders.control',true,false,false,1),
('quicklink-folders.fields.scope.read','quicklink-folders.read',false,false,false,1),
('quicklink-folders.fields.scope.update','quicklink-folders.control',true,false,false,1),
('quicklink-folders.fields.user_id.read','quicklink-folders.read',false,false,false,1),
('quicklink-folders.fields.user_id.update','quicklink-folders.control',true,false,false,1),
('quicklink-folders.fields.org_id.read','quicklink-folders.read',false,false,false,1),
('quicklink-folders.fields.org_id.update','quicklink-folders.control',true,false,false,1),
('quicklink-folders.fields.created_at.read','quicklink-folders.read',false,false,false,1),
('short-urls.read','sections.workspace.read',false,false,false,1),
('short-urls.control','sections.workspace.update',true,false,false,1),
('short-urls.create','short-urls.control',true,false,false,1),
('short-urls.update','short-urls.control',true,false,false,1),
('short-urls.delete','short-urls.control',true,false,false,1),
('short-urls.reveal','short-urls.read',false,true,false,1),
('short-urls.fields.id.read','short-urls.read',false,false,false,1),
('short-urls.fields.user_id.read','short-urls.read',false,false,false,1),
('short-urls.fields.user_id.update','short-urls.control',true,false,false,1),
('short-urls.fields.visibility.read','short-urls.read',false,false,false,1),
('short-urls.fields.visibility.update','short-urls.control',true,false,false,1),
('short-urls.fields.short_code.read','short-urls.read',false,true,false,1),
('short-urls.fields.short_code.update','short-urls.control',true,false,false,1),
('short-urls.fields.target_url.read','short-urls.read',false,true,false,1),
('short-urls.fields.target_url.update','short-urls.control',true,false,false,1),
('short-urls.fields.clicks.read','short-urls.read',false,false,false,1),
('short-urls.fields.clicks.update','short-urls.control',true,false,false,1),
('short-urls.fields.org_id.read','short-urls.read',false,false,false,1),
('short-urls.fields.org_id.update','short-urls.control',true,false,false,1),
('short-urls.fields.created_at.read','short-urls.read',false,false,false,1),
('dashboard-todos.read','sections.workspace.read',false,false,false,1),
('dashboard-todos.control','sections.workspace.update',true,false,false,1),
('dashboard-todos.create','dashboard-todos.control',true,false,false,1),
('dashboard-todos.update','dashboard-todos.control',true,false,false,1),
('dashboard-todos.delete','dashboard-todos.control',true,false,false,1),
('dashboard-todos.fields.id.read','dashboard-todos.read',false,false,false,1),
('dashboard-todos.fields.user_id.read','dashboard-todos.read',false,false,false,1),
('dashboard-todos.fields.user_id.update','dashboard-todos.control',true,false,false,1),
('dashboard-todos.fields.title.read','dashboard-todos.read',false,false,false,1),
('dashboard-todos.fields.title.update','dashboard-todos.control',true,false,false,1),
('dashboard-todos.fields.note.read','dashboard-todos.read',false,false,false,1),
('dashboard-todos.fields.note.update','dashboard-todos.control',true,false,false,1),
('dashboard-todos.fields.completed.read','dashboard-todos.read',false,false,false,1),
('dashboard-todos.fields.completed.update','dashboard-todos.control',true,false,false,1),
('dashboard-todos.fields.sort_order.read','dashboard-todos.read',false,false,false,1),
('dashboard-todos.fields.sort_order.update','dashboard-todos.control',true,false,false,1),
('dashboard-todos.fields.completed_at.read','dashboard-todos.read',false,false,false,1),
('dashboard-todos.fields.completed_at.update','dashboard-todos.control',true,false,false,1),
('dashboard-todos.fields.created_at.read','dashboard-todos.read',false,false,false,1),
('dashboard-todos.fields.updated_at.read','dashboard-todos.read',false,false,false,1),
('plugin-installations.read','sections.integrations.read',false,false,false,1),
('plugin-installations.control','sections.integrations.update',true,false,false,1),
('plugin-installations.create','plugin-installations.control',true,false,false,1),
('plugin-installations.update','plugin-installations.control',true,false,false,1),
('plugin-installations.delete','plugin-installations.control',true,false,false,1),
('plugin-installations.fields.user_id.read','plugin-installations.read',false,false,false,1),
('plugin-installations.fields.user_id.update','plugin-installations.control',true,false,false,1),
('plugin-installations.fields.plugin_id.read','plugin-installations.read',false,false,false,1),
('plugin-installations.fields.plugin_id.update','plugin-installations.control',true,false,false,1),
('plugin-installations.fields.dashboard_enabled.read','plugin-installations.read',false,false,false,1),
('plugin-installations.fields.dashboard_enabled.update','plugin-installations.control',true,false,false,1),
('plugin-installations.fields.dashboard_order.read','plugin-installations.read',false,false,false,1),
('plugin-installations.fields.dashboard_order.update','plugin-installations.control',true,false,false,1),
('plugin-installations.fields.installed_at.read','plugin-installations.read',false,false,false,1),
('plugin-installations.fields.updated_at.read','plugin-installations.read',false,false,false,1),
('classdash-settings.read','sections.integrations.read',false,false,false,1),
('classdash-settings.control','sections.integrations.update',true,false,false,1),
('classdash-settings.create','classdash-settings.control',true,false,false,1),
('classdash-settings.update','classdash-settings.control',true,false,false,1),
('classdash-settings.delete','classdash-settings.control',true,false,false,1),
('classdash-settings.fields.user_id.read','classdash-settings.read',false,false,false,1),
('classdash-settings.fields.user_id.update','classdash-settings.control',true,false,false,1),
('classdash-settings.fields.dorm_name.read','classdash-settings.read',false,false,false,1),
('classdash-settings.fields.dorm_name.update','classdash-settings.control',true,false,false,1),
('classdash-settings.fields.dorm_lat.read','classdash-settings.read',false,false,false,1),
('classdash-settings.fields.dorm_lat.update','classdash-settings.control',true,false,false,1),
('classdash-settings.fields.dorm_lng.read','classdash-settings.read',false,false,false,1),
('classdash-settings.fields.dorm_lng.update','classdash-settings.control',true,false,false,1),
('classdash-settings.fields.walking_speed_kph.read','classdash-settings.read',false,false,false,1),
('classdash-settings.fields.walking_speed_kph.update','classdash-settings.control',true,false,false,1),
('classdash-settings.fields.created_at.read','classdash-settings.read',false,false,false,1),
('classdash-settings.fields.updated_at.read','classdash-settings.read',false,false,false,1),
('classdash-classes.read','sections.integrations.read',false,false,false,1),
('classdash-classes.control','sections.integrations.update',true,false,false,1),
('classdash-classes.create','classdash-classes.control',true,false,false,1),
('classdash-classes.update','classdash-classes.control',true,false,false,1),
('classdash-classes.delete','classdash-classes.control',true,false,false,1),
('classdash-classes.fields.id.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.user_id.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.user_id.update','classdash-classes.control',true,false,false,1),
('classdash-classes.fields.code.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.code.update','classdash-classes.control',true,false,false,1),
('classdash-classes.fields.title.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.title.update','classdash-classes.control',true,false,false,1),
('classdash-classes.fields.section.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.section.update','classdash-classes.control',true,false,false,1),
('classdash-classes.fields.days.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.days.update','classdash-classes.control',true,false,false,1),
('classdash-classes.fields.start_time.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.start_time.update','classdash-classes.control',true,false,false,1),
('classdash-classes.fields.end_time.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.end_time.update','classdash-classes.control',true,false,false,1),
('classdash-classes.fields.location_name.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.location_name.update','classdash-classes.control',true,false,false,1),
('classdash-classes.fields.location_lat.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.location_lat.update','classdash-classes.control',true,false,false,1),
('classdash-classes.fields.location_lng.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.location_lng.update','classdash-classes.control',true,false,false,1),
('classdash-classes.fields.term_start.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.term_start.update','classdash-classes.control',true,false,false,1),
('classdash-classes.fields.term_end.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.term_end.update','classdash-classes.control',true,false,false,1),
('classdash-classes.fields.sort_order.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.sort_order.update','classdash-classes.control',true,false,false,1),
('classdash-classes.fields.created_at.read','classdash-classes.read',false,false,false,1),
('classdash-classes.fields.updated_at.read','classdash-classes.read',false,false,false,1),
('launcher-devices.read','sections.integrations.read',false,false,false,1),
('launcher-devices.control','sections.integrations.update',true,false,false,1),
('launcher-devices.revoke','launcher-devices.control',true,false,false,1),
('launcher-devices.fields.id.read','launcher-devices.read',false,false,false,1),
('launcher-devices.fields.device_identifier.read','launcher-devices.read',false,false,false,1),
('launcher-devices.fields.owner_id.read','launcher-devices.read',false,false,false,1),
('launcher-devices.fields.device_name.read','launcher-devices.read',false,false,false,1),
('launcher-devices.fields.scopes.read','launcher-devices.read',false,false,false,1),
('launcher-devices.fields.approved_at.read','launcher-devices.read',false,false,false,1),
('launcher-devices.fields.last_used_at.read','launcher-devices.read',false,false,false,1),
('launcher-devices.fields.revoked_at.read','launcher-devices.read',false,false,false,1),
('launcher-devices.fields.updated_at.read','launcher-devices.read',false,false,false,1),
('launcher-pairings.read','sections.integrations.read',false,false,false,1),
('launcher-pairings.control','sections.integrations.update',true,false,false,1),
('launcher-pairings.cancel','launcher-pairings.control',true,false,false,1),
('launcher-pairings.fields.id.read','launcher-pairings.read',false,false,false,1),
('launcher-pairings.fields.device_identifier.read','launcher-pairings.read',false,false,false,1),
('launcher-pairings.fields.device_name.read','launcher-pairings.read',false,false,false,1),
('launcher-pairings.fields.status.read','launcher-pairings.read',false,false,false,1),
('launcher-pairings.fields.owner_id.read','launcher-pairings.read',false,false,false,1),
('launcher-pairings.fields.device_id.read','launcher-pairings.read',false,false,false,1),
('launcher-pairings.fields.created_at.read','launcher-pairings.read',false,false,false,1),
('launcher-pairings.fields.expires_at.read','launcher-pairings.read',false,false,false,1),
('launcher-pairings.fields.approved_at.read','launcher-pairings.read',false,false,false,1),
('launcher-pairings.fields.exchanged_at.read','launcher-pairings.read',false,false,false,1),
('launcher-pairings.fields.last_poll_at.read','launcher-pairings.read',false,false,false,1),
('launcher-pairings.fields.poll_count.read','launcher-pairings.read',false,false,false,1),
('launcher-pairings.fields.updated_at.read','launcher-pairings.read',false,false,false,1),
('help-articles.read','sections.platform.read',false,false,false,1),
('help-articles.control','sections.platform.update',true,false,false,1),
('help-articles.create','help-articles.control',true,false,false,1),
('help-articles.update','help-articles.control',true,false,false,1),
('help-articles.delete','help-articles.control',true,false,false,1),
('help-articles.fields.id.read','help-articles.read',false,false,false,1),
('help-articles.fields.slug.read','help-articles.read',false,false,false,1),
('help-articles.fields.slug.update','help-articles.control',true,false,false,1),
('help-articles.fields.title.read','help-articles.read',false,false,false,1),
('help-articles.fields.title.update','help-articles.control',true,false,false,1),
('help-articles.fields.summary.read','help-articles.read',false,false,false,1),
('help-articles.fields.summary.update','help-articles.control',true,false,false,1),
('help-articles.fields.content.read','help-articles.read',false,false,false,1),
('help-articles.fields.content.update','help-articles.control',true,false,false,1),
('help-articles.fields.is_published.read','help-articles.read',false,false,false,1),
('help-articles.fields.is_published.update','help-articles.control',true,false,false,1),
('help-articles.fields.sort_order.read','help-articles.read',false,false,false,1),
('help-articles.fields.sort_order.update','help-articles.control',true,false,false,1),
('help-articles.fields.created_at.read','help-articles.read',false,false,false,1),
('help-articles.fields.updated_at.read','help-articles.read',false,false,false,1),
('dashboard-alerts.read','sections.banner.read',false,false,false,1),
('dashboard-alerts.control','sections.banner.update',true,false,false,1),
('dashboard-alerts.create','dashboard-alerts.control',true,false,false,1),
('dashboard-alerts.update','dashboard-alerts.control',true,false,false,1),
('dashboard-alerts.delete','dashboard-alerts.control',true,false,false,1),
('dashboard-alerts.fields.id.read','dashboard-alerts.read',false,false,false,1),
('dashboard-alerts.fields.title.read','dashboard-alerts.read',false,false,false,1),
('dashboard-alerts.fields.title.update','dashboard-alerts.control',true,false,false,1),
('dashboard-alerts.fields.color.read','dashboard-alerts.read',false,false,false,1),
('dashboard-alerts.fields.color.update','dashboard-alerts.control',true,false,false,1),
('dashboard-alerts.fields.message.read','dashboard-alerts.read',false,false,false,1),
('dashboard-alerts.fields.message.update','dashboard-alerts.control',true,false,false,1),
('dashboard-alerts.fields.enabled.read','dashboard-alerts.read',false,false,false,1),
('dashboard-alerts.fields.enabled.update','dashboard-alerts.control',true,false,false,1),
('dashboard-alerts.fields.user_ids.read','dashboard-alerts.read',false,false,false,1),
('dashboard-alerts.fields.user_ids.update','dashboard-alerts.control',true,false,false,1),
('dashboard-alerts.fields.org_ids.read','dashboard-alerts.read',false,false,false,1),
('dashboard-alerts.fields.org_ids.update','dashboard-alerts.control',true,false,false,1),
('dashboard-alerts.fields.starts_at.read','dashboard-alerts.read',false,false,false,1),
('dashboard-alerts.fields.starts_at.update','dashboard-alerts.control',true,false,false,1),
('dashboard-alerts.fields.ends_at.read','dashboard-alerts.read',false,false,false,1),
('dashboard-alerts.fields.ends_at.update','dashboard-alerts.control',true,false,false,1),
('dashboard-alerts.fields.created_at.read','dashboard-alerts.read',false,false,false,1),
('app-settings.read','sections.banner.read',false,false,false,1),
('app-settings.control','sections.banner.update',true,false,false,1),
('app-settings.update','app-settings.control',true,false,false,1),
('app-settings.fields.id.read','app-settings.read',false,false,false,1),
('app-settings.fields.banner_enabled.read','app-settings.read',false,false,false,1),
('app-settings.fields.banner_enabled.update','app-settings.control',true,false,false,1),
('app-settings.fields.banner_text.read','app-settings.read',false,false,false,1),
('app-settings.fields.banner_text.update','app-settings.control',true,false,false,1),
('app-settings.fields.banner_starts_at.read','app-settings.read',false,false,false,1),
('app-settings.fields.banner_starts_at.update','app-settings.control',true,false,false,1),
('app-settings.fields.banner_ends_at.read','app-settings.read',false,false,false,1),
('app-settings.fields.banner_ends_at.update','app-settings.control',true,false,false,1),
('app-settings.fields.help_docs.read','app-settings.read',false,false,false,1),
('app-settings.fields.help_docs.update','app-settings.control',true,false,false,1),
('app-settings.fields.updated_at.read','app-settings.read',false,false,false,1),
('admin-access-requests.read','sections.reviews.read',false,false,true,1),
('admin-access-requests.control','sections.reviews.update',true,false,true,1),
('admin-access-requests.approve-admin','admin-access-requests.control',true,false,true,1),
('admin-access-requests.reject-admin','admin-access-requests.control',true,false,true,1),
('admin-access-requests.fields.proposed_preset.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.proposed_version.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.proposed_grants.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.proposed_revision.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.id.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.request_kind.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.target_user_id.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.requested_by.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.requested_by_email.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.reason.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.status.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.reviewed_by.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.review_reason.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.created_at.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.reviewed_at.read','admin-access-requests.read',false,false,true,1),
('admin-access-requests.fields.updated_at.read','admin-access-requests.read',false,false,true,1),
('audit-log.read','sections.audit.read',false,false,false,1),
('audit-log.control','sections.audit.update',true,false,false,1),
('audit-log.fields.id.read','audit-log.read',false,false,false,1),
('audit-log.fields.operation_id.read','audit-log.read',false,false,false,1),
('audit-log.fields.actor_id.read','audit-log.read',false,false,false,1),
('audit-log.fields.actor_email.read','audit-log.read',false,false,true,1),
('audit-log.fields.action.read','audit-log.read',false,false,false,1),
('audit-log.fields.resource.read','audit-log.read',false,false,false,1),
('audit-log.fields.target_ids.read','audit-log.read',false,false,true,1),
('audit-log.fields.reason.read','audit-log.read',false,false,true,1),
('audit-log.fields.changed_fields.read','audit-log.read',false,false,true,1),
('audit-log.fields.before_data.read','audit-log.read',false,false,true,1),
('audit-log.fields.after_data.read','audit-log.read',false,false,true,1),
('audit-log.fields.status.read','audit-log.read',false,false,false,1),
('audit-log.fields.error_code.read','audit-log.read',false,false,true,1),
('audit-log.fields.created_at.read','audit-log.read',false,false,false,1),
('audit-log.fields.completed_at.read','audit-log.read',false,false,false,1),
('users.background-view','users.read',false,false,false,1),
('users.background-write','users.control',true,false,false,1);

insert into public.admin_permission_assignments(user_id,preset,preset_version) select id,'full',1 from public.profiles where app_admin and not app_owner;
insert into public.admin_permission_grants(user_id,permission_key) select a.user_id,c.key from public.admin_permission_assignments a cross join public.admin_permission_catalog c where not c.owner_only;
insert into public.admin_audit_log(operation_id,action,resource,target_ids,reason,status,after_data,completed_at)
select gen_random_uuid(),'permission-backfill','users',array[user_id::text],'Explicit v1 operational grants; permission management is now owner-only','succeeded',jsonb_build_object('preset','full','catalog_version',1),now() from public.admin_permission_assignments;

create function public.admin_has_permission(p_user uuid,p_key text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare item public.admin_permission_catalog; resource_key text;
begin
 select * into item from public.admin_permission_catalog where key=p_key;
 if not found then return false; end if;
 if not exists(select 1 from public.profiles where id=p_user and app_admin) or exists(select 1 from public.account_ban_state where user_id=p_user and banned_until>now()) then return false; end if;
 if exists(select 1 from public.profiles where id=p_user and app_owner) then return true; end if;
 if item.owner_only or not exists(select 1 from public.admin_permission_grants where user_id=p_user and permission_key=p_key) then return false; end if;
 if item.parent is not null and not public.admin_has_permission(p_user,item.parent) then return false; end if;
 if p_key='users.background-write' and not public.admin_has_permission(p_user,'users.background-view') then return false; end if;
 resource_key:=split_part(p_key,'.',1);
 if resource_key<>'sections' and p_key<>resource_key||'.read' and not public.admin_has_permission(p_user,resource_key||'.read') then return false; end if;
 if p_key like '%.fields.%.update' and not public.admin_has_permission(p_user,regexp_replace(p_key,'[.]update$','.read')) then return false; end if;
 return true;
end $$;
revoke all on function public.admin_has_permission(uuid,text) from public,anon,authenticated;

create function public.admin_replace_permissions(p_actor uuid,p_target uuid,p_revision integer,p_preset text,p_version integer,p_grants text[],p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_revision integer; grant_key text; before_state jsonb;
begin
 perform 1 from public.profiles where id=p_actor and app_owner and app_admin for update;
 if not found or exists(select 1 from public.account_ban_state where user_id=p_actor and banned_until>now()) then raise exception 'OWNER_REVIEW_REQUIRED' using errcode='42501'; end if;
 perform 1 from public.profiles where id=p_target and not app_owner for update;
 if not found then raise exception 'OWNER_ACCOUNT_PROTECTED' using errcode='42501'; end if;
 select revision,to_jsonb(a) into current_revision,before_state from public.admin_permission_assignments a where user_id=p_target;
 if p_revision is null or coalesce(current_revision,0)<>p_revision then raise exception 'PERMISSION_REVISION_CONFLICT' using errcode='40001'; end if;
 if p_preset not in ('standard','custom','read-only','full') or p_version<>1 or p_grants is null then raise exception 'INVALID_PERMISSIONS'; end if;
 if length(btrim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'REASON_REQUIRED'; end if;
 if exists(select 1 from unnest(p_grants) g left join public.admin_permission_catalog c on c.key=g where c.key is null or c.owner_only) then raise exception 'INVALID_PERMISSIONS'; end if;
 if p_preset in ('read-only','full') and (
   exists(select key from public.admin_permission_catalog where not owner_only and (p_preset='full' or (not is_write and not protected)) except select unnest(p_grants))
   or exists(select unnest(p_grants) except select key from public.admin_permission_catalog where not owner_only and (p_preset='full' or (not is_write and not protected)))
 ) then raise exception 'INVALID_PRESET_GRANTS'; end if;
 if p_preset='standard' and cardinality(p_grants)>0 then raise exception 'INVALID_PERMISSIONS'; end if;
 insert into public.admin_permission_assignments(user_id,preset,preset_version,revision,updated_by) values(p_target,p_preset,p_version,coalesce(current_revision,0)+1,p_actor)
 on conflict(user_id) do update set preset=excluded.preset,preset_version=excluded.preset_version,revision=excluded.revision,updated_by=p_actor,updated_at=now();
 delete from public.admin_permission_grants where user_id=p_target;
 insert into public.admin_permission_grants select p_target,g from (select distinct unnest(p_grants) g) keys;
 update public.profiles set app_admin=(p_preset<>'standard') where id=p_target;
 foreach grant_key in array p_grants loop
   if not public.admin_has_permission(p_target,grant_key) then raise exception 'INVALID_PERMISSION_DEPENDENCIES'; end if;
 end loop;
 insert into public.admin_audit_log(operation_id,actor_id,action,resource,target_ids,reason,status,before_data,after_data,completed_at)
 values(gen_random_uuid(),p_actor,'set-access','users',array[p_target::text],btrim(p_reason),'succeeded',before_state,jsonb_build_object('preset',p_preset,'permissions',p_grants,'revision',coalesce(current_revision,0)+1),now());
 return jsonb_build_object('revision',coalesce(current_revision,0)+1,'preset',p_preset);
end $$;
revoke all on function public.admin_replace_permissions(uuid,uuid,integer,text,integer,text[],text) from public,anon,authenticated;
grant execute on function public.admin_replace_permissions(uuid,uuid,integer,text,integer,text[],text) to service_role;

alter table public.admin_access_requests add column proposed_preset text, add column proposed_version integer, add column proposed_grants text[], add column proposed_revision integer;
-- Preserve the existing deletion transaction; promotions must carry an explicit reviewed snapshot.
create or replace function public.admin_review_access_request(
  p_request_id uuid,
  p_reviewer_id uuid,
  p_decision text,
  p_review_reason text
)
returns public.admin_access_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.admin_access_requests;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_REVIEW_DECISION' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_review_reason, ''))) not between 3 and 500 then
    raise exception 'REASON_REQUIRED' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_reviewer_id and app_owner = true
  ) then
    raise exception 'OWNER_REVIEW_REQUIRED'
      using errcode = '42501';
  end if;

  select * into request_row
  from public.admin_access_requests
  where id = p_request_id
  for update;

  if request_row.id is null then
    raise exception 'TARGET_NOT_FOUND' using errcode = 'P0002';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'REQUEST_NOT_PENDING' using errcode = '23505';
  end if;

  if p_decision = 'approved' then
    perform pg_advisory_xact_lock(hashtextextended('public.profiles.admin_reviews', 0));
    perform 1 from public.profiles where id = request_row.target_user_id for update;
    if not found then
      raise exception 'TARGET_NOT_FOUND' using errcode = 'P0002';
    end if;
    if request_row.request_kind = 'account_deletion' then
      if request_row.target_user_id = p_reviewer_id then
        raise exception 'SELF_LOCKOUT_BLOCKED' using errcode = '42501';
      end if;
      if exists (select 1 from public.profiles where id = request_row.target_user_id and app_owner) then
        raise exception 'OWNER_ACCOUNT_PROTECTED' using errcode = '42501';
      end if;
      if (select count(*) from public.profiles where app_admin) <= 1
        and exists (select 1 from public.profiles where id = request_row.target_user_id and app_admin) then
        raise exception 'LAST_ADMIN_BLOCKED' using errcode = '42501';
      end if;
      -- Check ownership independently of profile.org_id: legacy failed setup
      -- could insert an organization without assigning the owner's profile.
      if exists (select 1 from public.organizations where owner_id = request_row.target_user_id) then
        raise exception 'ACCOUNT_OWNS_ORGANIZATION' using errcode = '23503';
      end if;
      -- Account deletion and approval commit together; failures roll both back.
      delete from auth.users where id = request_row.target_user_id;
      if not found then
        raise exception 'TARGET_NOT_FOUND' using errcode = 'P0002';
      end if;
    else
      if request_row.proposed_preset is null or request_row.proposed_grants is null then raise exception 'INVALID_PERMISSION_CHOICE_REQUIRED'; end if;
      perform public.admin_replace_permissions(p_reviewer_id,request_row.target_user_id,request_row.proposed_revision,request_row.proposed_preset,request_row.proposed_version,request_row.proposed_grants,p_review_reason);
    end if;
  end if;

  update public.admin_access_requests
  set status = p_decision,
      reviewed_by = p_reviewer_id,
      review_reason = btrim(p_review_reason),
      reviewed_at = now(),
      updated_at = now()
  where id = p_request_id
  returning * into request_row;

  return request_row;
end;
$$;

revoke all on function public.admin_review_access_request(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_review_access_request(uuid, uuid, text, text)
  to service_role;


-- Direct browser feature reads cannot project arbitrary columns. Require visibility of every
-- column in this legacy path; granular reads/writes use the authenticated admin API.
create function public.admin_features_direct(p_action text) returns boolean language sql stable security definer set search_path='' as $$
 select public.admin_has_permission(auth.uid(),'features.'||p_action)
 and not exists(select 1 from public.admin_permission_catalog where key like 'features.fields.%.read' and not public.admin_has_permission(auth.uid(),key))
 and (p_action='read' or not exists(select 1 from public.admin_permission_catalog where key like 'features.fields.%.update' and not public.admin_has_permission(auth.uid(),key)));
$$;
revoke all on function public.admin_features_direct(text) from public,anon;
grant execute on function public.admin_features_direct(text) to authenticated;
do $$ declare p record; begin for p in select policyname from pg_policies where schemaname='public' and tablename='admin_feature_ideas' loop execute format('drop policy %I on public.admin_feature_ideas',p.policyname); end loop; end $$;
create policy features_read on public.admin_feature_ideas for select to authenticated using(public.admin_features_direct('read'));
create policy features_create on public.admin_feature_ideas for insert to authenticated with check(created_by=auth.uid() and public.admin_features_direct('create'));
create policy features_update on public.admin_feature_ideas for update to authenticated using(public.admin_features_direct('update')) with check(public.admin_features_direct('update'));

-- Preserve normal-account storage policies; replace only the administrative bypass.
drop policy "Admins manage non-owner backgrounds" on storage.objects;
create or replace function public.can_admin_background(object_name text) returns boolean language sql stable security definer set search_path=public as $$
 select public.admin_has_permission(auth.uid(),'users.background-view')
 and exists(select 1 from public.profiles target where object_name=target.id::text||'/background' and (not target.app_owner or exists(select 1 from public.profiles actor where actor.id=auth.uid() and actor.app_owner)));
$$;
create function public.can_write_admin_background(object_name text) returns boolean language sql stable security definer set search_path=public as $$
 select public.can_admin_background(object_name) and public.admin_has_permission(auth.uid(),'users.background-write');
$$;
revoke all on function public.can_write_admin_background(text) from public,anon;
grant execute on function public.can_write_admin_background(text) to authenticated;
create policy admin_background_read on storage.objects for select to authenticated using(bucket_id='dashboard-backgrounds' and public.can_admin_background(name));
create policy admin_background_insert on storage.objects for insert to authenticated with check(bucket_id='dashboard-backgrounds' and public.can_write_admin_background(name));
create policy admin_background_update on storage.objects for update to authenticated using(bucket_id='dashboard-backgrounds' and public.can_write_admin_background(name)) with check(bucket_id='dashboard-backgrounds' and public.can_write_admin_background(name));
create policy admin_background_delete on storage.objects for delete to authenticated using(bucket_id='dashboard-backgrounds' and public.can_write_admin_background(name));
commit;
