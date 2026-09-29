export const PHOTO_BUCKET = 'dashboard-backgrounds';
export const PHOTO_CHANGED = 'olio-dashboard-photo-changed';
export const PHOTO_CACHE_SIGNAL = 'olio-dashboard-photo-revision:';
export type CachedPhoto = { userId: string; blob: Blob | null; savedAt: number };

// Cache image bytes across tabs, rather than storing expiring signed URLs.
async function photoDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('olio-dashboard-photos', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'userId' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Photo cache unavailable'));
  });
}
export async function readCachedPhoto(userId: string): Promise<CachedPhoto | null> {
  try {
    const db = await photoDatabase();
    try {
      return await new Promise<CachedPhoto | null>((resolve, reject) => {
        const request = db.transaction('photos').objectStore('photos').get(userId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  } catch { return null; }
}
export async function cachePhoto(userId: string, blob: Blob | null) {
  const photo: CachedPhoto = { userId, blob, savedAt: Date.now() };
  try {
    const db = await photoDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('photos', 'readwrite');
        transaction.objectStore('photos').put(photo);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } finally { db.close(); }
  } catch { /* Cache failures must not prevent saving to the account. */ }
  return photo;
}
export async function publishPhoto(userId: string, blob: Blob | null) {
  const photo = await cachePhoto(userId, blob);
  window.dispatchEvent(new CustomEvent(PHOTO_CHANGED, { detail: photo }));
  try { localStorage.setItem(PHOTO_CACHE_SIGNAL + userId, crypto.randomUUID()); } catch { /* Optional cross-tab signal. */ }
}
export function photoCrop(width: number, height: number, ratio: number, zoom: number, x: number, y: number) {
  const cropWidth = Math.min(width, height * ratio) / Math.max(1, zoom);
  const cropHeight = cropWidth / ratio;
  return { x: (width - cropWidth) * Math.max(0, Math.min(100, x)) / 100, y: (height - cropHeight) * Math.max(0, Math.min(100, y)) / 100, width: cropWidth, height: cropHeight };
}
