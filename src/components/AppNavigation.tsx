import { useEffect, useRef, useState } from 'react';
import {
  BookOpenText,
  Building2,
  FolderKanban,
  Home,
  Menu,
  UserCircle,
  Wrench,
  X,
} from 'lucide-react';

type AppNavigationProps = {
  currentPath: string;
  organizationName?: string | null;
  onNavigate: (path: string) => void;
};

const navigationItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/utilities', label: 'Utilities', icon: Wrench },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/organization', label: 'Organization', icon: Building2 },
  { path: '/profile', label: 'Profile', icon: UserCircle },
  { path: '/help', label: 'Help Center', icon: BookOpenText },
];

function isActivePath(currentPath: string, itemPath: string) {
  if (itemPath === '/') return currentPath === '/';
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

export function AppNavigation({ currentPath, organizationName, onNavigate }: AppNavigationProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.setTimeout(() => closeRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', onKeyDown);
      trigger?.focus();
    };
  }, [open]);

  const goTo = (path: string) => {
    setOpen(false);
    onNavigate(path);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="glass-control fixed left-4 top-4 z-[100] flex h-14 w-14 items-center justify-center sm:left-7 sm:top-7 sm:h-16 sm:w-16"
        aria-label="Open navigation"
        aria-expanded={open}
      >
        <Menu className="h-6 w-6 sm:h-7 sm:w-7" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[180]" role="dialog" aria-modal="true" aria-label="Main navigation">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-slate-950/72 backdrop-blur-md"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />

          <aside ref={drawerRef} className="glass-drawer nav-drawer-open relative flex h-full w-[min(22rem,88vw)] flex-col p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200/75">Olio Workstation</div>
                <div className="mt-2 truncate text-xl font-semibold text-white">
                  {organizationName || 'Your workspace'}
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="glass-control flex h-11 w-11 shrink-0 items-center justify-center"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="mt-7 space-y-2" aria-label="Primary navigation">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(currentPath, item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => goTo(item.path)}
                    className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-all ${
                      active
                        ? 'border-indigo-400/35 bg-indigo-500/16 text-indigo-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_35px_rgba(79,70,229,0.12)]'
                        : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.055] hover:text-white'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? 'bg-indigo-400/15' : 'bg-white/[0.045]'}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-white/10 pt-5 text-sm leading-relaxed text-slate-500">
              Your background and color choices follow you throughout Olio.
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
