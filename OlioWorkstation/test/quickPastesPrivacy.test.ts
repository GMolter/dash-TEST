import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const quickPasteSources = [
  'src/components/QuickPastes.tsx',
  'src/features/quickPastes/model.ts',
  'src/features/quickPastes/repository.ts',
  'src/hooks/useQuickPastes.ts',
].map((file) => readFileSync(resolve(root, file), 'utf8')).join('\n');
const pastebinSource = readFileSync(resolve(root, 'src/components/Pastebin.tsx'), 'utf8');

describe('Quick Paste privacy and separation contracts', () => {
  it('does not persist, cache, log, report, navigate with, or externally send snippet data', () => {
    for (const forbidden of [
      'localStorage',
      'sessionStorage',
      'indexedDB',
      'caches.',
      'console.log',
      'console.error',
      'console.warn',
      'fetch(',
      'window.location',
      'navigator.sendBeacon',
    ]) {
      expect(quickPasteSources).not.toContain(forbidden);
    }
  });

  it('contains no client-side service-role key reference', () => {
    expect(quickPasteSources).not.toMatch(/service[_-]?role/i);
    expect(quickPasteSources).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('keeps Pastebin on its unchanged table and share route', () => {
    expect(pastebinSource).toContain(".from('pastes')");
    expect(pastebinSource).toContain('/p/');
    expect(pastebinSource).not.toContain('quick_pastes');
    expect(quickPasteSources).toContain(".from('quick_pastes')");
    expect(quickPasteSources).not.toMatch(/paste_code|expires_at|\bviews\b|scope_public/);
  });

  it('does not introduce launcher, pairing, synchronization, offline, phone, or analyzer behavior', () => {
    expect(quickPasteSources).not.toMatch(/pairing|device approval|credential|polling|offline cache|send to phone|network analyzer/i);
  });
});
