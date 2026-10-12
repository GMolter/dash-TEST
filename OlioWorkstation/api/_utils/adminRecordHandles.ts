import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
function key() {
  const secret = process.env.ADMIN_OPERATION_SECRET || process.env.ADMIN_COOKIE_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error('Admin operation signing is not configured.');
  return createHash('sha256').update('admin-record-handle:' + secret).digest();
}
// A record still needs an operation handle when its primary-key field is Hidden.
// Encrypt rather than returning that hidden value in _admin_id.
export function privateRecordHandle(id: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(id, 'utf8'), cipher.final()]);
  return 'opaque.' + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function resolveRecordHandle(id: string) {
  if (!id.startsWith('opaque.')) return id;
  try {
    const value = Buffer.from(id.slice(7), 'base64url');
    if (value.length < 29) throw new Error('INVALID_RECORD_HANDLE');
    const decipher = createDecipheriv('aes-256-gcm', key(), value.subarray(0, 12), { authTagLength: 16 });
    decipher.setAuthTag(value.subarray(12, 28));
    return Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]).toString('utf8');
  } catch { throw new Error('INVALID_RECORD_HANDLE'); }
}
