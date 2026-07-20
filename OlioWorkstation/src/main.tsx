import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './hooks/useAuth';
import { OrgProvider } from './hooks/useOrg';

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const reloadKey = 'olio-chunk-reload';
  if (window.sessionStorage.getItem(reloadKey)) return;
  window.sessionStorage.setItem(reloadKey, '1');
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <OrgProvider>
        <Suspense fallback={<div className="min-h-screen bg-slate-950" role="status" aria-label="Loading view" />}>
          <App />
        </Suspense>
      </OrgProvider>
    </AuthProvider>
  </StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const registerServiceWorker = () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(registerServiceWorker, { timeout: 2_000 });
  } else {
    globalThis.setTimeout(registerServiceWorker, 0);
  }

  globalThis.setTimeout(() => {
    window.sessionStorage.removeItem('olio-chunk-reload');
  }, 10_000);
}
