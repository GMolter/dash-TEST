import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import type { LauncherDevice } from '../features/launcherDevices/model';
import {
  launcherDeviceRepository,
  type LauncherDeviceRepository,
} from '../features/launcherDevices/repository';

export function useLauncherDevices(repository: LauncherDeviceRepository = launcherDeviceRepository) {
  const { user } = useAuth();
  const [devices, setDevices] = useState<LauncherDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user?.id) {
      setDevices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setDevices(await repository.list());
    } catch {
      setError("We couldn't load your launcher devices. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [repository, user?.id]);

  useEffect(() => { void reload(); }, [reload]);

  const revoke = async (id: string) => {
    if (!user?.id || busyId) return false;
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      await repository.revoke(id);
      setDevices((current) => current.map((device) => device.id === id
        ? { ...device, status: 'revoked', revoked_at: new Date().toISOString() }
        : device));
      setSuccess('Launcher access revoked.');
      return true;
    } catch {
      setError("We couldn't revoke that launcher. Nothing changed; try again.");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  return { devices, loading, busyId, error, success, reload, revoke };
}

