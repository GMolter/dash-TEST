import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { cachePhoto, readCachedPhoto, PHOTO_BUCKET, PHOTO_CHANGED, PHOTO_CACHE_SIGNAL, type CachedPhoto } from '../lib/dashboardPhoto';

export function DashboardPhoto() {
  const { user } = useAuth();
  const userId = user?.id;
  const [photo, setPhoto] = useState<{ userId: string; url: string } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let version = 0;
    let objectUrl: string | null = null;
    const display = (blob: Blob | null) => {
      const previous = objectUrl;
      objectUrl = blob ? URL.createObjectURL(blob) : null;
      setPhoto(objectUrl ? { userId, url: objectUrl } : null);
      if (previous) URL.revokeObjectURL(previous);
    };
    const load = async (force = false) => {
      const request = ++version;
      const cached = await readCachedPhoto(userId);
      if (cancelled || request !== version) return;
      if (cached) display(cached.blob);
      if (!force && cached && Date.now() - cached.savedAt < 5 * 60 * 1000) return;
      try {
        const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(`${userId}/background`);
        if (cancelled || request !== version) return;
        if (error) {
          if (('statusCode' in error && String(error.statusCode) === '404') || error.message.toLowerCase() === 'object not found') { display(null); await cachePhoto(userId, null); }
          return;
        }
        display(data);
        await cachePhoto(userId, data);
      } catch { /* Keep cached photos available during network outages. */ }
    };
    const updated = (event: Event) => {
      const value = (event as CustomEvent<CachedPhoto>).detail;
      if (value?.userId !== userId) return;
      ++version; display(value.blob);
    };
    const storage = (event: StorageEvent) => { if (event.key === PHOTO_CACHE_SIGNAL + userId) void load(); };
    void load();
    const timer = window.setInterval(() => void load(true), 5 * 60 * 1000);
    window.addEventListener(PHOTO_CHANGED, updated);
    window.addEventListener('storage', storage);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener(PHOTO_CHANGED, updated); window.removeEventListener('storage', storage); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [userId]);
  if (!photo || photo.userId !== userId) return null;
  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-slate-950"><img src={photo.url} alt="" className="h-full w-full object-cover" onError={() => setPhoto(null)} /><div className="absolute inset-0 bg-slate-950/55" /></div>;
}
