import { supabase } from '../../lib/supabase';

export type FeatureStatus = 'idea' | 'in_progress' | 'completed';
export type FeatureIdea = { id: string; title: string; notes: string; status: FeatureStatus; created_at: string };
export type FeatureInput = Pick<FeatureIdea, 'title' | 'notes' | 'status'>;
export const featureStatuses: Record<FeatureStatus, string> = { idea: 'Idea', in_progress: 'In progress', completed: 'Completed' };
export async function listFeatureIdeas(page: number, status: string) {
  let query = supabase.from('admin_feature_ideas').select('id,title,notes,status,created_at', { count: 'exact' });
  if (status) query = query.eq('status', status);
  const { data, count, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).range((page - 1) * 50, page * 50 - 1);
  if (error) throw new Error(error.code === 'PGRST205' || error.code === '42P01' ? 'Apply the admin feature ideas database migration, then refresh.' : error.message);
  return { rows: (data || []) as FeatureIdea[], total: count || 0 };
}
export async function saveFeatureIdea(input: FeatureInput, id?: string, statusOnly = false) {
  const values = { title: input.title.trim(), notes: input.notes.trim(), status: input.status };
  if (!values.title || values.title.length > 160 || values.notes.length > 2000 || !(values.status in featureStatuses)) throw new Error('Enter a title (up to 160 characters) and notes up to 2,000 characters.');
  const query = id ? supabase.from('admin_feature_ideas').update(statusOnly ? { status: values.status } : values).eq('id', id) : supabase.from('admin_feature_ideas').insert(values);
  const { error } = await query.select('id').single();
  if (error) throw new Error(error.message);
}
