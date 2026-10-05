import { useEffect, useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  secretCode: string;
}

export function SecretView({ secretCode }: Props) {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [revealed, setRevealed] = useState(false);
  const [ownerPreview, setOwnerPreview] = useState(false);
  useEffect(() => { setContent(''); setError(''); setRevealed(false); setLoading(false); }, [secretCode]);
  const reveal = async () => {
    setLoading(true);
    const { data: own } = await supabase.from('secrets').select('id').eq('secret_code', secretCode).maybeSingle();
    const { data, error } = await supabase.rpc('reveal_secret', { p_code: secretCode });
    setOwnerPreview(!!own);
    if (error || data === null) setError('This secret is unavailable, expired, or already viewed.');
    else { setContent(data); setRevealed(true); }
    setLoading(false);
  };
  if (!loading && !error && !revealed) return <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6"><div className="rounded-lg bg-slate-800 p-8 text-white"><h1 className="text-2xl font-bold">Private secret</h1><p className="my-4">Reveal only when you are ready. Recipients can open this secret once.</p><button onClick={reveal} className="rounded bg-blue-600 px-4 py-2">Reveal secret</button></div></div>;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading secret...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800 rounded-lg p-8 text-center border border-slate-700">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Secret Not Available</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-800 rounded-lg p-8 border border-slate-700">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-green-500" />
          <h1 className="text-2xl font-bold text-white">Secret Message</h1>
        </div>
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
          <p className="text-white whitespace-pre-wrap break-words">{content}</p>
        </div>
        <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
          <p className="text-yellow-400 text-sm">
            {ownerPreview ? 'Your preview does not consume the recipient’s one-time link.' : 'This secret has been destroyed and can no longer be viewed.'}
          </p>
        </div>
      </div>
    </div>
  );
}
