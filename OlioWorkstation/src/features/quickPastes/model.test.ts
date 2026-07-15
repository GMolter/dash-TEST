import { describe, expect, it } from 'vitest';
import {
  duplicateQuickPasteTitle,
  filterQuickPastes,
  moveQuickPaste,
  normalizeQuickPasteInput,
  normalizeQuickPasteOrder,
  QUICK_PASTE_LIMITS,
  QuickPaste,
  quickPasteCategories,
  sortQuickPastes,
  validateQuickPasteInput,
} from './model';

function paste(overrides: Partial<QuickPaste> = {}): QuickPaste {
  return {
    id: 'a',
    user_id: 'user-a',
    title: 'Alpha',
    content: 'Example content',
    category: 'General',
    sort_order: 0,
    is_favorite: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Quick Paste model', () => {
  it('requires a trimmed title and non-empty content', () => {
    expect(validateQuickPasteInput({ title: '  ', content: '\n\t' })).toEqual({
      title: 'Enter a title.',
      content: 'Enter some content.',
    });
  });

  it('enforces documented Unicode-aware length limits', () => {
    const errors = validateQuickPasteInput({
      title: '😀'.repeat(QUICK_PASTE_LIMITS.title + 1),
      content: 'x'.repeat(QUICK_PASTE_LIMITS.content + 1),
      category: 'c'.repeat(QUICK_PASTE_LIMITS.category + 1),
    });
    expect(Object.keys(errors).sort()).toEqual(['category', 'content', 'title']);
  });

  it('trims labels while preserving content exactly', () => {
    expect(normalizeQuickPasteInput({
      title: '  Alpha  ',
      content: '  keep spacing\n',
      category: '  General  ',
    })).toEqual({ title: 'Alpha', content: '  keep spacing\n', category: 'General' });
  });

  it('uses deterministic stable ordering for tied sort values', () => {
    const items = [
      paste({ id: 'b', sort_order: 2, created_at: '2026-01-02T00:00:00.000Z' }),
      paste({ id: 'c', sort_order: 0 }),
      paste({ id: 'a', sort_order: 2, created_at: '2026-01-02T00:00:00.000Z' }),
    ];
    expect(sortQuickPastes(items).map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  it('moves and normalizes the complete collection without dropping rows', () => {
    const items = [
      paste({ id: 'a', sort_order: 10 }),
      paste({ id: 'b', sort_order: 20 }),
      paste({ id: 'c', sort_order: 30 }),
    ];
    const moved = moveQuickPaste(items, 'b', 'up');
    expect(moved.map((item) => item.id)).toEqual(['b', 'a', 'c']);
    expect(normalizeQuickPasteOrder(moved).map((item) => item.sort_order)).toEqual([0, 1, 2]);
  });

  it('keeps boundary moves unchanged', () => {
    const items = [paste({ id: 'a' }), paste({ id: 'b', sort_order: 1 })];
    expect(moveQuickPaste(items, 'a', 'up').map((item) => item.id)).toEqual(['a', 'b']);
    expect(moveQuickPaste(items, 'b', 'down').map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('searches owner-loaded title, content, and category values and filters categories', () => {
    const items = [
      paste({ id: 'a', title: 'Greeting', content: 'Hello', category: 'Support' }),
      paste({ id: 'b', title: 'Closing', content: 'Goodbye', category: 'Sales', sort_order: 1 }),
    ];
    expect(filterQuickPastes(items, 'hello', '').map((item) => item.id)).toEqual(['a']);
    expect(filterQuickPastes(items, 'closing', 'Sales').map((item) => item.id)).toEqual(['b']);
    expect(filterQuickPastes(items, '', 'Support').map((item) => item.id)).toEqual(['a']);
  });

  it('returns unique sorted categories', () => {
    expect(quickPasteCategories([
      paste({ category: 'Zulu' }),
      paste({ id: 'b', category: null }),
      paste({ id: 'c', category: 'alpha' }),
      paste({ id: 'd', category: 'Zulu' }),
    ])).toEqual(['alpha', 'Zulu']);
  });

  it('creates a bounded duplicate title', () => {
    const title = 'x'.repeat(QUICK_PASTE_LIMITS.title);
    expect(Array.from(duplicateQuickPasteTitle(title))).toHaveLength(QUICK_PASTE_LIMITS.title);
    expect(duplicateQuickPasteTitle(title)).toMatch(/ copy$/);
    expect(duplicateQuickPasteTitle('Alpha')).toBe('Alpha copy');
  });
});
