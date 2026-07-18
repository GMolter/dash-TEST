import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const launcherClient = readFileSync(join(root, '..', 'OlioLauncher', 'src', 'QuickPastesClient.ahk'), 'utf8');
const launcherWindow = readFileSync(join(root, '..', 'OlioLauncher', 'src', 'LauncherWindow.ahk'), 'utf8');
const endpoint = readFileSync(join(root, 'api', 'launcher.ts'), 'utf8');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '20260717090000_add_launcher_quick_paste_read_scope.sql'),
  'utf8',
);

describe('launcher Quick Paste privacy boundaries', () => {
  it('keeps synchronized content memory-only and out of diagnostics', () => {
    expect(launcherClient).not.toMatch(
      /FileAppend|FileOpen|FileWrite|FileMove|FileCopy|DirCreate|RedactedLogger|settings\.json|offline.?cache/i,
    );
    expect(launcherClient).not.toMatch(/user_id|owner_id|email/i);
    expect(launcherWindow).toContain('this.ClipboardManager.PublishText');
    expect(launcherWindow).not.toMatch(/__quick_(?:create|edit|delete|reorder|favorite)/i);
  });

  it('keeps secrets and content out of server logs and client bundles', () => {
    expect(endpoint).not.toMatch(/console\.(?:log|error|warn)|JSON\.stringify\(req|authorization.*log/i);
    expect(launcherClient).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(launcherWindow).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(endpoint).not.toMatch(/body\.(?:user_id|owner_id|email)/);
  });

  it('uses a fixed-search-path service-only RPC without direct device table access', () => {
    expect(migration).toMatch(
      /function public\.fetch_launcher_quick_pastes[\s\S]*security definer[\s\S]*set search_path = ''/i,
    );
    expect(migration).toMatch(
      /revoke all on function public\.fetch_launcher_quick_pastes[\s\S]*from public, anon, authenticated/i,
    );
    expect(migration).toMatch(
      /grant execute on function public\.fetch_launcher_quick_pastes[\s\S]*to service_role/i,
    );
    expect(migration).not.toMatch(/grant .* on (?:table )?public\.quick_pastes to (?:anon|service_role)/i);
    expect(migration).toContain('quick_paste.user_id = device_row.owner_id');
  });
});
