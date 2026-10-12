import { useAdminAccess } from './AdminAccessBoundary';

// The server remains authoritative. Use its effective snapshot to keep the shared
// admin pages from offering unavailable actions or fetching inaccessible data.
export function useAdminCapabilities() {
  const access = useAdminAccess();
  const can = (key: string) => !access || access.appOwner || access.permissions.includes(key);
  return { access, can, all: (...keys: string[]) => keys.every(can) };
}
