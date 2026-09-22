import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

export type Announcement = {
  id: string; org_id: string; title: string; body: string; pinned: boolean;
  created_by: string | null; created_at: string; updated_at: string;
};
export const RESOURCE_CATEGORIES = ['General', 'Guides', 'Templates', 'Reference', 'Tools'] as const;
export type Resource = {
  id: string; org_id: string; title: string; description: string;
  category: typeof RESOURCE_CATEGORIES[number]; kind: 'link' | 'note'; url: string | null; content: string;
  created_by: string | null; created_at: string; updated_at: string;
};
export type Activity = {
  id: string; org_id: string; actor_id: string | null; actor_name: string;
  category: string; action: string; subject: string; created_at: string;
};
export type AnnouncementInput = Pick<Announcement, 'title' | 'body' | 'pinned'>;
export type ResourceInput = Pick<Resource, 'title' | 'description' | 'category' | 'kind' | 'url' | 'content'>;
export function errorMessage(error: unknown) {
  return typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message) : 'Something went wrong. Please try again.';
}
export function safeResourceUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

// Fetch every page, rather than silently losing entries at the API row limit.
async function readCollection<T>(table: string, orgId: string, sort: string): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += 200) {
    const { data, error } = await supabase.from(table).select('*').eq('org_id', orgId)
      .order(sort, { ascending: false }).order('id', { ascending: false }).range(offset, offset + 199);
    if (error) throw error;
    result.push(...(data ?? []) as T[]);
    if (!data || data.length < 200) return result;
  }
}

export function useOrganizationWorkspace(orgId: string | undefined) {
  const [snapshot, setSnapshot] = useState<{ orgId?: string; announcements: Announcement[]; resources: Resource[] }>({ announcements: [], resources: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++request.current;
    if (!orgId) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [announcements, resources] = await Promise.all([
        readCollection<Announcement>('org_announcements', orgId, 'created_at'),
        readCollection<Resource>('org_resources', orgId, 'updated_at'),
      ]);
      if (version === request.current) setSnapshot({ orgId, announcements: announcements.sort((a, b) => Number(b.pinned) - Number(a.pinned)), resources });
    } catch (err) { if (version === request.current) setError(errorMessage(err)); }
    finally { if (version === request.current) setLoading(false); }
  }, [orgId]);
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { ++request.current; window.removeEventListener('focus', onFocus); };
  }, [refresh]);
  const saveAnnouncement = async (input: AnnouncementInput, id?: string) => {
    if (!orgId) throw new Error('Organization unavailable.');
    const payload = { title: input.title.trim(), body: input.body.trim(), pinned: input.pinned };
    const query = id ? supabase.from('org_announcements').update(payload).eq('org_id', orgId).eq('id', id)
      : supabase.from('org_announcements').insert({ ...payload, org_id: orgId });
    const { error } = await query.select('id').single();
    if (error) throw error;
    await refresh();
  };
  const saveResource = async (input: ResourceInput, id?: string) => {
    if (!orgId) throw new Error('Organization unavailable.');
    const url = input.kind === 'link' ? safeResourceUrl(input.url?.trim() ?? '') : null;
    if (input.kind === 'link' && !url) throw new Error('Enter a valid http or https URL without a username or password.');
    const payload = { title: input.title.trim(), description: input.description.trim(), category: input.category,
      kind: input.kind, content: input.kind === 'note' ? input.content.trim() : '', url };
    const query = id ? supabase.from('org_resources').update(payload).eq('org_id', orgId).eq('id', id)
      : supabase.from('org_resources').insert({ ...payload, org_id: orgId });
    const { error } = await query.select('id').single();
    if (error) throw error;
    await refresh();
  };
  const remove = async (table: 'org_announcements' | 'org_resources', id: string) => {
    if (!orgId) throw new Error('Organization unavailable.');
    const { error } = await supabase.from(table).delete().eq('org_id', orgId).eq('id', id).select('id').single();
    if (error) throw error;
    await refresh();
  };
  const current = snapshot.orgId === orgId;
  return { announcements: current ? snapshot.announcements : [], resources: current ? snapshot.resources : [], loading, error, refresh, saveAnnouncement, saveResource, remove };
}

export function useOrganizationActivity(orgId: string | undefined, category: string, revision: number) {
  const [snapshot, setSnapshot] = useState<{ key: string; items: Activity[]; more: boolean }>({ key: '', items: [], more: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const key = `${orgId}:${category}:${revision}`;
  const load = useCallback(async (cursor?: Activity) => {
    if (!orgId) return;
    const version = ++request.current;
    setLoading(true); setError('');
    try {
      let query = supabase.from('org_activity').select('*').eq('org_id', orgId)
        .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(31);
      if (category !== 'all') query = query.eq('category', category);
      if (cursor) query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
      const { data, error } = await query;
      if (error) throw error;
      if (version === request.current) setSnapshot(previous => ({ key, more: (data?.length ?? 0) > 30,
        items: [...(cursor && previous.key === key ? previous.items : []), ...(data ?? []).slice(0, 30) as Activity[]] }));
    } catch (err) { if (version === request.current) setError(errorMessage(err)); }
    finally { if (version === request.current) setLoading(false); }
  }, [orgId, category, key]);
  useEffect(() => { void load(); return () => { ++request.current; }; }, [load]);
  const items = snapshot.key === key ? snapshot.items : [];
  return { items, loading, error, more: snapshot.key === key && snapshot.more,
    refresh: () => load(), loadMore: () => { if (!loading && items.length) void load(items[items.length - 1]); } };
}
