import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { activeAccountBan, type AccountBan } from '../features/auth/accountBan';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string; confirmationRequired?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ban, setBan] = useState<AccountBan | null>(null);
  const lastUserId = useRef<string | null>(null);
  if (user?.id) lastUserId.current = user.id;

  function rememberBan(notice: AccountBan) {
    // Other tabs may receive SIGNED_OUT before their own realtime ban event.
    try { localStorage.setItem(`olio-ban-notice:${notice.user_id}`, JSON.stringify(notice)); } catch { /* Storage is optional. */ }
    setBan(notice);
  }

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    let active = true;
    let blocked = false;
    const applyBan = (value: unknown) => {
      if (!active || blocked) return;
      const notice = activeAccountBan(value, userId);
      if (!notice) return;
      blocked = true;
      rememberBan(notice);
      // Unmount private views immediately, before waiting for local token cleanup.
      setUser(null);
      setSession(null);
      void supabase.auth.signOut({ scope: 'local' });
    };
    const check = async () => {
      const { data } = await supabase.from('account_ban_state').select('user_id,banned_until,reason').eq('user_id', userId).maybeSingle();
      applyBan(data);
    };
    const channel = supabase.channel(`account-ban:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'account_ban_state', filter: `user_id=eq.${userId}` }, (payload) => applyBan(payload.new))
      .subscribe((status) => { if (status === 'SUBSCRIBED') void check(); });
    void check();
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
    const timer = window.setInterval(onVisible, 5000);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_OUT' && lastUserId.current) {
        try {
          const notice = activeAccountBan(JSON.parse(localStorage.getItem(`olio-ban-notice:${lastUserId.current}`) || 'null'), lastUserId.current);
          if (notice) setBan(notice);
        } catch { /* Storage is optional. */ }
      }
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    const refreshVerifiedSession = async (showLoading = false) => {
      if (showLoading && mounted) setLoading(true);
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        let verifiedUser = currentSession?.user ?? null;
        if (currentSession?.access_token) {
          const { data: banState } = await supabase.from('account_ban_state')
            .select('user_id,banned_until,reason').eq('user_id', currentSession.user.id).maybeSingle();
          const notice = activeAccountBan(banState, currentSession.user.id);
          if (notice) {
            if (mounted) { rememberBan(notice); setSession(null); setUser(null); }
            await supabase.auth.signOut({ scope: 'local' });
            return;
          }
          const { data: verified, error: userError } = await supabase.auth.getUser(currentSession.access_token);
          if (!userError && verified.user) verifiedUser = verified.user;
        }
        if (mounted) {
          setSession(currentSession);
          setUser(verifiedUser);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize auth');
        }
      } finally {
        if (showLoading && mounted) setLoading(false);
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshVerifiedSession();
    };

    void refreshVerifiedSession(true);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      mounted = false;
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      setError(null);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Profiles are created atomically by the auth.users database trigger,
        // including when email confirmation means there is no session yet.
        return { success: true, confirmationRequired: !data.session };
      }

      return { success: false, error: 'Sign up failed' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setBan(null);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile) {
          await supabase.auth.signOut();
          const msg = 'Profile not found for this account. Please contact support.';
          setError(msg);
          return { success: false, error: msg };
        }
      }

      return { success: !!data.session };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      const code = typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : undefined;
      return { success: false, error: errorMessage, code };
    }
  };

  const signOut = async () => {
    setError(null);
    setUser(null);
    setSession(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
        if (localError) throw localError;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, error, signUp, signIn, signOut }}>
      {ban ? <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white" role="alert">
        <section className="w-full max-w-lg rounded-2xl border border-red-400/20 bg-slate-900 p-7">
          <h1 className="text-2xl font-semibold">Your account has been suspended</h1>
          <p className="mt-3 text-slate-300">You have been signed out. You can sign in again after {new Date(ban.banned_until).toLocaleString()}.</p>
          <p className="mt-5 text-sm text-slate-400">Reason</p><p className="mt-1 whitespace-pre-wrap break-words text-slate-100">{ban.reason}</p>
          <button onClick={() => { setBan(null); window.location.assign('/'); }} className="mt-6 rounded-xl bg-white/10 px-4 py-2 text-sm">Back to Safety</button>
        </section>
      </div> : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
