import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Record visits from restored sessions too. Hidden tabs and background auth
// refreshes are not visits; returning to a tab is. Throttle rapid focus events.
export function useAppActivity(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    let pending = false;
    let lastAttempt = -Infinity;
    let warned = false;
    const record = async () => {
      if (stopped || document.visibilityState !== 'visible' || pending || Date.now() - lastAttempt < 60_000) return;
      lastAttempt = Date.now();
      pending = true;
      try {
        const { error } = await supabase.rpc('record_app_activity');
        if (error) throw error;
        warned = false;
      }
      catch {
        if (!warned) console.warn('App activity could not be saved. Verify the activity migration is installed and the database is reachable. Retrying while the app is visible.');
        warned = true;
      }
      finally { pending = false; }
    };
    void record();
    const onReturn = () => { void record(); };
    window.addEventListener('focus', onReturn);
    window.addEventListener('pageshow', onReturn);
    window.addEventListener('online', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    // A visible session can span days without another focus event.
    const timer = window.setInterval(onReturn, 60_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onReturn);
      window.removeEventListener('pageshow', onReturn);
      window.removeEventListener('online', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [userId]);
}
