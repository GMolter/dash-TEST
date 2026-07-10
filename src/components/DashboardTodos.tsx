import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { DashboardTodo, useDashboardTodos } from '../hooks/useDashboardTodos';

function formatTaskCount(count: number) {
  return `${count} task${count === 1 ? '' : 's'}`;
}

function TaskRow({
  todo,
  canMoveUp,
  canMoveDown,
  onToggle,
  onSave,
  onDelete,
  onMove,
  disabled,
}: {
  todo: DashboardTodo;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: (id: string) => Promise<boolean>;
  onSave: (id: string, updates: { title: string; note?: string | null }) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onMove: (id: string, direction: 'up' | 'down') => Promise<boolean>;
  disabled: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);
  const [draftNote, setDraftNote] = useState(todo.note ?? '');

  useEffect(() => {
    setDraftTitle(todo.title);
    setDraftNote(todo.note ?? '');
  }, [todo.note, todo.title]);

  const saveChanges = async () => {
    const saved = await onSave(todo.id, { title: draftTitle, note: draftNote });
    if (saved) setIsEditing(false);
  };

  return (
    <div className="rounded-[1.35rem] border border-slate-700/60 bg-slate-900/55 p-4 shadow-[0_18px_48px_rgba(2,6,23,0.28)]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => void onToggle(todo.id)}
          disabled={disabled}
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-colors ${
            todo.completed
              ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200'
              : 'border-slate-700/70 bg-slate-800/70 text-slate-300 hover:border-blue-400/40 hover:text-blue-200'
          }`}
          aria-label={todo.completed ? 'Mark task incomplete' : 'Mark task complete'}
        >
          {todo.completed ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
        </button>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Task title"
                className="w-full rounded-2xl border border-slate-700/70 bg-slate-950/75 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400/50 focus:outline-none"
              />
              <textarea
                value={draftNote}
                onChange={(event) => setDraftNote(event.target.value)}
                placeholder="Optional note"
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-700/70 bg-slate-950/75 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400/50 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveChanges()}
                  disabled={disabled || !draftTitle.trim()}
                  className="rounded-xl bg-blue-500/85 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftTitle(todo.title);
                    setDraftNote(todo.note ?? '');
                    setIsEditing(false);
                  }}
                  className="rounded-xl border border-slate-700/70 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={`text-sm font-semibold leading-snug ${todo.completed ? 'text-slate-400 line-through' : 'text-white'}`}>
                {todo.title}
              </div>
              {todo.note && (
                <p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${todo.completed ? 'text-slate-500' : 'text-slate-400'}`}>
                  {todo.note}
                </p>
              )}
            </>
          )}
        </div>

        {!isEditing && (
          <div className="ml-1 flex shrink-0 items-start gap-1">
            {!todo.completed && (
              <>
                <button
                  type="button"
                  onClick={() => void onMove(todo.id, 'up')}
                  disabled={disabled || !canMoveUp}
                  className="rounded-xl border border-slate-700/70 bg-slate-800/75 p-2 text-slate-300 transition-colors hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Move task up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void onMove(todo.id, 'down')}
                  disabled={disabled || !canMoveDown}
                  className="rounded-xl border border-slate-700/70 bg-slate-800/75 p-2 text-slate-300 transition-colors hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Move task down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={disabled}
              className="rounded-xl border border-slate-700/70 bg-slate-800/75 p-2 text-slate-300 transition-colors hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Edit task"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void onDelete(todo.id)}
              disabled={disabled}
              className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-200 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskPanelContent({
  todos,
  loading,
  syncing,
  error,
  onClose,
  onAddTodo,
  onSaveTodo,
  onToggleTodo,
  onMoveTodo,
  onDeleteTodo,
  mobile,
}: {
  todos: DashboardTodo[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  onClose: () => void;
  onAddTodo: (title: string, note?: string) => Promise<boolean>;
  onSaveTodo: (id: string, updates: { title: string; note?: string | null }) => Promise<boolean>;
  onToggleTodo: (id: string) => Promise<boolean>;
  onMoveTodo: (id: string, direction: 'up' | 'down') => Promise<boolean>;
  onDeleteTodo: (id: string) => Promise<boolean>;
  mobile: boolean;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [showNoteField, setShowNoteField] = useState(false);

  const activeTodos = useMemo(
    () => todos.filter((todo) => !todo.completed).sort((a, b) => a.sort_order - b.sort_order),
    [todos],
  );
  const completedTodos = useMemo(
    () => todos.filter((todo) => todo.completed),
    [todos],
  );
  const resetComposer = () => {
    setComposerOpen(false);
    setTitle('');
    setNote('');
    setShowNoteField(false);
  };

  const submitTodo = async () => {
    const created = await onAddTodo(title, note);
    if (!created) return;
    resetComposer();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-800/70 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-blue-200/90">
              <ListTodo className="h-3.5 w-3.5" />
              My Tasks
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-white">Stay on top of the day</h3>
            <p className="mt-2 text-sm text-slate-400">
              {formatTaskCount(activeTodos.length)} open
              {completedTodos.length > 0 ? ` · ${formatTaskCount(completedTodos.length)} completed` : ''}
              {syncing ? ' · Syncing...' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-700/70 bg-slate-800/80 p-3 text-slate-200 transition-colors hover:bg-slate-700/80"
            aria-label="Close tasks"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 scrollbar-theme">
        <div className="space-y-5">
          <div className="rounded-[1.6rem] border border-slate-700/70 bg-slate-900/60 p-4 sm:p-5">
            {composerOpen ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void submitTodo();
                    }
                  }}
                  placeholder="Add a new task"
                  className="w-full rounded-2xl border border-slate-700/70 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400/50 focus:outline-none"
                />
                {(showNoteField || note) && (
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={mobile ? 3 : 4}
                    placeholder="Optional note"
                    className="w-full resize-none rounded-2xl border border-slate-700/70 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400/50 focus:outline-none"
                  />
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNoteField((value) => !value)}
                    className="rounded-xl border border-slate-700/70 bg-slate-800/80 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700/80"
                  >
                    {showNoteField || note ? 'Hide note' : 'Add note'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitTodo()}
                    disabled={syncing || !title.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-500/85 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    Save task
                  </button>
                  <button
                    type="button"
                    onClick={resetComposer}
                    className="rounded-xl border border-slate-700/70 bg-slate-800/80 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700/80"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-200">Add something new</div>
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-500/85 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-400"
                >
                  <Plus className="h-4 w-4" />
                  Add task
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Open</h4>
              <span className="text-xs text-slate-500">{formatTaskCount(activeTodos.length)}</span>
            </div>

            {loading ? (
              <div className="rounded-[1.35rem] border border-slate-700/60 bg-slate-900/45 px-4 py-8 text-center text-sm text-slate-400">
                Loading tasks...
              </div>
            ) : activeTodos.length > 0 ? (
              <div className="space-y-3">
                {activeTodos.map((todo, index) => (
                  <TaskRow
                    key={todo.id}
                    todo={todo}
                    canMoveUp={index > 0}
                    canMoveDown={index < activeTodos.length - 1}
                    onToggle={onToggleTodo}
                    onSave={onSaveTodo}
                    onDelete={onDeleteTodo}
                    onMove={onMoveTodo}
                    disabled={syncing}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-slate-700/60 bg-slate-900/35 px-4 py-10 text-center">
                <div className="text-base font-medium text-slate-200">Nothing queued up</div>
                <div className="mt-2 text-sm text-slate-500">Add a task above to start building your list.</div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Completed</h4>
              <span className="text-xs text-slate-500">{formatTaskCount(completedTodos.length)}</span>
            </div>

            {completedTodos.length > 0 ? (
              <div className="space-y-3">
                {completedTodos.map((todo) => (
                  <TaskRow
                    key={todo.id}
                    todo={todo}
                    canMoveUp={false}
                    canMoveDown={false}
                    onToggle={onToggleTodo}
                    onSave={onSaveTodo}
                    onDelete={onDeleteTodo}
                    onMove={onMoveTodo}
                    disabled={syncing}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.35rem] border border-slate-700/50 bg-slate-900/25 px-4 py-8 text-center text-sm text-slate-500">
                Completed tasks will collect here.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

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
