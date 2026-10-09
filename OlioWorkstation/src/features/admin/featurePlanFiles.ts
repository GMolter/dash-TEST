import { supabase } from '../../lib/supabase';

export const MAX_PLAN_BYTES = 256 * 1024;
export async function readPlanFile(file: File) {
  const invalidName = /[/\\]/.test(file.name) || [...file.name].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
  if (!/^.+\.(md|txt)$/i.test(file.name) || file.name.length > 255 || invalidName) throw new Error('Choose a .md or .txt file with a filename of at most 255 characters.');
  if (file.size > MAX_PLAN_BYTES) throw new Error('Planning files must be 256 KB or smaller.');
  let content: string;
  try { content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); }
  catch { throw new Error('Save the planning file as UTF-8 text and try again.'); }
  if (content.includes('\0')) throw new Error('Planning files must contain plain text, not binary data.');
  return { name: file.name, content };
}
export async function savePlanFile(id: string, file: { name: string; content: string } | null) {
  const { error } = await supabase.from('admin_feature_ideas').update({ plan_name: file?.name ?? null, plan_content: file?.content ?? null }).eq('id', id).select('id').single();
  if (error) throw new Error(error.message);
}
export async function loadPlanFile(id: string): Promise<{ name: string; content: string }> {
  const { data, error } = await supabase.from('admin_feature_ideas').select('plan_name,plan_content').eq('id', id).single();
  if (error) throw new Error(error.message);
  if (!data?.plan_name || data.plan_content === null) throw new Error('This planning file was removed. Refresh the list.');
  return { name: data.plan_name, content: data.plan_content };
}
export async function downloadPlanFile(id: string) {
  const plan = await loadPlanFile(id);
  const url = URL.createObjectURL(new Blob([plan.content], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = plan.name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
