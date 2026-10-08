import { Clipboard, Grid2X2, QrCode } from 'lucide-react';

export function formattedUrl(value: string) {
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export const SHORTCUTS = {
  qr: { label: 'QR Generator', icon: QrCode },
  'quick-pastes': { label: 'Quick Pastes', icon: Clipboard },
  utilities: { label: 'All Utilities', icon: Grid2X2 },
} as const;

