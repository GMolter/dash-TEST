import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MemoryQuickPasteRepository,
  TEST_USER_ID,
  testQuickPaste,
} from '../../test/quickPasteMemoryRepository';
import { useQuickPastes } from './useQuickPastes';

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: { id: TEST_USER_ID } }),
}));

describe('useQuickPastes integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps stable order through create, update, duplicate, favorite, reorder, refresh, and delete', async () => {
    const repository = new MemoryQuickPasteRepository([
      testQuickPaste(),
      testQuickPaste({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
        title: 'Beta',
        content: 'Example content B',
        sort_order: 1,
      }),
    ]);
    const { result } = renderHook(() => useQuickPastes(repository));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.createItem({ title: 'Gamma', content: 'Example content C' }));
    expect(result.current.items.map((item) => item.title)).toEqual(['Alpha', 'Beta', 'Gamma']);

    await act(() => result.current.updateItem(result.current.items[1].id, {
      title: 'Beta revised',
      content: 'Example content B revised',
      category: 'Updates',
    }));
    expect(result.current.items.map((item) => item.title)).toEqual(['Alpha', 'Beta revised', 'Gamma']);

    await act(() => result.current.duplicateItem(result.current.items[0].id));
    expect(result.current.items.map((item) => item.title)).toEqual(['Alpha', 'Beta revised', 'Gamma', 'Alpha copy']);

    await act(() => result.current.toggleFavorite(result.current.items[0].id));
    expect(result.current.items[0].is_favorite).toBe(true);

    await act(() => result.current.moveItem(result.current.items[3].id, 'up'));
    expect(result.current.items.map((item) => item.title)).toEqual(['Alpha', 'Beta revised', 'Alpha copy', 'Gamma']);

    await act(() => result.current.reload());
    expect(result.current.items.map((item) => item.title)).toEqual(['Alpha', 'Beta revised', 'Alpha copy', 'Gamma']);

    await act(() => result.current.deleteItem(result.current.items[1].id));
    expect(result.current.items.map((item) => item.title)).toEqual(['Alpha', 'Alpha copy', 'Gamma']);

    await act(() => result.current.reload());
    expect(result.current.items.map((item) => item.title)).toEqual(['Alpha', 'Alpha copy', 'Gamma']);
  });

  it('preserves data and offers a recoverable content-free failure', async () => {
    const repository = new MemoryQuickPasteRepository([testQuickPaste()]);
    const { result } = renderHook(() => useQuickPastes(repository));
    await waitFor(() => expect(result.current.loading).toBe(false));
    repository.failNext('update');

    await act(() => result.current.updateItem(result.current.items[0].id, {
      title: 'Changed',
      content: 'Example changed content',
    }));

    expect(result.current.items[0].title).toBe('Alpha');
    expect(result.current.error).toBe("We couldn't save those changes. Your other Quick Pastes are unchanged. Try again.");
    await act(() => result.current.reload());
    expect(result.current.error).toBeNull();
    expect(result.current.items[0].title).toBe('Alpha');
  });
});
