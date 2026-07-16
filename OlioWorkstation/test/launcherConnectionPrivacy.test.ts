import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const browserFiles = [
  'src/pages/LauncherAuthorization.tsx',
  'src/components/LauncherDevices.tsx',
  'src/features/launcherDevices/repository.ts',
  'src/hooks/useLauncherDevices.ts',
];

describe('launcher connection privacy boundaries', () => {
  it('keeps service credentials and device secrets out of browser code and persistence', () => {
    const source = browserFiles.map((file) => readFileSync(join(root, file), 'utf8')).join('\n');
    expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(source).not.toContain('credential_hash');
    expect(source).not.toContain('pairing_secret');
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|caches\.open/);
  });

  it('does not add Quick Paste synchronization to the device protocol', () => {
    const migration = readFileSync(join(root, 'supabase/migrations/20260715190000_secure_launcher_connection.sql'), 'utf8');
    const endpoint = readFileSync(join(root, 'api/launcher.ts'), 'utf8');
    expect(endpoint).not.toMatch(/quick[_ -]?paste/i);
    expect(migration).not.toMatch(/from public\.quick_pastes|join public\.quick_pastes|grant .*quick_pastes/i);
    expect(migration).toContain("array['connection:status']");
  });
});
