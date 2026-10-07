import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppErrorBoundary } from './components/AppErrorBoundary';

const Landing = lazy(() => import('./pages/Landing'));
const WorkspaceApp = lazy(() => import('./WorkspaceApp'));
const isLanding = window.location.pathname.replace(/\/+$/, '') === '/landing';

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const reloadKey = 'olio-chunk-reload';
  if (window.sessionStorage.getItem(reloadKey)) return;
  window.sessionStorage.setItem(reloadKey, '1');
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300" role="status">Loading Olio…</div>}>
        {isLanding ? <Landing /> : <WorkspaceApp />}
      </Suspense>
    </AppErrorBoundary>
  </StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Registration lives in index.html so it also runs if an app module fails.
  globalThis.setTimeout(() => {
    window.sessionStorage.removeItem('olio-chunk-reload');
  }, 10_000);
}
