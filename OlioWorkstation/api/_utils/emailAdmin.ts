import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminAccess } from './adminAccess.js';
import { hasPermission, requirePermission } from './adminPermissions.js';
import { attachmentName, loadAttachments } from './emailAttachments.js';
import { resolveRecordHandle } from './adminRecordHandles.js';
import { emailVariables, personVariables, personalizedEmail } from './emailPersonalization.js';
import {
  digest,
  readPreview,
  recipientList,
  renderEmail,
  sanitizeEmailContent,
  scheduledInstant,
  signPreview,
} from './emailPolicy.js';
import { deliveryEnabled } from './emailTransport.js';
const uuid = (value: unknown) => {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new Error('Invalid record identifier.');
  return value;
};
type Input = {
  recipient?: string;
  job_id?: string;
  id?: string; ids?: string[]; user_id?: string; subject?: string; html?: string;
  recipients?: string[]; attachment_ids?: string[]; revision?: number;
  name?: string; shared?: boolean; global?: boolean; page?: number; search?: string;
  group?: string; organization?: string | boolean; mime?: string; size?: number;
  local?: string; timezone?: string; occurrence?: 'reject' | 'earlier' | 'later';
  token?: string; key?: string; confirmation?: string; toDraft?: boolean; confirmUnknown?: boolean;
  signup?: boolean; review?: boolean; failure?: boolean;
};
function checked<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) {
    const code = [
      'DRAFT_CHANGED',
      'IDEMPOTENCY_CONFLICT',
      'HOURLY_LIMIT',
      'DISPATCH_ALREADY_STARTED',
      'CONFIRM_DUPLICATE_RISK',
      'CONTENT_EXPIRED',
      'PERMISSION_DENIED',
    ].find((code) => result.error?.message.includes(code));
    throw new Error(
      code ||
        'Email storage unavailable. Apply the email migration and try again.',
    );
  }
  return result.data;
}
export async function emailAdmin(
  service: SupabaseClient,
  access: AdminAccess,
  action: string,
  input: Input,
) {
  const actor = access.userId;
  if (action === 'state') {
    const preferences = checked(
      await service
        .from('email_preferences')
        .select('*')
        .eq('user_id', actor)
        .maybeSingle(),
    );
    return {
      preferences,
      owner: access.appOwner,
      canSend: hasPermission(access, 'email.send'),
      canTemplates: hasPermission(access, 'email.templates'),
      canHistory: hasPermission(access, 'email.history'),
      deliveryEnabled: deliveryEnabled(),
    };
  }
  if (action === 'preferences') {
    const target = input.user_id ? uuid(input.user_id) : actor;
    const preferences = Object.fromEntries(
      ['signup', 'organization', 'review', 'failure', 'support'].map((key) => [key, (input as Record<string, unknown>)[key] === true]),
    );
    checked(
      await service.rpc('email_preferences_save', {
        p_actor: actor,
        p_target: target,
        p_preferences: preferences,
      }),
    );
    return { ok: true };
  }
  if (action === 'administration') {
    requirePermission(access, 'email.administration');
    const admins = checked(
      await service
        .from('profiles')
        .select('id,email,display_name,app_owner')
        .eq('app_admin', true)
        .order('email'),
    );
    const preferences = checked(
      await service.from('email_preferences').select('*'),
    );
    const health = checked(
      await service
        .from('email_health')
        .select('paused,error_code,last_dispatch_at')
        .single(),
    );
    return { admins, preferences, health, authEnabled: deliveryEnabled(true) };
  }
  if (action === 'resume') {
    requirePermission(access, 'email.administration');
    checked(
      await service
        .from('email_health')
        .update({ paused: false, error_code: null })
        .eq('id', true),
    );
    return { ok: true };
  }
  if (action === 'history') {
    requirePermission(
      access,
      input.global ? 'email.global-history' : 'email.history',
    );
    let query = service
      .from('email_messages')
      .select(
        'id,owner_id,subject,scheduled_at,timezone,created_at,email_jobs(id,recipient,status,attempts,error_code,completed_at,available_at,email_attempts(attempt,status,error_code,created_at))',
      )
      .order('created_at', { ascending: false })
      .range(
        Math.max(0, Number(input.page) || 0) * 25,
        Math.max(0, Number(input.page) || 0) * 25 + 24,
      );
    if (!input.global) query = query.eq('owner_id', actor);
    if (input.job_id) {
      let targetQuery = service.from('email_jobs').select('message_id').eq('id', uuid(input.job_id));
      if (!input.global) targetQuery = targetQuery.eq('owner_id', actor);
      const target = checked(await targetQuery.maybeSingle());
      query = query.eq('id', target?.message_id || '00000000-0000-0000-0000-000000000000');
    }
    let system = service
      .from('email_jobs')
      .select(
        'id,recipient,kind,event_type,status,error_code,created_at,completed_at,attempts',
      )
      .neq('kind', 'manual')
      .order('created_at', { ascending: false })
      .range(
        Math.max(0, Number(input.page) || 0) * 25,
        Math.max(0, Number(input.page) || 0) * 25 + 24,
      );
    if (!input.global) system = system.eq('owner_id', actor);
    if (input.job_id) system = system.eq('id', uuid(input.job_id));
    const messages = checked(await query);
    const systemMessages = checked(await system);
    const health = access.appOwner ? checked(await service.from('email_health')
      .select('paused,error_code,last_dispatch_at,worker_until').eq('id', true).single()) : null;
    return { messages, system: systemMessages, health, deliveryEnabled: deliveryEnabled(), checkedAt: new Date().toISOString() };
  }
  if (action === 'templates') {
    requirePermission(access, 'email.read');
    return {
      templates: checked(
        await service
          .from('email_templates')
          .select('*')
          .or(`owner_id.eq.${actor},shared.eq.true`)
          .order('name'),
      ),
    };
  }
  if (action === 'save-template' || action === 'delete-template') {
    requirePermission(access, 'email.templates');
    if (input.shared && !access.appOwner) throw new Error('PERMISSION_DENIED');
    if (input.id) {
      const current = checked(
        await service
          .from('email_templates')
          .select('*')
          .eq('id', uuid(input.id))
          .single(),
      );
      if (current.owner_id !== actor && !(current.shared && access.appOwner))
        throw new Error('PERMISSION_DENIED');
      if (current.shared && !access.appOwner)
        throw new Error('PERMISSION_DENIED');
    }
    if (action === 'delete-template') {
      checked(
        await service.from('email_templates').delete().eq('id', uuid(input.id)),
      );
      return { ok: true };
    }
    renderEmail(input.subject, input.html);
    if (
      typeof input.name !== 'string' ||
      !input.name.trim() ||
      input.name.length > 100
    )
      throw new Error('Enter a template name (up to 100 characters).');
    const values = {
      name: input.name.trim(),
      subject: input.subject,
      html: input.html,
      shared: !!input.shared,
    };
    const template = checked(
      await (
        input.id
          ? service.from('email_templates').update(values).eq('id', input.id)
          : service
              .from('email_templates')
              .insert({ ...values, owner_id: actor })
      )
        .select('*')
        .single(),
    );
    return { template };
  }
  requirePermission(access, 'email.send');
  if (action === 'contact-user') {
    const id = uuid(resolveRecordHandle(String(input.user_id || '')));
    const person = checked(await service.from('profiles').select('email,display_name,org_id,created_at').eq('id', id).single());
    if (!person?.email) throw new Error('This account has no email address.');
    const organization = person.org_id && hasPermission(access, 'organizations.read') && hasPermission(access, 'organizations.fields.name.read') && hasPermission(access, 'users.fields.org_id.read')
      ? checked(await service.from('organizations').select('name').eq('id', person.org_id).maybeSingle())?.name : null;
    return { person: { email: person.email, display_name: person.display_name, organization,
      joined: hasPermission(access, 'users.fields.created_at.read') ? person.created_at : null } };
  }
  if (action === 'preview-recipient') {
    const preview = readPreview(input.token);
    if (preview.actor !== actor) throw new Error('PERMISSION_DENIED');
    const recipient = String(input.recipient || '');
    if (!preview.snapshot.recipients.includes(recipient)) throw new Error('Choose a recipient from this preview.');
    return { recipient, ...personalizedEmail(preview.snapshot.subject, preview.snapshot.html, recipient, preview.snapshot.personalization?.[recipient] || null) };
  }
  if (action === 'recipients') {
    const search = String(input.search || '')
      .replace(/[^a-zA-Z0-9@ ._+-]/g, '')
      .slice(0, 100);
    let query = service
      .from('profiles')
      .select('id,email,display_name,org_id')
      .not('email', 'is', null)
      .order('email')
      .limit(input.group ? 51 : 25);
    if (input.group === 'organization')
      query = query.eq('org_id', uuid(input.organization));
    if (!input.group && search)
      query = query.or(
        `email.ilike.%${search}%,display_name.ilike.%${search}%`,
      );
    const users = checked(await query) || [];
    if (input.group && users.length > 50)
      throw new Error(
        'This group exceeds 50 recipients. Select a smaller group.',
      );
    return {
      users,
      organizations: checked(
        await service
          .from('organizations')
          .select('id,name')
          .order('name')
          .limit(500),
      ),
    };
  }
  if (action === 'drafts')
    return {
      drafts: checked(
        await service
          .from('email_drafts')
          .select('*')
          .eq('owner_id', actor)
          .order('updated_at', { ascending: false })
          .limit(100),
      ),
    };
  if (action === 'save-draft') {
    if (
      typeof input.subject !== 'string' ||
      input.subject.length > 200 ||
      typeof input.html !== 'string' ||
      Buffer.byteLength(input.html) > 102400
    )
      throw new Error('Draft exceeds message limits.');
    const recipients = input.recipients?.length
      ? recipientList(input.recipients)
      : [];
    const ids = (input.attachment_ids || []).map(uuid);
    if (ids.length) await loadAttachments(service, actor, ids);
    const draft = checked(
      await service.rpc('email_save_draft', {
        p_actor: actor,
        p_id: input.id ? uuid(input.id) : null,
        p_revision: input.revision || 0,
        p_data: {
          subject: input.subject,
          html: input.html,
          recipients,
          attachment_ids: ids,
        },
      }),
    );
    return { draft };
  }
  if (action === 'delete-draft') {
    checked(
      await service
        .from('email_drafts')
        .delete()
        .eq('id', uuid(input.id))
        .eq('owner_id', actor),
    );
    return { ok: true };
  }
  if (action === 'upload') {
    const file = attachmentName(input.name);
    if (
      typeof input.size !== 'number' || !Number.isInteger(input.size) ||
      input.size < 1 ||
      input.size > 5242880 ||
      input.mime !== file.mime
    )
      throw new Error('Invalid attachment type or size.');
    // Durable upload admission prevents filling storage through repeated abandoned uploads.
    const recent = await service
      .from('email_attachments')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', actor)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString());
    if (recent.error || (recent.count || 0) >= 50)
      throw new Error('Upload limit reached. Try again later.');
    const id = randomUUID(),
      path = `${actor}/${id}`;
    checked(
      await service
        .from('email_attachments')
        .insert({
          id,
          owner_id: actor,
          path,
          name: file.name,
          mime: file.mime,
          size: input.size,
        }),
    );
    const signed = checked(
      await service.storage
        .from('email-attachments')
        .createSignedUploadUrl(path, { upsert: false }),
    );
    if (!signed) throw new Error('Could not authorize attachment upload.');
    return { id, path, token: signed.token, name: file.name };
  }
  if (action === 'attachments')
    return {
      attachments: checked(
        await service
          .from('email_attachments')
          .select('id,name,size')
          .eq('owner_id', actor)
          .in('id', (input.ids || []).map(uuid)),
      ),
    };
  if (action === 'download') {
    const file = checked(
      await service
        .from('email_attachments')
        .select('*')
        .eq('owner_id', actor)
        .eq('id', uuid(input.id))
        .single(),
    );
    const signed = checked(
      await service.storage
        .from('email-attachments')
        .createSignedUrl(file.path, 60, { download: file.name }),
    );
    if (!signed) throw new Error('Could not authorize attachment download.');
    return { url: signed.signedUrl };
  }
  if (action === 'preview') {
    const draft = checked(
      await service
        .from('email_drafts')
        .select('*')
        .eq('id', uuid(input.id))
        .eq('owner_id', actor)
        .single(),
    );
    if (draft.revision !== input.revision) throw new Error('DRAFT_CHANGED');
    const rendered = sanitizeEmailContent(draft.subject, draft.html);
    const variables = emailVariables(rendered.subject, rendered.html);
    if (variables.length && !draft.recipients?.length) throw new Error('Select a registered user or group before using email variables.');
    const recipients = recipientList(draft.recipients);
    const people = variables.length ? checked(await service.from('profiles').select('email,display_name,first_name,last_name').in('email', recipients)) || [] : [];
    const personalization: Record<string, Record<string, string> | null> = {};
    for (const recipient of recipients) {
      const person = people.find(person => person.email?.toLowerCase() === recipient);
      personalization[recipient] = person ? personVariables(person) : null;
      // Validate every recipient before signing; scheduled sends keep these exact values.
      personalizedEmail(rendered.subject, rendered.html, recipient, personalization[recipient]);
    }
    await loadAttachments(service, actor, draft.attachment_ids);
    const timezone = input.local ? String(input.timezone) : 'UTC';
    const scheduled_at = input.local
      ? scheduledInstant(input.local, timezone, input.occurrence || 'reject')
      : new Date().toISOString();
    if (
      input.local &&
      (Date.parse(scheduled_at) < Date.now() + 60000 ||
        Date.parse(scheduled_at) > Date.now() + 365 * 86400000)
    )
      throw new Error(
        'Choose a time between one minute and one year from now.',
      );
    const snapshot = { ...rendered, recipients, scheduled_at, timezone, presentation: 'olio-v1', personalization };
    const token = signPreview({
      actor,
      draft: draft.id,
      revision: draft.revision,
      snapshot,
      fingerprint: digest({ snapshot, attachments: draft.attachment_ids }),
    });
    return { ...snapshot, ...personalizedEmail(rendered.subject, rendered.html, recipients[0], personalization[recipients[0]]), recipient: recipients[0], token, attachmentCount: draft.attachment_ids.length };
  }
  if (action === 'submit') {
    if (!deliveryEnabled())
      throw new Error(
        'Email delivery is disabled. An owner must finish delivery setup first.',
      );
    const preview = readPreview(input.token);
    if (preview.actor !== actor) throw new Error('PERMISSION_DENIED');
    if (input.confirmation !== 'SEND')
      throw new Error('Confirm the reviewed message before submitting.');
    const id = checked(
      await service.rpc('email_submit_personalized', {
        p_actor: actor,
        p_draft: preview.draft,
        p_revision: preview.revision,
        p_key: uuid(input.key),
        p_fingerprint: preview.fingerprint,
        p_snapshot: preview.snapshot,
      }),
    );
    return { id, status: 'queued' };
  }
  if (action === 'cancel')
    return {
      draftId: checked(
        await service.rpc('email_cancel', {
          p_actor: actor,
          p_message: uuid(input.id),
          p_to_draft: input.toDraft === true,
        }),
      ),
    };
  if (action === 'retry') {
    checked(
      await service.rpc('email_retry', {
        p_actor: actor,
        p_job: uuid(input.id),
        p_confirm_unknown: input.confirmUnknown === true,
      }),
    );
    return { ok: true };
  }
  throw new Error('Unknown email action.');
}
