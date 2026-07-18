import { describe, expect, it } from 'vitest';
import {
  formatDisplayCode,
  deviceActor,
  generateDisplayCode,
  generateRequestId,
  generateSecret,
  isSecret,
  isUuid,
  normalizeDeviceName,
  normalizeDisplayCode,
  safeState,
  sha256,
} from './launcherProtocol.js';

describe('launcher authorization protocol primitives', () => {
  it('generates independent 256-bit secrets and valid opaque request identifiers', () => {
    const generated = new Set(Array.from({ length: 128 }, () => generateSecret()));
    expect(generated.size).toBe(128);
    for (const secret of generated) expect(isSecret(secret)).toBe(true);
    expect(isUuid(generateRequestId())).toBe(true);
  });

  it('generates short unambiguous display codes without making them credentials', () => {
    const codes = new Set(Array.from({ length: 128 }, () => generateDisplayCode()));
    expect(codes.size).toBe(128);
    for (const code of codes) {
      expect(normalizeDisplayCode(formatDisplayCode(code))).toBe(code);
      expect(isSecret(code)).toBe(false);
    }
  });

  it('normalizes safe names and rejects hostile or malformed input', () => {
    expect(normalizeDeviceName('  Office   Laptop Launcher ')).toBe('Office Laptop Launcher');
    expect(normalizeDeviceName('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>');
    expect(normalizeDeviceName('bad\nname')).toBeNull();
    expect(normalizeDeviceName('x'.repeat(81))).toBeNull();
    expect(normalizeDisplayCode('OOOOO-OOOOO')).toBeNull();
  });

  it('hashes secrets deterministically and emits only allowlisted states', () => {
    const secret = 'a'.repeat(64);
    expect(sha256(secret)).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256(secret)).not.toBe(secret);
    expect(safeState('connected')).toBe('connected');
    expect(safeState('scope_required')).toBe('scope_required');
    expect(safeState('owner@example.invalid')).toBe('invalid');
    expect(deviceActor('device-a', 'quick-pastes', secret))
      .toMatch(/^\\x[0-9a-f]{64}$/);
  });
});
