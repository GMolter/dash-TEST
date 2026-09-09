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

export type AdminReference = {
  id: string;
  label: string;
  resource: string;
};

export type AdminRow = Record<string, unknown> & {
  _admin_id: string;
  _admin_refs?: Record<string, AdminReference>;
};

export type AdminListResponse = {
  rows: AdminRow[];
  total: number;
  resource: string;
  label: string;
  fields: AdminField[];
  actions: string[];
  redactedFields: string[];
  filterFields: string[];
  sortFields: string[];
  page: number;
  pageSize: number;
  sort: string;
  direction: "asc" | "desc";
};

export type AdminOperation = {
  resource: string;
  kind: string;
  ids?: string[];
  values?: Record<string, unknown>;
  revealFields?: string[];
  reason: string;
};

export type PreparedOperation = {
  operationToken: string;
  expiresAt: string;
  confirmation: string;
  preview: {
    action: string;
    resource: string;
    count: number;
    targets: Array<Record<string, unknown>>;
    changes: string[];
    impact: Record<string, number>;
  };
};

export type AdminOverview = {
  isOwner: boolean;
  metrics: Record<string, number>;
  recentAudit: Array<Record<string, unknown>>;
  resources: Array<{ key: string; label: string; group: string; actions: string[] }>;
};

export type AdminUserAccountOverview = {
  user: AdminRow;
  canManage: boolean;
  userFields: AdminField[];
  userActions: string[];
  totalRecords: number;
  resources: Array<{
    key: string;
    label: string;
    group: string;
    total: number | null;
    unavailable: boolean;
  }>;
};
