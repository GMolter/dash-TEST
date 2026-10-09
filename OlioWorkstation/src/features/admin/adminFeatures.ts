import { supabase } from '../../lib/supabase';

export type FeatureStatus = 'idea' | 'in_progress' | 'completed';
export type FeatureIdea = { id: string; title: string; notes: string; status: FeatureStatus; created_at: string; plan_name?: string | null };
export type FeatureInput = Pick<FeatureIdea, 'title' | 'notes' | 'status'>;
export const featureStatuses: Record<FeatureStatus, string> = { idea: 'Idea', in_progress: 'In progress', completed: 'Completed' };
export async function listFeatureIdeas(page: number, status: string) {
  let query = supabase.from('admin_feature_ideas').select('id,title,notes,status,created_at,plan_name', { count: 'exact' });
  if (status) query = query.eq('status', status);
  const { data, count, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).range((page - 1) * 50, page * 50 - 1);
  if (error) throw new Error(['PGRST205', '42P01', '42703', 'PGRST204'].includes(error.code) ? 'Apply the admin feature ideas and planning files database migrations, then refresh.' : error.message);
  return { rows: (data || []) as FeatureIdea[], total: count || 0 };
}
export async function saveFeatureIdea(input: FeatureInput, id?: string, statusOnly = false) {
  const values = { title: input.title.trim(), notes: input.notes.trim(), status: input.status };
  if (!values.title || values.title.length > 160 || values.notes.length > 2000 || !(values.status in featureStatuses)) throw new Error('Enter a title (up to 160 characters) and notes up to 2,000 characters.');
  const query = id ? supabase.from('admin_feature_ideas').update(statusOnly ? { status: values.status } : values).eq('id', id) : supabase.from('admin_feature_ideas').insert(values);
  const { error } = await query.select('id').single();
  if (error) throw new Error(error.message);
}
