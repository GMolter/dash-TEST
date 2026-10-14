import type { SupabaseClient } from '@supabase/supabase-js';
import { appOrigin } from './appOrigin.js';
import { renderEmail } from './emailPolicy.js';
const escape = (value: unknown) => String(value ?? '').slice(0, 500).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
export async function notificationMail(service: SupabaseClient, job: { owner_id: string; event_type: string; event_target: string; recipient?: string; payload: { subject: string } }) {
  const details: string[] = [];
  const { data: actor, error } = await service.from('profiles').select('app_owner').eq('id', job.owner_id).maybeSingle();
  if (error) throw new Error('ACCESS_CHECK_UNAVAILABLE');
  const can = async (key: string) => {
    if (actor?.app_owner) return true;
    const result = await service.rpc('admin_has_permission', { p_user: job.owner_id, p_key: key });
    return !result.error && result.data === true;
  };
  const add = (label: string, value: unknown) => { if (value) details.push(`<p><strong>${label}:</strong> ${escape(value)}</p>`); };
  let path = '/admin';
  let label = 'Open admin workspace';
  if (job.event_type === 'support' || job.event_type === 'support_user') {
    const result = await service.from('support_events').select('ticket_id,kind').eq('id', job.event_target).maybeSingle();
    if (result.error || !result.data) throw new Error('NOTIFICATION_DETAILS_UNAVAILABLE');
    path = job.event_type === 'support' ? `/admin?section=support&ticket=${encodeURIComponent(result.data.ticket_id)}` : `/support?ticket=${encodeURIComponent(result.data.ticket_id)}`;
    label = 'View support ticket';
    add('Update', ({ created: 'A new support ticket was submitted.', reply: 'A new reply is available.', completed: 'The ticket was completed.', reopened: 'The ticket was reopened.' } as Record<string, string>)[result.data.kind]);
    details.push('<p>Reply inside Olio. Replies to this email are not monitored.</p>');
  } else if (job.event_type === 'signup') {
    path = `/admin?section=people&account=${encodeURIComponent(job.event_target)}`; label = 'View account';
    if (await can('users.read')) {
      const result = await service.from('profiles').select('display_name,email,app_owner').eq('id', job.event_target).maybeSingle();
      if (result.error) throw new Error('NOTIFICATION_DETAILS_UNAVAILABLE');
      if (!result.data?.app_owner || actor?.app_owner) {
        if (await can('users.fields.display_name.read')) add('Name', result.data?.display_name);
        if (await can('users.fields.email.read')) add('Email', result.data?.email);
      }
    }
  } else if (job.event_type === 'organization') {
    path = `/admin?section=organizations&organization=${encodeURIComponent(job.event_target)}`; label = 'View organization';
    if (await can('organizations.read') && await can('organizations.fields.name.read')) {
      const result = await service.from('organizations').select('name').eq('id', job.event_target).maybeSingle();
      if (result.error) throw new Error('NOTIFICATION_DETAILS_UNAVAILABLE');
      add('Organization', result.data?.name);
    }
  } else if (job.event_type === 'review') {
    path = `/admin?section=reviews&resource=admin-access-requests&record=${encodeURIComponent(job.event_target)}`; label = 'Review request';
    if (actor?.app_owner) {
      const result = await service.from('admin_access_requests').select('requested_by_email,reason,status').eq('id', job.event_target).maybeSingle();
      if (result.error) throw new Error('NOTIFICATION_DETAILS_UNAVAILABLE');
      add('Requested by', result.data?.requested_by_email); add('Reason', result.data?.reason); add('Status', result.data?.status);
    }
  } else if (job.event_type === 'failure') {
    path = `/admin?section=email&emailJob=${encodeURIComponent(job.event_target)}`; label = 'View email attempt';
    let query = service.from('email_jobs').select('recipient,status,error_code').eq('id', job.event_target);
    if (!actor?.app_owner) query = query.eq('owner_id', job.owner_id);
    const result = await query.maybeSingle();
    if (result.error) throw new Error('NOTIFICATION_DETAILS_UNAVAILABLE');
    add('Recipient', result.data?.recipient); add('Status', result.data?.status); add('Error', result.data?.error_code);
  }
  const href = `${appOrigin()}${path}`;
  return renderEmail(job.payload.subject, `${details.join('') || '<p>Open the item to see its current details.</p>'}<p><a href="${escape(href)}">${label}</a></p>`, job.recipient);
}
