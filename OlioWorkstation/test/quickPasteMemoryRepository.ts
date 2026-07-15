import type { QuickPaste, QuickPasteInput } from '../src/features/quickPastes/model';
import { normalizeQuickPasteInput, sortQuickPastes } from '../src/features/quickPastes/model';
import type { QuickPasteRepository } from '../src/features/quickPastes/repository';

export const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';

export function testQuickPaste(overrides: Partial<QuickPaste> = {}): QuickPaste {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    user_id: TEST_USER_ID,
    title: 'Alpha',
    content: 'Example content A',
    category: 'General',
    sort_order: 0,
    is_favorite: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

type Operation = 'list' | 'create' | 'update' | 'remove' | 'favorite' | 'reorder';

export class MemoryQuickPasteRepository implements QuickPasteRepository {
  rows: QuickPaste[];
  private nextFailure: Operation | null = null;
  private nextId = 10;

  constructor(rows: QuickPaste[] = []) {
    this.rows = sortQuickPastes(rows);
  }

  failNext(operation: Operation) {
    this.nextFailure = operation;
  }

  private maybeFail(operation: Operation) {
    if (this.nextFailure !== operation) return;
    this.nextFailure = null;
    throw new Error('Synthetic repository failure.');
  }

  async list(userId: string) {
    this.maybeFail('list');
    return sortQuickPastes(this.rows.filter((row) => row.user_id === userId).map((row) => ({ ...row })));
  }

  async create(userId: string, input: QuickPasteInput, sortOrder: number) {
    this.maybeFail('create');
    const normalized = normalizeQuickPasteInput(input);
    const timestamp = `2026-01-01T00:00:${String(this.nextId).padStart(2, '0')}.000Z`;
    const created = testQuickPaste({
      id: `00000000-0000-4000-8000-${String(this.nextId).padStart(12, '0')}`,
      user_id: userId,
      title: normalized.title,
      content: normalized.content,
      category: normalized.category || null,
      sort_order: sortOrder,
      created_at: timestamp,
      updated_at: timestamp,
    });
    this.nextId += 1;
    this.rows = sortQuickPastes([...this.rows, created]);
    return { ...created };
  }

  async update(userId: string, id: string, input: QuickPasteInput) {
    this.maybeFail('update');
    const index = this.rows.findIndex((row) => row.id === id && row.user_id === userId);
    if (index < 0) throw new Error('Not found.');
    const normalized = normalizeQuickPasteInput(input);
    const updated = {
      ...this.rows[index],
      title: normalized.title,
      content: normalized.content,
      category: normalized.category || null,
      updated_at: '2026-01-02T00:00:00.000Z',
    };
    this.rows[index] = updated;
    return { ...updated };
  }

  async remove(userId: string, id: string) {
    this.maybeFail('remove');
    const index = this.rows.findIndex((row) => row.id === id && row.user_id === userId);
    if (index < 0) throw new Error('Not found.');
    this.rows.splice(index, 1);
  }

  async setFavorite(userId: string, id: string, isFavorite: boolean) {
    this.maybeFail('favorite');
    const row = this.rows.find((candidate) => candidate.id === id && candidate.user_id === userId);
    if (!row) throw new Error('Not found.');
    row.is_favorite = isFavorite;
    row.updated_at = '2026-01-02T00:00:00.000Z';
    return { ...row };
  }

  async reorder(orderedIds: string[]) {
    this.maybeFail('reorder');
    const existingIds = this.rows.map((row) => row.id).sort();
    if (new Set(orderedIds).size !== orderedIds.length || [...orderedIds].sort().join() !== existingIds.join()) {
      throw new Error('Incomplete order.');
    }
    const positions = new Map(orderedIds.map((id, index) => [id, index]));
    this.rows = this.rows.map((row) => ({ ...row, sort_order: positions.get(row.id) ?? row.sort_order }));
    this.rows = sortQuickPastes(this.rows);
  }
}
