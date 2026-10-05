import { useState, useEffect } from 'react';
import { Shield, Eye, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Secret {
  id: string;
  secret_code: string;
  viewed: boolean;
  expires_at: string;
  created_at: string;
}

export function SecretSharing() {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [createdLink, setCreatedLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [content, setContent] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadSecrets();
  }, [user?.id]);

  const loadSecrets = async () => {
    const { data, error } = await supabase
      .from('secrets')
      .select('id, secret_code, viewed, expires_at, created_at')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSecrets(data);
    }
  };

  const generateSecretCode = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  };

  const createSecret = async () => {
    if (!content.trim() || !user || saving) return;
    setSaving(true);
    setError('');

    const secretCode = generateSecretCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    const { error } = await supabase.from('secrets').insert({
      secret_code: secretCode,
      content: content,
      expires_at: expiresAt.toISOString(),
      org_id: null,
      user_id: user.id,
    });

    setSaving(false);
    if (error) setError('Could not create the secret. Please try again.');
    if (!error) {
      setCreatedLink(secretCode);
      setContent('');
      loadSecrets();
    }
  };

  const copyToClipboard = async (secretCode: string) => {
    // Share route (keeps the path; App also supports legacy /secret/:code)
    const secretUrl = `${window.location.origin}/s/${secretCode}`;
    try { await navigator.clipboard.writeText(secretUrl); } catch { setError('Copy failed. Select the link and copy it manually.'); return; }
    setCopied(secretCode);
    setTimeout(() => setCopied(null), 2000);
  };

  const getSecretUrl = (secretCode: string) => `${window.location.origin}/s/${secretCode}`;

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Secret Sharing
        </h2>
      </div>

      <p className="mb-3 text-sm text-slate-400">Private to you. Only someone with the link can reveal it once. Previewing your own secret does not consume it.</p>
      {error && <p role="alert" className="mb-3 text-red-300">{error}</p>}
      {createdLink && <div role="status" className="mb-4 rounded-lg bg-green-900/20 p-4">
        <p className="text-green-300">Secret created. Copy this link to share it.</p>
        <input aria-label="New secret link" readOnly value={getSecretUrl(createdLink)} onFocus={e => e.target.select()} className="my-2 w-full bg-slate-900 p-2 text-white" />
        <button onClick={() => copyToClipboard(createdLink)} className="rounded bg-blue-600 px-4 py-2 text-white">{copied === createdLink ? 'Copied!' : 'Copy link'}</button>
      </div>}
      <div className="mb-4 space-y-2 p-4 bg-slate-900/50 rounded-lg">
        <textarea
          placeholder="Enter your secret message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={4}
        />
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <label className="text-slate-400 text-sm">Expires in:</label>
          <select
            value={expiryHours}
            onChange={(e) => setExpiryHours(Number(e.target.value))}
            className="px-3 py-1 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={24}>24 hours</option>
            <option value={72}>3 days</option>
            <option value={168}>7 days</option>
          </select>
        </div>
        <button
          disabled={saving || !content.trim()}
          onClick={createSecret}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
        >
          Create Secret Link
        </button>
      </div>

      <div className="space-y-3">
        {secrets.map((secret) => (
          <div
            key={secret.id}
            className={`bg-slate-900/50 rounded-lg p-4 ${
              secret.viewed || isExpired(secret.expires_at) ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-blue-400 hover:text-blue-300 font-mono text-sm truncate block"
                  >
                    {getSecretUrl(secret.secret_code)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(secret.secret_code)}
                    aria-label="Copy secret link"
                    className="p-1 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                    disabled={secret.viewed || isExpired(secret.expires_at)}
                  >
                    {copied === secret.secret_code ? (
                      <span className="text-green-400 text-xs">Copied!</span>
                    ) : (
                      <span className="text-blue-300">Copy link</span>
                    )}
                  </button>
                </div>
                {!secret.viewed && !isExpired(secret.expires_at) && <a href={getSecretUrl(secret.secret_code)} className="mb-2 block text-sm text-slate-400">Preview my secret</a>}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {secret.viewed ? 'Viewed' : 'Not viewed'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {isExpired(secret.expires_at) ? 'Expired' : `Expires ${new Date(secret.expires_at).toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {secrets.length === 0 && (
        <p className="text-slate-400 text-center py-8">No secrets yet. Create one to get started!</p>
      )}
    </div>
  );
}
