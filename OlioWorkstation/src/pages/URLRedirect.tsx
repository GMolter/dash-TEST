import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { NotFound } from './NotFound';

interface Props {
  shortCode: string;
}

export function URLRedirect({ shortCode }: Props) {
  const [error, setError] = useState(false);

  useEffect(() => {
    const redirect = async () => {
      const { data, error } = await supabase.rpc('resolve_short_url', { p_code: shortCode });
      if (error || !data) { setError(true); return; }

      // Ensure URL has a protocol
      let targetUrl = data;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      window.location.href = targetUrl;
    };

    redirect();
  }, [shortCode]);

  if (error) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Redirecting...</p>
      </div>
    </div>
  );
}
