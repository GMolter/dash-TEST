import { useState, useEffect } from 'react';
import { AnimatedBackground } from './components/AnimatedBackground';
import { Quicklinks } from './components/Quicklinks';
import { URLShortener } from './components/URLShortener';
import { SecretSharing } from './components/SecretSharing';
import { QRCodeGenerator } from './components/QRCodeGenerator';
import { Pastebin } from './components/Pastebin';
import { URLRedirect } from './pages/URLRedirect';
import { SecretView } from './pages/SecretView';
import { PasteView } from './pages/PasteView';
import { PasteList } from './pages/PasteList';
import { NotFound } from './pages/NotFound';
import Admin from './pages/Admin';
import { UtilitiesHub } from './components/UtilitiesHub';
import { DashboardTodosHomeHeader } from './components/DashboardTodos';
import { AppNavigation } from './components/AppNavigation';
import { ProjectsCenterApp } from './pages/ProjectsCenterApp';
import { ProjectDashboard } from './pages/ProjectDashboard';
import { Onboarding } from './pages/Onboarding';
import { OrgSetup } from './pages/OrgSetup';
import { OrganizationPage } from './pages/OrganizationPage';
import { ProfileSettings } from './pages/ProfileSettings';
import { HelpPage } from './pages/HelpPage';
import { HelpArticlePage } from './pages/HelpArticlePage';
import { useAuth } from './hooks/useAuth';
import { useOrg } from './hooks/useOrg';
import {
  APP_BACKGROUND_THEME_PRESETS_CHANGE_EVENT,
  APP_BACKGROUND_THEME_PRESETS_STORAGE_KEY,
  APP_BACKGROUND_THEME_STORAGE_KEY,
  APP_BACKGROUND_THEME_CHANGE_EVENT,
  AppBackgroundThemePresetMap,
  AppBackgroundTheme,
  getStoredAppBackgroundThemePresets,
  getStoredAppBackgroundTheme,
  isAppBackgroundTheme,
  normalizeAppBackgroundThemePresets,
  setStoredAppBackgroundThemePreset,
  setStoredAppBackgroundTheme,
} from './lib/appTheme';
import { AlertTriangle } from 'lucide-react';

type View =
  | { type: 'home' }
  | { type: 'utilities' }
  | { type: 'admin' }
  | { type: 'admin-editor' }
  | { type: 'organization' }
  | { type: 'profile' }
  | { type: 'help' }
  | { type: 'help-article'; slug: string }
  | { type: 'tool'; tool: string }
  | { type: 'redirect'; code: string }
  | { type: 'secret'; code: string }
  | { type: 'paste'; code: string }
  | { type: 'paste-list' }
  | { type: 'projects-center' }
  | { type: 'project-dashboard'; id: string };

type BannerState = { enabled: boolean; text: string };

function App() {
  const { user, loading: authLoading } = useAuth();
  const { profile, organization } = useOrg();

  const [view, setView] = useState<View>({ type: 'home' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [banner, setBanner] = useState<BannerState>({ enabled: false, text: '' });
  const [allowOnboarding, setAllowOnboarding] = useState(false);
  const [appBackgroundTheme, setAppBackgroundTheme] = useState<AppBackgroundTheme>(() => getStoredAppBackgroundTheme());
  const [appBackgroundThemePresets, setAppBackgroundThemePresets] = useState<AppBackgroundThemePresetMap>(() => getStoredAppBackgroundThemePresets());
  const appBackgroundPreset = appBackgroundThemePresets[appBackgroundTheme];

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (authLoading || user) {
      setAllowOnboarding(false);
      return;
    }

    const timeout = window.setTimeout(() => setAllowOnboarding(true), 350);
    return () => clearTimeout(timeout);
  }, [authLoading, user]);

  useEffect(() => {
    const onThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppBackgroundTheme>;
      if (isAppBackgroundTheme(customEvent.detail)) {
        setAppBackgroundTheme(customEvent.detail);
      }
    };

    const onThemePresetsChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppBackgroundThemePresetMap>;
      setAppBackgroundThemePresets(normalizeAppBackgroundThemePresets(customEvent.detail));
    };

    const onStorage = (event: StorageEvent) => {
      if (!event.key) return;

      if (event.key === APP_BACKGROUND_THEME_STORAGE_KEY) {
        if (event.newValue && isAppBackgroundTheme(event.newValue)) {
          setAppBackgroundTheme(event.newValue);
          return;
        }
        setAppBackgroundTheme(getStoredAppBackgroundTheme());
      }

      if (event.key === APP_BACKGROUND_THEME_PRESETS_STORAGE_KEY) {
        setAppBackgroundThemePresets(getStoredAppBackgroundThemePresets());
        return;
      }
    };

    window.addEventListener(APP_BACKGROUND_THEME_CHANGE_EVENT, onThemeChange as EventListener);
    window.addEventListener(APP_BACKGROUND_THEME_PRESETS_CHANGE_EVENT, onThemePresetsChange as EventListener);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(APP_BACKGROUND_THEME_CHANGE_EVENT, onThemeChange as EventListener);
      window.removeEventListener(APP_BACKGROUND_THEME_PRESETS_CHANGE_EVENT, onThemePresetsChange as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBanner() {
      try {
        const r = await fetch('/api/public/settings');
        const j = await r.json();
        if (cancelled) return;

        setBanner({
          enabled: !!j.bannerEnabled,
          text: j.bannerText || '',
        });
      } catch {
        if (cancelled) return;
        setBanner({ enabled: false, text: '' });
      }
    }

    loadBanner();

    const onVis = () => {
      if (document.visibilityState === 'visible') loadBanner();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  useEffect(() => {
    const resolve = () => {
      const path = window.location.pathname || '/';
      const cleanPath = path.replace(/\/+$/, '') || '/';

      if (cleanPath === '/projects') {
        setView({ type: 'projects-center' });
        return;
      }
      if (cleanPath.startsWith('/projects/')) {
        const id = cleanPath.replace('/projects/', '').split('/')[0];
        if (id) setView({ type: 'project-dashboard', id });
        else setView({ type: 'projects-center' });
        return;
      }

      if (cleanPath === '/admin') {
        setView({ type: 'admin' });
        if (window.location.pathname !== '/') window.history.replaceState({}, '', '/');
        return;
      }
      if (cleanPath === '/admin/editor') {
        setView({ type: 'admin-editor' });
        return;
      }

      if (cleanPath === '/organization') {
        setView({ type: 'organization' });
        if (window.location.pathname !== '/') window.history.replaceState({}, '', '/');
        return;
      }

      if (cleanPath === '/profile') {
        setView({ type: 'profile' });
        if (window.location.pathname !== '/') window.history.replaceState({}, '', '/');
        return;
      }

      if (cleanPath === '/help') {
        setView({ type: 'help' });
        return;
      }
      if (cleanPath.startsWith('/help/article/')) {
        const slug = cleanPath.replace('/help/article/', '').split('/')[0];
        if (slug) setView({ type: 'help-article', slug });
        else setView({ type: 'tool', tool: 'notfound' });
        return;
      }

      if (cleanPath === '/utilities') {
        setView({ type: 'utilities' });
        if (window.location.pathname !== '/') window.history.replaceState({}, '', '/');
        return;
      }

      if (cleanPath === '/p' || cleanPath === '/pastes') {
        setView({ type: 'paste-list' });
        if (window.location.pathname !== '/') window.history.replaceState({}, '', '/');
        return;
      }

      if (cleanPath.startsWith('/s/')) {
        const code = cleanPath.replace('/s/', '').split('/')[0];
        if (code) setView({ type: 'secret', code });
        else setView({ type: 'tool', tool: 'notfound' });
        return;
      }

      if (cleanPath.startsWith('/secret/')) {
        const code = cleanPath.replace('/secret/', '').split('/')[0];
        if (code) setView({ type: 'secret', code });
        else setView({ type: 'tool', tool: 'notfound' });
        return;
      }

      if (cleanPath.startsWith('/p/')) {
        const code = cleanPath.replace('/p/', '').split('/')[0];
        if (code) setView({ type: 'paste', code });
        else setView({ type: 'tool', tool: 'notfound' });
        return;
      }

      if (cleanPath.startsWith('/paste/')) {
        const code = cleanPath.replace('/paste/', '').split('/')[0];
        if (code) setView({ type: 'paste', code });
        else setView({ type: 'tool', tool: 'notfound' });
        return;
      }

      const maybeCode = cleanPath.replace(/^\//, '');
      if (maybeCode && !['home', 'admin', 'utilities', 'p', 'pastes', 'projects', 'organization', 'profile', 'help'].includes(maybeCode)) {
        setView({ type: 'redirect', code: maybeCode });
        return;
      }

      setView({ type: 'home' });
    };

    resolve();

    window.addEventListener('popstate', resolve);
    return () => window.removeEventListener('popstate', resolve);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const utilities = [
    { id: 'quicklinks', label: 'Quick Links', icon: '🔗', desc: 'Manage bookmarks' },
    { id: 'projects', label: 'Projects', icon: '📁', desc: 'Track your work' },
    { id: 'triggers', label: 'Help Center', icon: '📚', desc: 'Browse docs and guides' },
    { id: 'shortener', label: 'URL Shortener', icon: '✂️', desc: 'Shorten URLs' },
    { id: 'secrets', label: 'Secret Sharing', icon: '🔒', desc: 'One-time links' },
    { id: 'qr', label: 'QR Generator', icon: '📱', desc: 'Generate QR codes' },
    { id: 'pastebin', label: 'Pastebin', icon: '📝', desc: 'Share code/text' },
  ];

  const renderHome = () => (
    <div className="mx-auto min-h-screen w-full max-w-[88rem] px-5 pb-16 sm:px-8 lg:px-12">
      <DashboardTodosHomeHeader />
      <section className="mx-auto max-w-4xl pt-24 text-center sm:pt-24 lg:pt-24">
        <h1 className="text-4xl font-semibold tracking-[-0.035em] text-white drop-shadow-[0_5px_28px_rgba(255,255,255,0.12)] sm:text-5xl lg:text-6xl">
          Olio Workstation
        </h1>
        <p className="mt-5 text-base text-slate-300 sm:text-xl lg:text-2xl">
          {getGreeting()}
          <span className="mx-2 text-violet-400">•</span>
          {formatDate(currentTime)}
          <span className="mx-2 text-violet-400">•</span>
          <span className="font-mono text-slate-200">{formatTime(currentTime)}</span>
        </p>
        <div className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-violet-400 to-transparent shadow-[0_0_14px_rgba(139,92,246,0.9)]" />
      </section>

      {banner.enabled && banner.text?.trim() && (
        <div className="mx-auto mt-9 max-w-4xl rounded-3xl border border-amber-300/20 bg-amber-400/[0.09] px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_65px_rgba(2,6,23,0.3)] backdrop-blur-xl sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10">
              <AlertTriangle className="h-5 w-5 text-amber-200" />
            </div>
            <div className="pt-2 text-sm leading-relaxed text-amber-100 sm:text-base">{banner.text}</div>
          </div>
        </div>
      )}

      <section className="mt-9 sm:mt-10 lg:mt-11" aria-label="Quick Links">
        <Quicklinks editMode={false} />
      </section>
    </div>
  );

  const renderUtilities = () => {
    if (view.type === 'tool') {
      return (
        <div className="space-y-6">
          <button
            onClick={() => setView({ type: 'utilities' })}
            className="text-slate-300 hover:text-white flex items-center gap-2"
          >
            ← Back to Utilities
          </button>

          {view.tool === 'quicklinks' && <Quicklinks editMode={true} />}
          {view.tool === 'shortener' && <URLShortener />}
          {view.tool === 'secrets' && <SecretSharing />}
          {view.tool === 'qr' && <QRCodeGenerator />}
          {view.tool === 'pastebin' && <Pastebin />}
        </div>
      );
    }

    return (
      <UtilitiesHub
        tools={utilities}
        onOpenTool={(toolId) => {
          if (toolId === 'projects') {
            navigateTo('/projects');
          } else if (toolId === 'triggers') {
            navigateTo('/help');
          } else {
            setView({ type: 'tool', tool: toolId });
          }
        }}
      />
    );
  };

  const isPublicRoute = view.type === 'redirect' || view.type === 'secret' || view.type === 'paste' || view.type === 'paste-list';

  const currentNavigationPath = (() => {
    if (view.type === 'home') return '/';
    if (view.type === 'utilities' || view.type === 'tool') return '/utilities';
    if (view.type === 'projects-center') return '/projects';
    if (view.type === 'project-dashboard') return `/projects/${view.id}`;
    if (view.type === 'organization') return '/organization';
    if (view.type === 'profile') return '/profile';
    if (view.type === 'help') return '/help';
    if (view.type === 'help-article') return `/help/article/${view.slug}`;
    return window.location.pathname || '/';
  })();

  const floatingNavigation = user ? (
    <AppNavigation
      currentPath={currentNavigationPath}
      organizationName={organization?.name}
      onNavigate={navigateTo}
    />
  ) : null;

  if (view.type === 'projects-center') {
    return (
      <>
        {floatingNavigation}
        <ProjectsCenterApp
          onOpenProject={(id) => navigateTo(`/projects/${id}`)}
          backgroundTheme={appBackgroundTheme}
          backgroundPreset={appBackgroundPreset}
        />
      </>
    );
  }

  if (view.type === 'project-dashboard') {
    return (
      <>
        {floatingNavigation}
        <ProjectDashboard
          projectId={view.id}
          backgroundTheme={appBackgroundTheme}
          backgroundPreset={appBackgroundPreset}
        />
      </>
    );
  }

  if (view.type === 'help') {
    return (
      <>
        <AnimatedBackground theme={appBackgroundTheme} preset={appBackgroundPreset} />
        {floatingNavigation}
        <div className="relative z-10"><HelpPage /></div>
      </>
    );
  }

  if (view.type === 'help-article') {
    return (
      <>
        <AnimatedBackground theme={appBackgroundTheme} preset={appBackgroundPreset} />
        {floatingNavigation}
        <div className="relative z-10"><HelpArticlePage slug={view.slug} /></div>
      </>
    );
  }

  if (view.type === 'admin-editor') {
    return (
      <>
        {floatingNavigation}
        <Admin editorOnly />
      </>
    );
  }

  if (isPublicRoute) {
    return (
      <>
        {view.type === 'redirect' && <URLRedirect shortCode={view.code} />}
        {view.type === 'secret' && <SecretView secretCode={view.code} />}
        {view.type === 'paste' && <PasteView pasteCode={view.code} />}
        {view.type === 'paste-list' && <PasteList />}
      </>
    );
  }

  if (!user && allowOnboarding) {
    return <Onboarding />;
  }

  if (user && !authLoading && profile && !profile.org_id) {
    return <OrgSetup />;
  }

  return (
    <div className="min-h-screen text-white relative">
      <AnimatedBackground theme={appBackgroundTheme} preset={appBackgroundPreset} />
      {floatingNavigation}
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <main className={view.type === 'home' ? 'flex-1' : 'glass-page-offset flex-1 p-4 sm:p-6 lg:p-10'}>
            {view.type === 'home' && renderHome()}
            {view.type === 'utilities' && renderUtilities()}
            {view.type === 'tool' && renderUtilities()}
            {view.type === 'organization' && <OrganizationPage />}
            {view.type === 'profile' && (
              <ProfileSettings
                appBackgroundTheme={appBackgroundTheme}
                appBackgroundPreset={appBackgroundPreset}
                getPresetForTheme={(theme) => appBackgroundThemePresets[theme]}
                onAppBackgroundThemeChange={(theme) => {
                  setAppBackgroundTheme(theme);
                  setStoredAppBackgroundTheme(theme);
                }}
                onAppBackgroundPresetChange={(theme, preset) => {
                  setAppBackgroundThemePresets((prev) => ({ ...prev, [theme]: preset }));
                  setStoredAppBackgroundThemePreset(theme, preset);
                }}
              />
            )}
            {view.type === 'admin' && <Admin />}
            {view.type === 'tool' && view.tool === 'notfound' && <NotFound />}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;

function navigateTo(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
