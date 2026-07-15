import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import {
  duplicateQuickPasteTitle,
  isQuickPasteInputValid,
  moveQuickPaste,
  normalizeQuickPasteOrder,
  QuickPaste,
  QuickPasteInput,
  sortQuickPastes,
} from '../features/quickPastes/model';
import {
  quickPasteRepository,
  QuickPasteRepository,
} from '../features/quickPastes/repository';

type SuccessMessage = 'Quick Paste created.' | 'Quick Paste updated.' | 'Quick Paste duplicated.' |
  'Quick Paste deleted.' | 'Favorite updated.' | 'Order updated.';

function operationErrorMessage(action: string) {
  return `We couldn't ${action}. Your other Quick Pastes are unchanged. Try again.`;
}

export function useQuickPastes(repository: QuickPasteRepository = quickPasteRepository) {
  const { user } = useAuth();
  const [items, setItems] = useState<QuickPaste[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessMessage | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setItems(await repository.list(user.id));
    } catch {
      setError('We couldn\'t load your Quick Pastes. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [repository, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const runMutation = async (
    action: string,
    message: SuccessMessage,
    mutation: (userId: string) => Promise<void>,
  ) => {
    if (!user?.id || busy) return false;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await mutation(user.id);
      setSuccess(message);
      return true;
    } catch {
      setError(operationErrorMessage(action));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createItem = (input: QuickPasteInput) => {
    if (!isQuickPasteInputValid(input)) return Promise.resolve(false);
    return runMutation('create that Quick Paste', 'Quick Paste created.', async (userId) => {
      const nextOrder = items.reduce((maximum, item) => Math.max(maximum, item.sort_order), -1) + 1;
      const created = await repository.create(userId, input, nextOrder);
      setItems((current) => sortQuickPastes([...current, created]));
    });
  };

  const updateItem = (id: string, input: QuickPasteInput) => {
    if (!isQuickPasteInputValid(input)) return Promise.resolve(false);
    return runMutation('save those changes', 'Quick Paste updated.', async (userId) => {
      const updated = await repository.update(userId, id, input);
      setItems((current) => sortQuickPastes(current.map((item) => item.id === id ? updated : item)));
    });
  };

  const deleteItem = (id: string) => runMutation(
    'delete that Quick Paste',
    'Quick Paste deleted.',
    async (userId) => {
      await repository.remove(userId, id);
      setItems((current) => current.filter((item) => item.id !== id));
    },
  );

  const duplicateItem = (id: string) => runMutation(
    'duplicate that Quick Paste',
    'Quick Paste duplicated.',
    async (userId) => {
      const source = items.find((item) => item.id === id && item.user_id === userId);
      if (!source) throw new Error('Unavailable Quick Paste.');
      const nextOrder = items.reduce((maximum, item) => Math.max(maximum, item.sort_order), -1) + 1;
      const created = await repository.create(userId, {
        title: duplicateQuickPasteTitle(source.title),
        content: source.content,
        category: source.category,
      }, nextOrder);
      setItems((current) => sortQuickPastes([...current, created]));
    },
  );

  const toggleFavorite = (id: string) => runMutation(
    'update that favorite',
    'Favorite updated.',
    async (userId) => {
      const source = items.find((item) => item.id === id && item.user_id === userId);
      if (!source) throw new Error('Unavailable Quick Paste.');
      const updated = await repository.setFavorite(userId, id, !source.is_favorite);
      setItems((current) => sortQuickPastes(current.map((item) => item.id === id ? updated : item)));
    },
  );

  const moveItem = (id: string, direction: 'up' | 'down') => runMutation(
    'reorder your Quick Pastes',
    'Order updated.',
    async () => {
      const reordered = normalizeQuickPasteOrder(moveQuickPaste(items, id, direction));
      if (reordered.every((item, index) => item.id === sortQuickPastes(items)[index]?.id)) return;
      await repository.reorder(reordered.map((item) => item.id));
      setItems(reordered);
    },
  );

  return {
    items: sortQuickPastes(items),
    loading,
    busy,
    error,
    success,
    reload: load,
    clearNotice: () => {
      setError(null);
      setSuccess(null);
    },
    createItem,
    updateItem,
    deleteItem,
    duplicateItem,
    toggleFavorite,
    moveItem,
  };
}
