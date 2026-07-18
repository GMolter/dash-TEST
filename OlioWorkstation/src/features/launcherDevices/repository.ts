import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type { LauncherDevice } from './model';

export interface LauncherDeviceRepository {
  list(): Promise<LauncherDevice[]>;
  revoke(id: string): Promise<void>;
}

export class LauncherDeviceDataError extends Error {
  readonly kind: 'setup' | 'operation';

  constructor(kind: 'setup' | 'operation' = 'operation') {
    super('Launcher device operation failed.');
    this.name = 'LauncherDeviceDataError';
    this.kind = kind;
  }
}

function dataError(error: { code?: string } | null) {
  return new LauncherDeviceDataError(error?.code === 'PGRST202' ? 'setup' : 'operation');
}

export function createLauncherDeviceRepository(client: SupabaseClient): LauncherDeviceRepository {
  return {
    async list() {
      const { data, error } = await client.rpc('list_launcher_devices');
      if (error) throw dataError(error);
      return ((Array.isArray(data) ? data : []) as LauncherDevice[])
        .filter((device) => device.revoked_at === null && device.status !== 'revoked');
    },
    async revoke(id) {
      const { data, error } = await client.rpc('revoke_launcher_device', { p_device_id: id });
      if (error) throw dataError(error);
      if (data !== true) throw new LauncherDeviceDataError();
    },
  };
}

export const launcherDeviceRepository = createLauncherDeviceRepository(supabase);
