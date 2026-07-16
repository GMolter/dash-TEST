import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type { LauncherDevice } from './model';

export interface LauncherDeviceRepository {
  list(): Promise<LauncherDevice[]>;
  revoke(id: string): Promise<void>;
}

export class LauncherDeviceDataError extends Error {
  constructor() {
    super('Launcher device operation failed.');
    this.name = 'LauncherDeviceDataError';
  }
}

export function createLauncherDeviceRepository(client: SupabaseClient): LauncherDeviceRepository {
  return {
    async list() {
      const { data, error } = await client.rpc('list_launcher_devices');
      if (error) throw new LauncherDeviceDataError();
      return (Array.isArray(data) ? data : []) as LauncherDevice[];
    },
    async revoke(id) {
      const { data, error } = await client.rpc('revoke_launcher_device', { p_device_id: id });
      if (error || data !== true) throw new LauncherDeviceDataError();
    },
  };
}

export const launcherDeviceRepository = createLauncherDeviceRepository(supabase);

