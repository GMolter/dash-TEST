export type LauncherDeviceStatus = 'connected' | 'revoked';

export type LauncherDevice = {
  id: string;
  device_identifier: string;
  device_name: string;
  connected_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  status: LauncherDeviceStatus;
};

