import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

export interface DashboardTodo {
  id: string;
  user_id: string;
  title: string;
  note: string | null;
  completed: boolean;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const DASHBOARD_TODO_CACHE_PREFIX = 'dashboard-todos';

function nowIso() {
  return new Date().toISOString();
}

function createTempId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `todo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sortTodos(todos: DashboardTodo[]) {
  return [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);

    if (!a.completed && !b.completed) {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }

    const completedA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
    const completedB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
    if (completedA !== completedB) return completedB - completedA;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

function normalizeTodos(todos: DashboardTodo[]) {
  const active = todos
    .filter((todo) => !todo.completed)
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })
    .map((todo, index) => ({ ...todo, sort_order: index }));

  const completed = todos
    .filter((todo) => todo.completed)
    .sort((a, b) => {
      const completedA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const completedB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      if (completedA !== completedB) return completedB - completedA;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  return [...active, ...completed];
}

function readCache(cacheKey: string) {
  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardTodo[];
    return normalizeTodos(parsed);
  } catch {
    return null;
  }
}

function writeCache(cacheKey: string, todos: DashboardTodo[]) {
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(todos));
  } catch {
    // Ignore cache failures.
  }
}

function clearCache(cacheKey: string) {
  try {
    window.localStorage.removeItem(cacheKey);
  } catch {
    // Ignore cache failures.
  }
}

export function useDashboardTodos() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<DashboardTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = useMemo(() => {
    if (!user?.id) return null;
    return `${DASHBOARD_TODO_CACHE_PREFIX}:${user.id}`;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !cacheKey) {
      setTodos([]);
      setLoading(false);
      setError(null);
      return;
    }

    const userId = user.id;
    let cancelled = false;

    const cached = typeof window !== 'undefined' ? readCache(cacheKey) : null;
    if (cached) {
      setTodos(cached);
      setLoading(false);
    } else {
      setTodos([]);
      setLoading(true);
    }

    async function loadTodos() {
      try {
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('dashboard_todos')
          .select('*')
          .eq('user_id', userId);

        if (fetchError) throw fetchError;
        if (cancelled) return;

        const normalized = normalizeTodos((data ?? []) as DashboardTodo[]);
        setTodos(normalized);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
        setLoading(false);
      }
    }

    void loadTodos();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, user?.id]);

  useEffect(() => {
    if (!cacheKey || typeof window === 'undefined') return;
    writeCache(cacheKey, todos);
  }, [cacheKey, todos]);

  const persistBatch = async (nextTodos: DashboardTodo[]) => {
    const payload = nextTodos.map((todo) => ({
      id: todo.id,
      user_id: todo.user_id,
      title: todo.title,
      note: todo.note,
      completed: todo.completed,
      sort_order: todo.sort_order,
      completed_at: todo.completed_at,
      created_at: todo.created_at,
      updated_at: todo.updated_at,
    }));

    const { error: upsertError } = await supabase.from('dashboard_todos').upsert(payload);
    if (upsertError) throw upsertError;
  };

  const addTodo = async (title: string, note?: string) => {
    if (!user?.id) return false;

    const trimmedTitle = title.trim();
    const trimmedNote = note?.trim() || null;
    if (!trimmedTitle) return false;

    const timestamp = nowIso();
    const optimisticTodo: DashboardTodo = {
      id: createTempId(),
      user_id: user.id,
      title: trimmedTitle,
      note: trimmedNote,
      completed: false,
      sort_order: todos.filter((todo) => !todo.completed).length,
      completed_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    };

    const previousTodos = todos;
    const nextTodos = normalizeTodos([...previousTodos, optimisticTodo]);
    setTodos(nextTodos);
    setSyncing(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('dashboard_todos')
        .insert({
          user_id: user.id,
          title: trimmedTitle,
          note: trimmedNote,
          completed: false,
          sort_order: optimisticTodo.sort_order,
          completed_at: null,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      const persistedTodo = data as DashboardTodo;
      setTodos((current) =>
        normalizeTodos([
          ...current.filter((todo) => todo.id !== optimisticTodo.id),
          persistedTodo,
        ]),
      );
      return true;
    } catch (err) {
      setTodos(previousTodos);
      setError(err instanceof Error ? err.message : 'Failed to add task');
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const saveTodo = async (id: string, updates: { title: string; note?: string | null }) => {
    const currentTodo = todos.find((todo) => todo.id === id);
    if (!currentTodo) return false;

    const trimmedTitle = updates.title.trim();
    if (!trimmedTitle) return false;

    const nextTodo: DashboardTodo = {
      ...currentTodo,
      title: trimmedTitle,
      note: updates.note?.trim() || null,
      updated_at: nowIso(),
    };

    const previousTodos = todos;
    const nextTodos = sortTodos(previousTodos.map((todo) => (todo.id === id ? nextTodo : todo)));
    setTodos(nextTodos);
    setSyncing(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('dashboard_todos')
        .update({
          title: nextTodo.title,
          note: nextTodo.note,
          updated_at: nextTodo.updated_at,
        })
        .eq('id', id)
        .eq('user_id', currentTodo.user_id);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      setTodos(previousTodos);
      setError(err instanceof Error ? err.message : 'Failed to update task');
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const toggleTodo = async (id: string) => {
    const currentTodo = todos.find((todo) => todo.id === id);
    if (!currentTodo) return false;

    const timestamp = nowIso();
    const previousTodos = todos;
    const activeWithoutCurrent = previousTodos.filter((todo) => !todo.completed && todo.id !== id);
    const nextTodos = normalizeTodos(
      previousTodos.map((todo) => {
        if (todo.id !== id) return todo;

        if (todo.completed) {
          return {
            ...todo,
            completed: false,
            completed_at: null,
            sort_order: activeWithoutCurrent.length,
            updated_at: timestamp,
          };
        }

        return {
          ...todo,
          completed: true,
          completed_at: timestamp,
          updated_at: timestamp,
        };
      }),
    );

    setTodos(nextTodos);
    setSyncing(true);
    setError(null);

    try {
      await persistBatch(nextTodos);
      return true;
    } catch (err) {
      setTodos(previousTodos);
      setError(err instanceof Error ? err.message : 'Failed to update task');
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const moveTodo = async (id: string, direction: 'up' | 'down') => {
    const activeTodos = todos.filter((todo) => !todo.completed).sort((a, b) => a.sort_order - b.sort_order);
    const currentIndex = activeTodos.findIndex((todo) => todo.id === id);
    if (currentIndex === -1) return false;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= activeTodos.length) return false;

    const reordered = [...activeTodos];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const reorderedIds = reordered.map((todo) => todo.id);
    const previousTodos = todos;
    const nextTodos = normalizeTodos(
      previousTodos.map((todo) => {
        const nextIndex = reorderedIds.indexOf(todo.id);
        if (nextIndex === -1 || todo.completed) return todo;
        return {
          ...todo,
          sort_order: nextIndex,
          updated_at: todo.id === id ? nowIso() : todo.updated_at,
        };
      }),
    );

    setTodos(nextTodos);
    setSyncing(true);
    setError(null);

    try {
      await persistBatch(nextTodos.filter((todo) => !todo.completed));
      return true;
    } catch (err) {
      setTodos(previousTodos);
      setError(err instanceof Error ? err.message : 'Failed to reorder tasks');
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const deleteTodo = async (id: string) => {
    const previousTodos = todos;
    const nextTodos = normalizeTodos(previousTodos.filter((todo) => todo.id !== id));
    setTodos(nextTodos);
    setSyncing(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase.from('dashboard_todos').delete().eq('id', id);
      if (deleteError) throw deleteError;

      if (nextTodos.some((todo) => !todo.completed)) {
        await persistBatch(nextTodos.filter((todo) => !todo.completed));
      }
      return true;
    } catch (err) {
      setTodos(previousTodos);
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const clearLocalCache = () => {
    if (!cacheKey) return;
    clearCache(cacheKey);
  };

  return {
    todos: sortTodos(todos),
    loading,
    syncing,
    error,
    addTodo,
    saveTodo,
    toggleTodo,
    moveTodo,
    deleteTodo,
    clearLocalCache,
  };
}
