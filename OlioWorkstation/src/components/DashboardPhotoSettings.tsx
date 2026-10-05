import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Move, RotateCcw, Upload, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { publishPhoto, photoCrop, PHOTO_BUCKET } from '../lib/dashboardPhoto';

const control = 'w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-violet-400';

export function DashboardPhotoSettings({ accountUserId }: { accountUserId?: string } = {}) {
  const { user } = useAuth();
  const userId = accountUserId || user?.id;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [source, setSource] = useState<{ bitmap: ImageBitmap; name: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [aspect, setAspect] = useState('screen');
  const [outputWidth, setOutputWidth] = useState(1920);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const selection = useRef(0);
  const screenRatio = useRef(window.innerWidth / Math.max(1, window.innerHeight));
  const ratio = aspect === 'screen' ? screenRatio.current : aspect === 'original' && source ? source.bitmap.width / source.bitmap.height : Number(aspect) || 16 / 9;
  const resizedWidth = Math.min(outputWidth, Math.round(4096 * ratio));
  const outputHeight = Math.max(1, Math.round(resizedWidth / ratio));
  const reset = () => { setZoom(1); setX(50); setY(50); };

  useEffect(() => () => source?.bitmap.close(), [source]);
  useEffect(() => () => { ++selection.current; }, []);
  useEffect(() => {
    if (!source || !canvas.current) return;
    const ctx = canvas.current.getContext('2d');
    if (!ctx) return;
    const crop = photoCrop(source.bitmap.width, source.bitmap.height, ratio, zoom, x, y);
    ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
    ctx.drawImage(source.bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.current.width, canvas.current.height);
  }, [source, ratio, zoom, x, y]);

  async function choose(file: File) {
    const request = ++selection.current;
    setError(''); setMessage('');
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');
      if (file.size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');
      const bitmap = await createImageBitmap(file).catch(() => { throw new Error('This image could not be opened. Choose another image.'); });
      if (request !== selection.current) { bitmap.close(); return; }
      if (bitmap.width / bitmap.height < 0.1 || bitmap.width / bitmap.height > 10) { bitmap.close(); throw new Error('Choose an image with a less extreme aspect ratio.'); }
      setSource({ bitmap, name: file.name }); reset();
    } catch (cause) { if (request === selection.current) setError(cause instanceof Error ? cause.message : 'Unable to open this image.'); }
  }

  useEffect(() => {
    if (!accountUserId) return;
    let cancelled = false;
    void supabase.storage.from(PHOTO_BUCKET).download(accountUserId + '/background').then(async ({ data, error }) => {
      if (cancelled) return;
      if (error) { setMessage('No accessible custom background. You can upload a replacement.'); return; }
      const bitmap = await createImageBitmap(data);
      if (cancelled) { bitmap.close(); return; }
      setSource({ bitmap, name: 'Current background' });
    }).catch(() => { if (!cancelled) setError('Could not load the background.'); });
    return () => { cancelled = true; };
  }, [accountUserId]);

  async function save(remove = false) {
    if (!userId || busy || (!remove && !source)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      let blob: Blob | null = null;
      if (!remove && source) {
        const output = document.createElement('canvas');
        output.width = resizedWidth; output.height = outputHeight;
        const ctx = output.getContext('2d');
        if (!ctx) throw new Error('Image editing is unavailable in this browser.');
        const crop = photoCrop(source.bitmap.width, source.bitmap.height, ratio, zoom, x, y);
        ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, output.width, output.height);
        ctx.drawImage(source.bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, output.width, output.height);
        blob = await new Promise<Blob>((resolve, reject) => output.toBlob(value => value ? resolve(value) : reject(new Error('Unable to prepare this image.')), 'image/jpeg', 0.9));
        if (blob.size > 5 * 1024 * 1024) throw new Error('This crop is too large. Choose a smaller output size.');
      }
      const path = `${userId}/background`;
      const result = blob
        ? await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '0' })
        : await supabase.storage.from(PHOTO_BUCKET).remove([path]);
      if (result.error) throw result.error;
      await publishPhoto(userId!, blob);
      setMessage(blob ? 'Photo applied. Your background is ready in new tabs, too.' : 'Built-in background restored.');
      if (remove) setSource(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save the background. Please try again.'); }
    finally { setBusy(false); }
  }

  return <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
    <div className="min-w-0 space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400"><span className="uppercase tracking-[0.18em]">Your canvas</span>{source && <span className="flex items-center gap-1.5"><Move className="h-3.5 w-3.5" />Drag to reposition</span>}</div>
      <div className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-inner" style={{ aspectRatio: ratio }}>
        {source ? <><canvas ref={canvas} width={960} height={Math.round(960 / ratio)} aria-label="Photo crop preview" className="absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing" onPointerDown={e => { if (busy) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, left: x, top: y }; }} onPointerMove={e => {
          if (!drag.current || busy) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const crop = photoCrop(source.bitmap.width, source.bitmap.height, ratio, zoom, x, y);
          const dx = (source.bitmap.width - crop.width) * rect.width / crop.width;
          const dy = (source.bitmap.height - crop.height) * rect.height / crop.height;
          if (dx > 0) setX(Math.max(0, Math.min(100, drag.current.left - (e.clientX - drag.current.x) / dx * 100)));
          if (dy > 0) setY(Math.max(0, Math.min(100, drag.current.top - (e.clientY - drag.current.y) / dy * 100)));
        }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} /><div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-35">{Array.from({ length: 9 }, (_, i) => <div key={i} className="border border-white/30" />)}</div><span className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-slate-950/75 px-3 py-1.5 text-xs text-white">{resizedWidth} × {outputHeight}</span></> : <button disabled={busy} onClick={() => fileInput.current?.click()} className="group flex flex-col items-center px-6 py-12 text-center"><span className="mb-4 rounded-2xl border border-violet-300/20 bg-violet-400/10 p-4 text-violet-300 transition group-hover:bg-violet-400/20"><ImagePlus className="h-8 w-8" /></span><span className="text-lg font-medium text-white">Make it your space</span><span className="mt-2 max-w-xs text-sm leading-6 text-slate-400">Choose a photo and find the perfect frame for your dashboard.</span></button>}
      </div>
      <p className="text-xs leading-5 text-slate-500">Your crop fills the dashboard with a soft dark overlay. Different screen shapes may trim the edges.</p>
    </div>
    <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div><h4 className="text-lg font-semibold">Photo background</h4><p className="mt-1 text-sm text-slate-400">Frame it exactly how you like it.</p></div>
      <input ref={fileInput} aria-label="Dashboard photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || !user} className="sr-only" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void choose(file); }} />
      <button disabled={busy || !user} onClick={() => fileInput.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-400/10 px-4 py-3 text-sm font-medium text-violet-200 transition hover:bg-violet-400/20 disabled:opacity-40"><Upload className="h-4 w-4" />{source ? 'Choose another photo' : 'Choose a photo'}</button>
      <p className="truncate text-xs text-slate-500">{source ? source.name : 'JPEG, PNG, or WebP · Up to 5 MB'}</p>
      <fieldset disabled={!source || busy} className="space-y-4 disabled:opacity-40">
        <div className="grid grid-cols-2 gap-3"><label className="space-y-2 text-xs text-slate-400"><span>Crop shape</span><select className={control} value={aspect} onChange={e => { setAspect(e.target.value); reset(); }}><option value="screen">This screen</option><option value={16 / 9}>Landscape 16:9</option><option value={21 / 9}>Ultrawide 21:9</option><option value={4 / 3}>Classic 4:3</option><option value="original">Original</option></select></label><label className="space-y-2 text-xs text-slate-400"><span>Output width</span><select className={control} value={outputWidth} onChange={e => setOutputWidth(Number(e.target.value))}><option value={1280}>1280 px</option><option value={1920}>1920 px</option><option value={2560}>2560 px</option></select></label></div>
        <label className="block text-xs text-slate-400"><span className="mb-2 flex justify-between"><span>Zoom</span><span>{zoom.toFixed(2)}×</span></span><input aria-label="Zoom" className="w-full accent-violet-400" type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label>
        <div className="grid grid-cols-2 gap-4"><label className="text-xs text-slate-400">Horizontal position<input className="mt-2 w-full accent-violet-400" type="range" min={0} max={100} value={x} onChange={e => setX(Number(e.target.value))} /></label><label className="text-xs text-slate-400">Vertical position<input className="mt-2 w-full accent-violet-400" type="range" min={0} max={100} value={y} onChange={e => setY(Number(e.target.value))} /></label></div>
        <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"><RotateCcw className="h-3 w-3" />Reset framing</button>
      </fieldset>
      <div className="space-y-3 border-t border-white/10 pt-5"><button disabled={busy || !source || !user} onClick={() => void save()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400 disabled:opacity-40"><Check className="h-4 w-4" />{busy ? 'Saving…' : 'Apply photo'}</button><button disabled={busy || !user} onClick={() => void save(true)} className="w-full text-center text-xs text-slate-400 hover:text-white disabled:opacity-40">Use built-in background</button></div>
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}{error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </div>
  </div>;
}
