export type AdminFieldType = "text" | "textarea" | "number" | "boolean" | "datetime" | "date" | "time" | "json" | "select";

export type AdminField = {
  name: string;
  label: string;
  type: AdminFieldType;
  editable?: boolean;
  create?: boolean;
  required?: boolean;
  sensitive?: boolean;
  auditReveal?: boolean;
  options?: string[];
};

export type AdminResource = {
  key: string;
  label: string;
  group: "people" | "organizations" | "projects" | "content" | "utilities" | "integrations" | "platform" | "reviews" | "audit";
  table: string;
  primaryKey: string;
  fields: AdminField[];
  searchFields: string[];
  filterFields?: string[];
  defaultSort: string;
  sortFields: string[];
  readOnly?: boolean;
  guided?: "users" | "launcher-device" | "launcher-pairing" | "admin-review" | "audit" | "activity";
};

export type AdminReferenceTarget = {
  resource: string;
  labelFields: string[];
};

export type AdminAccountScope =
  | "self" | "organizations" | "projects" | "project-related"
  | "user" | "organization" | "user-or-organization" | "owner" | "actor";

const REFERENCE_FIELDS: Record<string, AdminReferenceTarget> = {
  user_id: { resource: "users", labelFields: ["display_name", "email"] },
  target_user_id: { resource: "users", labelFields: ["display_name", "email"] },
  owner_id: { resource: "users", labelFields: ["display_name", "email"] },
  actor_id: { resource: "users", labelFields: ["display_name", "email"] },
  requested_by: { resource: "users", labelFields: ["display_name", "email"] },
  reviewed_by: { resource: "users", labelFields: ["display_name", "email"] },
  org_id: { resource: "organizations", labelFields: ["name"] },
  organization_id: { resource: "organizations", labelFields: ["name"] },
  project_id: { resource: "projects", labelFields: ["name"] },
  column_id: { resource: "project-board-columns", labelFields: ["name"] },
  folder_id: { resource: "quicklink-folders", labelFields: ["name"] },
  device_id: { resource: "launcher-devices", labelFields: ["device_name"] },
};

export function referenceTarget(resourceKey: string, fieldName: string): AdminReferenceTarget | null {
  if (resourceKey === "project-files" && fieldName === "parent_id") {
    return { resource: "project-files", labelFields: ["name"] };
  }
  return REFERENCE_FIELDS[fieldName] || null;
}

const REFERENCE_LABELS: Record<string, string> = {
  user_id: "User",
  target_user_id: "Requested administrator",
  owner_id: "Owner",
  actor_id: "Administrator",
  requested_by: "Requested by",
  reviewed_by: "Reviewed by",
  org_id: "Organization",
  organization_id: "Organization",
  project_id: "Project",
  column_id: "Board column",
  folder_id: "Folder",
  parent_id: "Parent item",
  device_id: "Device",
};

const f = (
  name: string,
  label: string,
  type: AdminFieldType = "text",
  options: Partial<AdminField> = {},
): AdminField => ({ name, label: REFERENCE_LABELS[name] || label, type, ...options });

const timestamps = [f("created_at", "Created", "datetime"), f("updated_at", "Updated", "datetime")];

export const ADMIN_RESOURCES: Record<string, AdminResource> = {
  users: {
    key: "users", label: "Users", group: "people", table: "profiles", primaryKey: "id", guided: "users",
    searchFields: ["email", "display_name"], filterFields: ["role", "app_admin", "org_id"], defaultSort: "created_at",
    sortFields: ["created_at", "updated_at", "email", "display_name", "role"],
    fields: [
      f("id", "User ID"), f("email", "Email", "text", { editable: true, create: true, required: true }),
      f("temporary_password", "Temporary password", "text", { create: true, required: true, sensitive: true }),
      f("display_name", "Display name", "text", { editable: true, create: true }),
      f("org_id", "Organization ID", "text", { editable: true, create: true }),
      f("role", "Organization role", "select", { editable: true, create: true, options: ["member", "admin", "owner"] }),
      f("app_admin", "App admin", "boolean"), f("app_owner", "App owner", "boolean"),
      f("email_confirmed_at", "Email confirmed", "datetime"), f("last_sign_in_at", "Last sign in", "datetime"),
      f("banned_until", "Banned until", "datetime"), f("force_password_change", "Must change password", "boolean"),
      ...timestamps,
    ],
  },
  organizations: {
    key: "organizations", label: "Organizations", group: "organizations", table: "organizations", primaryKey: "id",
    searchFields: ["name"], filterFields: ["owner_id"], defaultSort: "created_at", sortFields: ["created_at", "name"],
    fields: [f("id", "ID"), f("name", "Name", "text", { editable: true, create: true, required: true }),
      f("code", "Join code", "text", { sensitive: true, auditReveal: false }), f("owner_id", "Owner ID", "text", { create: true, required: true }), f("created_at", "Created", "datetime")],
  },
  projects: {
    key: "projects", label: "Projects", group: "projects", table: "projects", primaryKey: "id",
    searchFields: ["name", "description"], filterFields: ["status", "org_id", "user_id", "ai_plan_unlimited"], defaultSort: "updated_at",
    sortFields: ["updated_at", "created_at", "name", "status", "ai_plan_usage_count"],
    fields: [f("id", "ID"), f("name", "Name", "text", { editable: true, create: true, required: true }),
      f("description", "Description", "textarea", { editable: true, create: true }), f("url", "URL", "text", { editable: true, create: true }),
      f("status", "Status", "select", { editable: true, create: true, options: ["planning", "active", "review", "completed", "archived"] }),
      f("tags", "Tags", "json", { editable: true, create: true }), f("org_id", "Organization ID", "text", { editable: true, create: true }),
      f("user_id", "Personal owner ID", "text", { editable: true, create: true }),
      f("ai_plan_usage_count", "AI usage count", "number", { editable: true }), f("ai_plan_unlimited", "Unlimited AI", "boolean", { editable: true }), ...timestamps],
  },
  "project-board-columns": {
    key: "project-board-columns", label: "Board columns", group: "projects", table: "project_board_columns", primaryKey: "id",
    searchFields: ["name"], filterFields: ["project_id", "archived"], defaultSort: "updated_at", sortFields: ["updated_at", "created_at", "position", "name"],
    fields: [f("id", "ID"), f("project_id", "Project ID", "text", { editable: true, create: true, required: true }), f("name", "Name", "text", { editable: true, create: true, required: true }), f("position", "Position", "number", { editable: true, create: true }), f("archived", "Archived", "boolean", { editable: true, create: true }), ...timestamps],
  },
  "project-board-cards": {
    key: "project-board-cards", label: "Board cards", group: "projects", table: "project_board_cards", primaryKey: "id",
    searchFields: ["title", "description", "assignee_name"], filterFields: ["project_id", "column_id", "priority", "archived", "completed"], defaultSort: "updated_at", sortFields: ["updated_at", "created_at", "position", "title", "due_date"],
    fields: [f("id", "ID"), f("project_id", "Project ID", "text", { editable: true, create: true, required: true }), f("column_id", "Column ID", "text", { editable: true, create: true, required: true }), f("title", "Title", "text", { editable: true, create: true, required: true }), f("description", "Description", "textarea", { editable: true, create: true }), f("priority", "Priority", "select", { editable: true, create: true, options: ["none", "low", "medium", "high"] }), f("due_date", "Due date", "datetime", { editable: true, create: true }), f("assignee_name", "Assignee", "text", { editable: true, create: true }), f("position", "Position", "number", { editable: true, create: true }), f("archived", "Archived", "boolean", { editable: true, create: true }), f("completed", "Completed", "boolean", { editable: true, create: true }), ...timestamps],
  },
  "project-planner-steps": {
    key: "project-planner-steps", label: "Planner steps", group: "projects", table: "project_planner_steps", primaryKey: "id",
    searchFields: ["title", "description"], filterFields: ["project_id", "completed", "archived", "ai_generated"], defaultSort: "updated_at", sortFields: ["updated_at", "created_at", "position", "title", "due_date"],
    fields: [f("id", "ID"), f("project_id", "Project ID", "text", { editable: true, create: true, required: true }), f("title", "Title", "text", { editable: true, create: true, required: true }), f("description", "Description", "textarea", { editable: true, create: true }), f("completed", "Completed", "boolean", { editable: true, create: true }), f("position", "Position", "number", { editable: true, create: true }), f("archived", "Archived", "boolean", { editable: true, create: true }), f("ai_generated", "AI generated", "boolean", { editable: true, create: true }), f("due_date", "Due date", "datetime", { editable: true, create: true }), ...timestamps],
  },
  "project-resources": {
    key: "project-resources", label: "Project resources", group: "projects", table: "project_resources", primaryKey: "id",
    searchFields: ["title", "description", "url"], filterFields: ["project_id", "category"], defaultSort: "updated_at", sortFields: ["updated_at", "created_at", "position", "title", "category"],
    fields: [f("id", "ID"), f("project_id", "Project ID", "text", { editable: true, create: true, required: true }), f("title", "Title", "text", { editable: true, create: true, required: true }), f("url", "URL", "text", { editable: true, create: true }), f("description", "Description", "textarea", { editable: true, create: true }), f("category", "Category", "select", { editable: true, create: true, options: ["documentation", "design", "reference", "tool", "code", "other", "quick_links"] }), f("position", "Position", "number", { editable: true, create: true }), f("favicon_url", "Favicon URL", "text", { editable: true, create: true }), ...timestamps],
  },
  "project-files": {
    key: "project-files", label: "Project files", group: "projects", table: "project_files", primaryKey: "id",
    searchFields: ["name"], filterFields: ["project_id", "type", "parent_id"], defaultSort: "updated_at", sortFields: ["updated_at", "created_at", "sort_index", "name", "type"],
    fields: [f("id", "ID"), f("project_id", "Project ID", "text", { editable: true, create: true, required: true }), f("type", "Type", "select", { editable: true, create: true, options: ["folder", "doc", "upload"] }), f("name", "Name", "text", { editable: true, create: true, required: true }), f("parent_id", "Parent ID", "text", { editable: true, create: true }), f("sort_index", "Sort index", "number", { editable: true, create: true }), f("content", "Document content", "textarea", { editable: true, create: true, sensitive: true }), f("meta", "Metadata", "json"), ...timestamps],
  },
  "project-activity": {
    key: "project-activity", label: "Project activity", group: "projects", table: "project_activity_log", primaryKey: "id", readOnly: true, guided: "activity",
    searchFields: ["action_type", "description"], filterFields: ["project_id", "action_type"], defaultSort: "created_at", sortFields: ["created_at", "action_type"],
    fields: [f("id", "ID"), f("project_id", "Project ID"), f("action_type", "Action"), f("description", "Description"), f("metadata", "Metadata", "json", { sensitive: true }), f("created_at", "Created", "datetime")],
  },
  pastes: {
    key: "pastes", label: "Pastes", group: "content", table: "pastes", primaryKey: "id", searchFields: ["title", "language"], filterFields: ["user_id", "org_id", "scope_personal", "scope_org", "scope_public", "visibility"], defaultSort: "created_at", sortFields: ["created_at", "title", "views", "expires_at"],
    fields: [f("id", "ID"), f("paste_code", "Paste code", "text", { sensitive: true, editable: true, create: true }), f("title", "Title", "text", { editable: true, create: true }), f("content", "Content", "textarea", { sensitive: true, editable: true, create: true, required: true }), f("language", "Language", "text", { editable: true, create: true }), f("visibility", "Visibility", "text", { editable: true, create: true }), f("scope_personal", "Personal", "boolean", { editable: true, create: true }), f("scope_org", "Organization", "boolean", { editable: true, create: true }), f("scope_public", "Public", "boolean", { editable: true, create: true }), f("user_id", "User ID", "text", { editable: true, create: true }), f("org_id", "Organization ID", "text", { editable: true, create: true }), f("views", "Views", "number", { editable: true }), f("expires_at", "Expires", "datetime", { editable: true, create: true }), f("created_at", "Created", "datetime")],
  },
  "quick-pastes": {
    key: "quick-pastes", label: "Quick Pastes", group: "content", table: "quick_pastes", primaryKey: "id", searchFields: ["title", "category"], filterFields: ["user_id", "category", "is_favorite"], defaultSort: "updated_at", sortFields: ["updated_at", "created_at", "sort_order", "title"],
    fields: [f("id", "ID"), f("user_id", "User ID", "text", { editable: true, create: true, required: true }), f("title", "Title", "text", { editable: true, create: true, required: true }), f("content", "Content", "textarea", { sensitive: true, editable: true, create: true, required: true }), f("category", "Category", "text", { editable: true, create: true }), f("sort_order", "Sort order", "number", { editable: true, create: true }), f("is_favorite", "Favorite", "boolean", { editable: true, create: true }), ...timestamps],
  },
  secrets: {
    key: "secrets", label: "Secrets", group: "content", table: "secrets", primaryKey: "id", searchFields: [], filterFields: ["org_id", "viewed"], defaultSort: "created_at", sortFields: ["created_at", "expires_at", "viewed"],
    fields: [f("id", "ID"), f("secret_code", "Secret code", "text", { sensitive: true, editable: true, create: true }), f("content", "Secret content", "textarea", { sensitive: true, editable: true, create: true, required: true }), f("org_id", "Organization ID", "text", { editable: true, create: true }), f("viewed", "Viewed", "boolean", { editable: true }), f("expires_at", "Expires", "datetime", { editable: true, create: true, required: true }), f("created_at", "Created", "datetime")],
  },
  quicklinks: {
    key: "quicklinks", label: "Quick links", group: "utilities", table: "quicklinks", primaryKey: "id", searchFields: ["title", "url"], filterFields: ["org_id", "user_id", "scope", "folder_id"], defaultSort: "created_at", sortFields: ["created_at", "order_index", "title"],
    fields: [f("id", "ID"), f("title", "Title", "text", { editable: true, create: true, required: true }), f("url", "URL", "text", { editable: true, create: true }), f("icon", "Icon", "text", { editable: true, create: true }), f("order_index", "Order", "number", { editable: true, create: true }), f("scope", "Scope", "select", { editable: true, create: true, options: ["personal", "shared", "both"] }), f("folder_id", "Folder ID", "text", { editable: true, create: true }), f("user_id", "User ID", "text", { editable: true, create: true }), f("org_id", "Organization ID", "text", { editable: true, create: true }), f("created_at", "Created", "datetime")],
  },
  "quicklink-folders": {
    key: "quicklink-folders", label: "Quick-link folders", group: "utilities", table: "quicklink_folders", primaryKey: "id", searchFields: ["name"], filterFields: ["org_id", "user_id", "scope"], defaultSort: "created_at", sortFields: ["created_at", "order_index", "name"],
    fields: [f("id", "ID"), f("name", "Name", "text", { editable: true, create: true, required: true }), f("icon", "Icon", "text", { editable: true, create: true }), f("order_index", "Order", "number", { editable: true, create: true }), f("scope", "Scope", "select", { editable: true, create: true, options: ["personal", "shared", "both"] }), f("user_id", "User ID", "text", { editable: true, create: true }), f("org_id", "Organization ID", "text", { editable: true, create: true }), f("created_at", "Created", "datetime")],
  },
  triggers: {
    key: "triggers", label: "Triggers", group: "utilities", table: "triggers", primaryKey: "id", searchFields: ["name", "description"], filterFields: ["org_id", "method"], defaultSort: "created_at", sortFields: ["created_at", "name", "last_triggered_at"],
    fields: [f("id", "ID"), f("name", "Name", "text", { editable: true, create: true, required: true }), f("webhook_url", "Webhook URL", "text", { sensitive: true, editable: true, create: true, required: true }), f("method", "Method", "select", { editable: true, create: true, options: ["GET", "POST"] }), f("description", "Description", "textarea", { editable: true, create: true }), f("org_id", "Organization ID", "text", { editable: true, create: true }), f("last_triggered_at", "Last triggered", "datetime"), f("created_at", "Created", "datetime")],
  },
  "short-urls": {
    key: "short-urls", label: "Short URLs", group: "utilities", table: "short_urls", primaryKey: "id", searchFields: ["short_code"], filterFields: ["org_id"], defaultSort: "created_at", sortFields: ["created_at", "short_code", "clicks"],
    fields: [f("id", "ID"), f("short_code", "Short code", "text", { sensitive: true, editable: true, create: true, required: true }), f("target_url", "Target URL", "text", { sensitive: true, editable: true, create: true, required: true }), f("clicks", "Clicks", "number", { editable: true }), f("org_id", "Organization ID", "text", { editable: true, create: true }), f("created_at", "Created", "datetime")],
  },
  "dashboard-todos": {
    key: "dashboard-todos", label: "Dashboard todos", group: "utilities", table: "dashboard_todos", primaryKey: "id", searchFields: ["title", "note"], filterFields: ["user_id", "completed"], defaultSort: "updated_at", sortFields: ["updated_at", "created_at", "sort_order", "title"],
    fields: [f("id", "ID"), f("user_id", "User ID", "text", { editable: true, create: true, required: true }), f("title", "Title", "text", { editable: true, create: true, required: true }), f("note", "Note", "textarea", { editable: true, create: true }), f("completed", "Completed", "boolean", { editable: true, create: true }), f("sort_order", "Sort order", "number", { editable: true, create: true }), f("completed_at", "Completed at", "datetime", { editable: true }), ...timestamps],
  },
  "plugin-installations": {
    key: "plugin-installations", label: "Plugin installations", group: "integrations", table: "user_plugin_installations", primaryKey: "user_id,plugin_id", searchFields: ["plugin_id"], filterFields: ["user_id", "dashboard_enabled"], defaultSort: "updated_at", sortFields: ["updated_at", "installed_at", "plugin_id", "dashboard_order"],
    fields: [f("user_id", "User ID", "text", { create: true, required: true }), f("plugin_id", "Plugin ID", "text", { create: true, required: true }), f("dashboard_enabled", "Dashboard enabled", "boolean", { editable: true, create: true }), f("dashboard_order", "Dashboard order", "number", { editable: true, create: true }), f("installed_at", "Installed", "datetime"), f("updated_at", "Updated", "datetime")],
  },
  "classdash-settings": {
    key: "classdash-settings", label: "ClassDash settings", group: "integrations", table: "classdash_settings", primaryKey: "user_id", searchFields: ["dorm_name"], filterFields: ["user_id"], defaultSort: "updated_at", sortFields: ["updated_at", "created_at", "dorm_name"],
    fields: [f("user_id", "User ID", "text", { create: true, required: true }), f("dorm_name", "Dorm name", "text", { editable: true, create: true, required: true }), f("dorm_lat", "Latitude", "number", { editable: true, create: true }), f("dorm_lng", "Longitude", "number", { editable: true, create: true }), f("walking_speed_kph", "Walking speed (kph)", "number", { editable: true, create: true }), ...timestamps],
  },
  "classdash-classes": {
    key: "classdash-classes", label: "ClassDash classes", group: "integrations", table: "classdash_classes", primaryKey: "id", searchFields: ["code", "title", "section", "location_name"], filterFields: ["user_id"], defaultSort: "updated_at", sortFields: ["updated_at", "created_at", "sort_order", "code", "start_time"],
    fields: [f("id", "ID"), f("user_id", "User ID", "text", { editable: true, create: true, required: true }), f("code", "Code", "text", { editable: true, create: true, required: true }), f("title", "Title", "text", { editable: true, create: true }), f("section", "Section", "text", { editable: true, create: true }), f("days", "Days", "json", { editable: true, create: true }), f("start_time", "Start time", "time", { editable: true, create: true }), f("end_time", "End time", "time", { editable: true, create: true }), f("location_name", "Location", "text", { editable: true, create: true }), f("location_lat", "Latitude", "number", { editable: true, create: true }), f("location_lng", "Longitude", "number", { editable: true, create: true }), f("term_start", "Term start", "date", { editable: true, create: true }), f("term_end", "Term end", "date", { editable: true, create: true }), f("sort_order", "Sort order", "number", { editable: true, create: true }), ...timestamps],
  },
  "launcher-devices": {
    key: "launcher-devices", label: "Launcher devices", group: "integrations", table: "launcher_devices", primaryKey: "id", readOnly: true, guided: "launcher-device", searchFields: ["device_name"], filterFields: ["owner_id", "revoked_at"], defaultSort: "approved_at", sortFields: ["approved_at", "updated_at", "last_used_at", "device_name"],
    fields: [f("id", "ID"), f("device_identifier", "Device identifier"), f("owner_id", "Owner ID"), f("device_name", "Device name"), f("scopes", "Scopes", "json"), f("approved_at", "Approved", "datetime"), f("last_used_at", "Last used", "datetime"), f("revoked_at", "Revoked", "datetime"), f("updated_at", "Updated", "datetime")],
  },
  "launcher-pairings": {
    key: "launcher-pairings", label: "Launcher pairings", group: "integrations", table: "launcher_pairing_requests", primaryKey: "id", readOnly: true, guided: "launcher-pairing", searchFields: ["device_name", "status"], filterFields: ["owner_id", "status", "device_id"], defaultSort: "created_at", sortFields: ["created_at", "updated_at", "expires_at", "status"],
    fields: [f("id", "ID"), f("device_identifier", "Device identifier"), f("device_name", "Device name"), f("status", "Status"), f("owner_id", "Owner ID"), f("device_id", "Device ID"), f("created_at", "Created", "datetime"), f("expires_at", "Expires", "datetime"), f("approved_at", "Approved", "datetime"), f("exchanged_at", "Exchanged", "datetime"), f("last_poll_at", "Last poll", "datetime"), f("poll_count", "Poll count", "number"), f("updated_at", "Updated", "datetime")],
  },
  "help-articles": {
    key: "help-articles", label: "Help articles", group: "platform", table: "help_articles", primaryKey: "id", searchFields: ["slug", "title", "summary"], filterFields: ["is_published"], defaultSort: "updated_at", sortFields: ["updated_at", "created_at", "sort_order", "title", "slug"],
    fields: [f("id", "ID"), f("slug", "Slug", "text", { editable: true, create: true, required: true }), f("title", "Title", "text", { editable: true, create: true, required: true }), f("summary", "Summary", "textarea", { editable: true, create: true }), f("content", "Article content", "textarea", { editable: true, create: true }), f("is_published", "Published", "boolean", { editable: true, create: true }), f("sort_order", "Sort order", "number", { editable: true, create: true }), ...timestamps],
  },
  "app-settings": {
    key: "app-settings", label: "App settings", group: "platform", table: "app_settings", primaryKey: "id", searchFields: [], defaultSort: "updated_at", sortFields: ["updated_at", "id"],
    fields: [f("id", "ID"), f("banner_enabled", "Banner enabled", "boolean", { editable: true }), f("banner_text", "Banner text", "textarea", { editable: true }), f("help_docs", "Legacy help docs", "textarea", { editable: true }), f("updated_at", "Updated", "datetime")],
  },
  "admin-access-requests": {
    key: "admin-access-requests", label: "Pending reviews", group: "reviews", table: "admin_access_requests", primaryKey: "id", readOnly: true, guided: "admin-review",
    searchFields: ["requested_by_email", "reason", "status"], filterFields: ["status", "request_kind", "target_user_id", "requested_by"], defaultSort: "created_at", sortFields: ["created_at", "updated_at", "reviewed_at", "status"],
    fields: [f("id", "Request ID"), f("request_kind", "Request type", "select", { options: ["admin_promotion", "account_deletion"] }), f("target_user_id", "Account"), f("requested_by", "Requested by"), f("requested_by_email", "Requester email"), f("reason", "Request reason", "textarea"), f("status", "Status", "select", { options: ["pending", "approved", "rejected"] }), f("reviewed_by", "Reviewed by"), f("review_reason", "Review reason", "textarea"), f("created_at", "Requested", "datetime"), f("reviewed_at", "Reviewed", "datetime"), f("updated_at", "Updated", "datetime")],
  },
  "audit-log": {
    key: "audit-log", label: "Admin audit log", group: "audit", table: "admin_audit_log", primaryKey: "id", readOnly: true, guided: "audit", searchFields: ["actor_email", "action", "resource", "reason", "status"], filterFields: ["actor_id", "action", "resource", "status"], defaultSort: "created_at", sortFields: ["created_at", "completed_at", "actor_email", "action", "resource", "status"],
    fields: [f("id", "ID"), f("operation_id", "Operation ID"), f("actor_id", "Actor ID"), f("actor_email", "Actor email"), f("action", "Action"), f("resource", "Resource"), f("target_ids", "Targets", "json"), f("reason", "Reason", "textarea"), f("changed_fields", "Changed fields", "json"), f("before_data", "Before", "json"), f("after_data", "After", "json"), f("status", "Status"), f("error_code", "Error code"), f("created_at", "Created", "datetime"), f("completed_at", "Completed", "datetime")],
  },
};

export function editableColumns(resource: AdminResource, creating: boolean) {
  return resource.fields.filter((field) => creating ? field.create : field.editable).map((field) => field.name);
}

export function selectedColumns(resource: AdminResource, includeSensitive = false) {
  return resource.fields
    .filter((field) => field.name !== "temporary_password" && (includeSensitive || !field.sensitive))
    .map((field) => field.name);
}

export function sensitiveColumns(resource: AdminResource) {
  return resource.fields.filter((field) => field.sensitive).map((field) => field.name);
}

export const ADMIN_RESOURCE_LIST = Object.values(ADMIN_RESOURCES).map((resource) => ({
  key: resource.key,
  label: resource.label,
  group: resource.group,
  actions: resourceActionsForCatalog(resource),
}));

// Explicit account relationships used by the admin account workspace. Keeping these
// in the registry prevents a client from choosing arbitrary tables or join columns.
export const ADMIN_ACCOUNT_SCOPES: Record<string, AdminAccountScope> = {
  users: "self",
  organizations: "organizations",
  projects: "user",
  "project-board-columns": "project-related",
  "project-board-cards": "project-related",
  "project-planner-steps": "project-related",
  "project-resources": "project-related",
  "project-files": "project-related",
  "project-activity": "project-related",
  pastes: "user",
  "quick-pastes": "user",
  quicklinks: "user",
  "quicklink-folders": "user",
  "dashboard-todos": "user",
  "plugin-installations": "user",
  "classdash-settings": "user",
  "classdash-classes": "user",
  "launcher-devices": "owner",
  "launcher-pairings": "owner",
  "audit-log": "actor",
};

function resourceActionsForCatalog(resource: AdminResource) {
  if (resource.key === "app-settings") return ["update"];
  if (resource.guided === "users") return ["create", "update", "request-admin", "revoke-admin", "ban", "unban", "reset-password", "request-delete", "remove-organization"];
  if (resource.guided === "launcher-device") return ["revoke"];
  if (resource.guided === "launcher-pairing") return ["cancel"];
  if (resource.guided === "admin-review") return ["approve-admin", "reject-admin"];
  if (resource.readOnly) return resource.fields.some((field) => field.sensitive) ? ["reveal"] : [];
  return ["create", "update", "delete", ...(resource.fields.some((field) => field.sensitive) ? ["reveal"] : [])];
}


