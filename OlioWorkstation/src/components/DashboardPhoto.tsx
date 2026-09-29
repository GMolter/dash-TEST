import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const bucket = 'dashboard-backgrounds';
const changed = 'olio-dashboard-photo-changed';

function validateBackgroundFile(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');
}

export function DashboardPhoto() {
  const { user } = useAuth();
  const userId = user?.id;
  const [photo, setPhoto] = useState<{ userId: string; url: string } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let version = 0;
    const load = async () => {
      const request = ++version;
      const { data } = await supabase.storage.from(bucket).createSignedUrl(`${userId}/background`, 3600);
      if (!cancelled && request === version) setPhoto(data ? { userId, url: data.signedUrl } : null);
    };
    void load();
    const timer = window.setInterval(load, 30 * 60 * 1000);
    window.addEventListener(changed, load);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener(changed, load); };
  }, [userId]);
  if (!photo || photo.userId !== user?.id) return null;
  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-slate-950"><img src={photo.url} alt="" className="h-full w-full object-cover" onError={() => setPhoto(null)} /><div className="absolute inset-0 bg-slate-950/55" /></div>;
}

export function DashboardPhotoSettings() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function save(file?: File) {
    if (!user || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (file) {
        validateBackgroundFile(file);
        const bitmap = await createImageBitmap(file).catch(() => { throw new Error('This image could not be opened. Choose another image.'); });
        bitmap.close();
      }
      const path = `${user.id}/background`;
      const result = file
        ? await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type, cacheControl: '0' })
        : await supabase.storage.from(bucket).remove([path]);
      if (result.error) throw result.error;
      window.dispatchEvent(new Event(changed));
      setMessage(file ? 'Dashboard photo saved.' : 'Built-in background restored.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save the background. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="mt-4 space-y-3 rounded-lg bg-slate-900/50 p-4">
    <label className="block text-sm font-medium">Upload a dashboard photo<input aria-label="Dashboard photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || !user} className="mt-2 block w-full text-sm" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void save(file); }} /></label>
    <p className="text-xs text-slate-400">JPEG, PNG, or WebP, up to 5 MB. Saved privately to your account. Photos fill the screen and may be cropped.</p>
    <button disabled={busy || !user} onClick={() => void save()} className="text-sm text-blue-300 disabled:opacity-50">Use built-in background</button>
    {busy && <p role="status">Saving background…</p>}{message && <p role="status" className="text-sm text-emerald-300">{message}</p>}{error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </div>;
}
