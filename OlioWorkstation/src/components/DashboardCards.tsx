import { formattedUrl, SHORTCUTS } from '../lib/dashboardCardDefinitions';
import { useState } from 'react';
import { ArrowRight, Folder } from 'lucide-react';
import type { DashboardQuicklink, DashboardQuicklinkFolder } from '../hooks/useFreeformDashboard';

export function QuicklinkIcon({ link }: { link: DashboardQuicklink }) {
  const customImage = /^https?:\/\//i.test(link.icon || '') ? link.icon.trim() : '';
  let favicon = '';
  try { favicon = `https://www.google.com/s2/favicons?domain=${new URL(formattedUrl(link.url)).hostname}&sz=64`; } catch { /* emoji fallback */ }
  const [imageFailed, setImageFailed] = useState(false);
  if (!imageFailed && (customImage || favicon)) return <img src={customImage || favicon} alt="" className="h-12 w-12 rounded-xl object-cover" onError={() => setImageFailed(true)} />;
  return <span className="text-4xl leading-none">{link.icon && !customImage ? link.icon : '🔗'}</span>;
}

export function QuicklinkCard({ link }: { link: DashboardQuicklink }) {
  return (
    <a href={formattedUrl(link.url)} className="glass-panel flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-[1.5rem] p-4 text-center transition hover:border-indigo-300/30 hover:bg-slate-900/55">
      <QuicklinkIcon link={link} />
      <div className="mt-3 max-w-full truncate text-sm font-semibold text-white">{link.title}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-violet-300">Quick link</div>
    </a>
  );
}

export function FolderIcon({ folder }: { folder: DashboardQuicklinkFolder }) {
  const icon = (folder.icon || '').trim();
  const isUrl = /^https?:\/\//i.test(icon);
  const [failedSrc, setFailedSrc] = useState('');
  if (isUrl && failedSrc !== icon) return <img src={icon} alt="" className="h-12 w-12 rounded-xl object-cover" onError={() => setFailedSrc(icon)} />;
  if (icon && icon !== 'folder' && !isUrl) return <span className="text-4xl leading-none">{icon}</span>;
  return <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10"><Folder className="h-7 w-7 text-violet-200" /></span>;
}

export function FolderCard({ folder, linkCount, onOpen }: { folder: DashboardQuicklinkFolder; linkCount: number; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="glass-panel group flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[1.5rem] p-4 text-center transition hover:border-violet-300/35 hover:bg-slate-900/55">
      <FolderIcon folder={folder} />
      <div className="mt-3 flex max-w-full items-center gap-1.5 text-sm font-semibold text-white"><span className="truncate">{folder.name}</span><ArrowRight className="h-3.5 w-3.5 shrink-0 text-violet-300 transition-transform group-hover:translate-x-0.5" /></div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-violet-300">{linkCount} {linkCount === 1 ? 'link' : 'links'}</div>
    </button>
  );
}

export function ShortcutCard({ shortcut, onNavigate, onOpenTool }: { shortcut: keyof typeof SHORTCUTS; onNavigate: (path: string) => void; onOpenTool: (tool: string) => void }) {
  const definition = SHORTCUTS[shortcut];
  const Icon = definition.icon;
  return <button type="button" onClick={() => shortcut === 'utilities' ? onNavigate('/utilities') : onOpenTool(shortcut)} className="glass-panel flex h-full w-full flex-col items-center justify-center rounded-[1.5rem] p-4 text-center hover:border-indigo-300/30 hover:bg-slate-900/55"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-400/10"><Icon className="h-6 w-6 text-indigo-200" /></span><span className="mt-3 text-sm font-semibold text-white">{definition.label}</span><span className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">Shortcut</span></button>;
}

