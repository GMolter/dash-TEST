import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ListTodo } from 'lucide-react';
import { useDashboardTodos } from '../hooks/useDashboardTodos';
import { TaskPanelContent } from './DashboardTaskPanel';

export function DashboardTodosHomeHeader() {
  const { todos, loading, syncing, error, addTodo, saveTodo, toggleTodo, moveTodo, deleteTodo } = useDashboardTodos();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  const activeTodos = useMemo(
    () => todos.filter((todo) => !todo.completed).sort((a, b) => a.sort_order - b.sort_order),
    [todos],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => setIsMobile(media.matches);

    syncViewport();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', syncViewport);
      return () => media.removeEventListener('change', syncViewport);
    }

    media.addListener(syncViewport);
    return () => media.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  const panel = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-0 z-[120]">
          <button
            type="button"
            aria-label="Close tasks"
            className="absolute inset-0 h-full w-full bg-slate-950/72 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />

          {isMobile ? (
            <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6">
              <div
                className="ql-folder-focus relative flex h-[min(88vh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-slate-600/70 bg-slate-900/90 shadow-2xl shadow-slate-950/75"
                onClick={(event) => event.stopPropagation()}
              >
                <TaskPanelContent
                  todos={todos}
                  loading={loading}
                  syncing={syncing}
                  error={error}
                  onClose={() => setIsOpen(false)}
                  onAddTodo={addTodo}
                  onSaveTodo={saveTodo}
                  onToggleTodo={toggleTodo}
                  onMoveTodo={moveTodo}
                  onDeleteTodo={deleteTodo}
                  mobile
                />
              </div>
            </div>
          ) : (
            <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
              <div
                className="todo-drawer-open relative flex h-full w-[min(34rem,100vw)] flex-col overflow-hidden border-l border-slate-700/70 bg-slate-950/94 shadow-2xl shadow-slate-950/90 backdrop-blur-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <TaskPanelContent
                  todos={todos}
                  loading={loading}
                  syncing={syncing}
                  error={error}
                  onClose={() => setIsOpen(false)}
                  onAddTodo={addTodo}
                  onSaveTodo={saveTodo}
                  onToggleTodo={toggleTodo}
                  onMoveTodo={moveTodo}
                  onDeleteTodo={deleteTodo}
                  mobile={false}
                />
              </div>
            </div>
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="glass-control fixed right-4 top-4 z-[100] flex h-14 items-center gap-2 px-4 sm:right-7 sm:top-7 sm:h-16 sm:gap-3 sm:px-5"
        aria-label={`Open My Tasks, ${activeTodos.length} open`}
      >
        <ListTodo className="h-5 w-5 text-indigo-200 sm:h-6 sm:w-6" />
        <span className="hidden text-sm font-medium sm:inline">My Tasks</span>
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full border border-indigo-300/20 bg-indigo-400/15 px-2 text-xs font-semibold text-indigo-100">
          {loading ? '…' : activeTodos.length}
        </span>
        {syncing && <span className="sr-only">Syncing</span>}
      </button>
      {panel}
    </>
  );
}
