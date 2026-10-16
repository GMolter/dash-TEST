import { supabase } from '../../lib/supabase';

export const categories = {
  account: 'Account & access', dashboard: 'Dashboard', projects: 'Projects',
  quicklinks: 'Quick links & pastes', organizations: 'Organizations', other: 'Other',
} as const;
export type Category = keyof typeof categories;
export type Ticket = {
  id: string; reference: number; user_id: string; requester: string; category: Category;
  description: string; status: 'open' | 'completed'; revision: number;
  created_at: string; updated_at: string; unread?: boolean;
};
export type SupportEvent = {
  id: string; sequence: number; author: string; admin: boolean;
  kind: 'created' | 'reply' | 'completed' | 'reopened'; body: string; created_at: string;
};
export type Mutation = { request: string; action: SupportEvent['kind']; ticket?: string; category?: Category; body?: string; emailUpdates?: boolean };
export const supportChanged = () => window.dispatchEvent(new Event('support-changed'));
function failure(error: { message: string }): Error {
  if (error.message.includes('TICKET_COMPLETED')) return new Error('This ticket has been completed. Your reply was not sent.');
  if (error.message.includes('STATUS_CHANGED')) return new Error('The status has changed. Refresh the ticket and try again.');
  if (/PERMISSION_DENIED|TICKET_UNAVAILABLE/.test(error.message)) return new Error('This ticket is unavailable or you no longer have access.');
  return new Error('Support is unavailable. Please try again.');
}
export async function listTickets(admin: boolean, status: string, offset: number): Promise<{ tickets: Ticket[]; total: number }> {
  const { data, error } = await supabase.rpc('support_list', { p_admin: admin, p_status: status, p_offset: offset });
  if (error) throw failure(error);
  return data;
}
export async function loadTicket(id: string, admin: boolean): Promise<{ ticket: Ticket; events: SupportEvent[] }> {
  let query = supabase.from('support_tickets').select('*').eq('id', id);
  if (!admin) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error('Sign in to view your tickets.');
    query = query.eq('user_id', data.user.id);
  }
  const { data: ticket, error } = await query.single();
  if (error) throw failure(error);
  // Bound the snapshot: later events must remain unread until they are displayed.
  const events: SupportEvent[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await supabase.from('support_events').select('*').eq('ticket_id', id)
      .lte('sequence', ticket.revision).order('sequence').range(offset, offset + 499);
    if (result.error) throw failure(result.error);
    events.push(...result.data);
    if (result.data.length < 500) break;
  }
  return { ticket, events };
}
export async function mutateTicket(input: Mutation): Promise<string> {
  const { data, error } = await supabase.rpc('support_mutate', {
    p_request: input.request, p_action: input.action, p_ticket: input.ticket ?? null,
    p_category: input.category ?? null, p_body: input.body ?? '',
    ...(input.action === 'created' ? { p_email_updates: input.emailUpdates ?? false } : {}),
  });
  if (error) throw failure(error);
  supportChanged();
  return data;
}
export async function markRead(ticket: string, sequence: number) {
  const { error } = await supabase.rpc('support_mark_read', { p_ticket: ticket, p_sequence: sequence });
  if (error) throw failure(error);
  supportChanged();
}
export async function unreadTickets(admin: boolean): Promise<number> {
  const { data, error } = await supabase.rpc('support_unread', { p_admin: admin });
  if (error) throw failure(error);
  return data;
}
