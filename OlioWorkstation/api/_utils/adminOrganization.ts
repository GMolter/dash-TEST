const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTENT_RESOURCES = ['org-announcements', 'org-resources', 'org-activity'];

export function validateOrganizationValues(resource: string, values: Record<string, unknown>) {
  if (resource !== 'organizations' && !CONTENT_RESOURCES.includes(resource)) return;
  if ('code' in values && (typeof values.code !== 'string' || !/^\d{4}$/.test(values.code))) {
    throw new Error('INVALID_JOIN_CODE: Enter exactly four digits, including any leading zeros.');
  }
  for (const field of ['org_id', 'created_by', 'actor_id', 'owner_id']) {
    if (values[field] !== undefined && values[field] !== null && values[field] !== '' && !UUID.test(String(values[field]))) throw new Error(`INVALID_${field}`);
  }
  const limits: Record<string, number> = { name: 100, title: 160, body: 10000, description: 500, content: 20000, actor_name: 160, action: 160, subject: 160 };
  for (const [field, limit] of Object.entries(limits)) {
    if (field in values && (typeof values[field] !== 'string' || String(values[field]).length > limit || (!['description', 'content'].includes(field) && !String(values[field]).trim()))) {
      throw new Error(`INVALID_${field}: Enter ${['description', 'content'].includes(field) ? 'up to' : '1–'} ${limit} characters.`);
    }
  }
  for (const field of ['created_at', 'updated_at']) {
    if (field in values && values[field] !== '' && (!values[field] || !Number.isFinite(Date.parse(String(values[field]))))) throw new Error(`INVALID_${field}`);
  }
  if (values.url) {
    try {
      const url = new URL(String(values.url));
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || String(values.url).length > 2048) throw new Error();
    } catch { throw new Error('INVALID_URL: Enter an http or https URL without embedded credentials.'); }
  }
}

export function organizationWriteValues(resource: string, values: Record<string, unknown>, creating: boolean, actorId: string) {
  if (resource !== 'organizations' && !CONTENT_RESOURCES.includes(resource)) return values;
  const next = { ...values };
  for (const field of ['created_at', 'updated_at']) {
    if (creating && (next[field] === null || next[field] === '')) delete next[field];
    else if (field in next && (next[field] === null || next[field] === '')) throw new Error(`INVALID_${field}`);
  }
  if ('name' in next) next.name = String(next.name).trim();
  if (resource === 'org-resources' && ('url' in next && !next.url || next.kind === 'note')) next.url = null;
  if (creating && ['org-announcements', 'org-resources'].includes(resource) && !('created_by' in next)) next.created_by = actorId;
  return next;
}

export function validateOrganizationMemberAction(kind: string, values: Record<string, unknown>) {
  const allowed = kind === 'set-member' ? ['member_id', 'role'] : kind === 'remove-member' ? ['member_id'] : ['owner_id', 'previous_owner_id'];
  if (Object.keys(values).some(key => !allowed.includes(key))) throw new Error('INVALID_FIELDS');
  if (!UUID.test(String(values[kind === 'transfer-owner' ? 'owner_id' : 'member_id'] ?? ''))) throw new Error('INVALID_MEMBER');
  if (kind === 'set-member' && !['member', 'admin', 'owner'].includes(String(values.role))) throw new Error('INVALID_ROLE');
  if (values.previous_owner_id && !UUID.test(String(values.previous_owner_id))) throw new Error('INVALID_PREVIOUS_OWNER');
}
