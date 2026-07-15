import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createQuickPasteRepository, QuickPasteDataError } from './repository';
import type { QuickPaste } from './model';

function row(overrides: Partial<QuickPaste> = {}): QuickPaste {
  return {
    id: 'row-a',
    user_id: 'user-a',
    title: 'Alpha',
    content: 'Example content',
    category: null,
    sort_order: 0,
    is_favorite: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

type MockResult = { data: unknown; error: unknown };
type MockBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: PromiseLike<MockResult>['then'];
};

function builder(result: MockResult) {
  const resolved = Promise.resolve(result);
  const chain: MockBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: resolved.then.bind(resolved),
  };
  for (const method of ['select', 'eq', 'order', 'insert', 'update', 'delete'] as const) {
    chain[method].mockReturnValue(chain);
  }
  return chain;
}

function clientWith(chain: ReturnType<typeof builder>, rpcResult = { error: null }) {
  return {
    from: vi.fn(() => chain),
    rpc: vi.fn(async () => rpcResult),
  } as unknown as SupabaseClient;
}

describe('Quick Paste repository', () => {
  it('scopes list queries to the authenticated user and deterministic order', async () => {
    const chain = builder({ data: [row({ id: 'b', sort_order: 1 }), row({ id: 'a' })], error: null });
    const client = clientWith(chain);
    const repository = createQuickPasteRepository(client);

    expect((await repository.list('user-a')).map((item) => item.id)).toEqual(['a', 'b']);
    expect(client.from).toHaveBeenCalledWith('quick_pastes');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-a');
    expect(chain.order).toHaveBeenNthCalledWith(1, 'sort_order', { ascending: true });
  });

  it('creates only an owned private data row with normalized labels', async () => {
    const chain = builder({ data: row(), error: null });
    const repository = createQuickPasteRepository(clientWith(chain));
    await repository.create('user-a', { title: ' Alpha ', content: ' x ', category: ' General ' }, 4);

    expect(chain.insert).toHaveBeenCalledWith({
      user_id: 'user-a',
      title: 'Alpha',
      content: ' x ',
      category: 'General',
      sort_order: 4,
      is_favorite: false,
    });
  });

  it('defensively scopes update, favorite, and delete operations by owner', async () => {
    const updateChain = builder({ data: row(), error: null });
    const favoriteChain = builder({ data: row({ is_favorite: true }), error: null });
    const deleteChain = builder({ data: { id: 'row-a' }, error: null });
    const client = {
      from: vi.fn()
        .mockReturnValueOnce(updateChain)
        .mockReturnValueOnce(favoriteChain)
        .mockReturnValueOnce(deleteChain),
      rpc: vi.fn(),
    } as unknown as SupabaseClient;
    const repository = createQuickPasteRepository(client);

    await repository.update('user-a', 'row-a', { title: 'Alpha', content: 'x' });
    await repository.setFavorite('user-a', 'row-a', true);
    await repository.remove('user-a', 'row-a');

    for (const chain of [updateChain, favoriteChain, deleteChain]) {
      expect(chain.eq).toHaveBeenCalledWith('id', 'row-a');
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-a');
    }
    expect(updateChain.update).not.toHaveBeenCalledWith(expect.objectContaining({ user_id: expect.anything() }));
  });

  it('uses the authenticated atomic reorder RPC', async () => {
    const chain = builder({ data: null, error: null });
    const client = clientWith(chain);
    const repository = createQuickPasteRepository(client);
    await repository.reorder(['a', 'b']);
    expect(client.rpc).toHaveBeenCalledWith('reorder_quick_pastes', { ordered_ids: ['a', 'b'] });
  });

  it('returns a content-free error without exposing backend details', async () => {
    const chain = builder({ data: null, error: { message: 'backend detail marker' } });
    const repository = createQuickPasteRepository(clientWith(chain));
    await expect(repository.list('user-a')).rejects.toEqual(new QuickPasteDataError());
    await expect(repository.list('user-a')).rejects.not.toThrow('backend detail marker');
  });
});
