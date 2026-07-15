import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CopyPlus,
  FilePenLine,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  filterQuickPastes,
  QUICK_PASTE_LIMITS,
  QuickPaste,
  QuickPasteInput,
  quickPasteCategories,
  validateQuickPasteInput,
} from '../features/quickPastes/model';
import type { QuickPasteRepository } from '../features/quickPastes/repository';
import { useQuickPastes } from '../hooks/useQuickPastes';

const focusClasses = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';
const fieldClasses = `w-full rounded-2xl border border-slate-700/75 bg-slate-950/75 px-4 py-3 text-sm text-white placeholder:text-slate-500 ${focusClasses}`;

function trapDialogFocus(event: KeyboardEvent<HTMLElement>, container: HTMLElement | null) {
  if (event.key !== 'Tab' || !container) return;
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ));
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function QuickPasteFormDialog({
  item,
  busy,
  saveError,
  onClose,
  onSave,
}: {
  item: QuickPaste | null;
  busy: boolean;
  saveError: string | null;
  onClose: () => void;
  onSave: (input: QuickPasteInput) => Promise<boolean>;
}) {
  const [input, setInput] = useState<QuickPasteInput>({
    title: item?.title || '',
    content: item?.content || '',
    category: item?.category || '',
  });
  const [submitted, setSubmitted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const errors = submitted ? validateQuickPasteInput(input) : {};

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateQuickPasteInput(input)).length > 0) return;
    if (await onSave(input)) onClose();
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-paste-form-title"
        className="glass-panel max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] p-5 sm:p-7"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onClose();
          trapDialogFocus(event, dialogRef.current);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/75">Private utility</p>
            <h3 id="quick-paste-form-title" className="mt-2 text-2xl font-semibold text-white">
              {item ? 'Edit Quick Paste' : 'Create Quick Paste'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`rounded-2xl border border-slate-700 bg-slate-800/80 p-3 text-slate-200 hover:bg-slate-700 disabled:opacity-50 ${focusClasses}`}
            aria-label="Close Quick Paste form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={(event) => void submit(event)} noValidate>
          {saveError && (
            <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {saveError}
            </div>
          )}
          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="quick-paste-title" className="text-sm font-medium text-slate-200">Title</label>
              <span className="text-xs text-slate-500">{Array.from(input.title).length}/{QUICK_PASTE_LIMITS.title}</span>
            </div>
            <input
              ref={titleRef}
              id="quick-paste-title"
              value={input.title}
              onChange={(event) => setInput((current) => ({ ...current, title: event.target.value }))}
              maxLength={QUICK_PASTE_LIMITS.title}
              className={`${fieldClasses} mt-2`}
              placeholder="Display name"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'quick-paste-title-error' : undefined}
              required
            />
            {errors.title && <p id="quick-paste-title-error" className="mt-2 text-sm text-red-200">{errors.title}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="quick-paste-content" className="text-sm font-medium text-slate-200">Content</label>
              <span className="text-xs text-slate-500">{Array.from(input.content).length.toLocaleString()}/{QUICK_PASTE_LIMITS.content.toLocaleString()}</span>
            </div>
            <textarea
              id="quick-paste-content"
              value={input.content}
              onChange={(event) => setInput((current) => ({ ...current, content: event.target.value }))}
              maxLength={QUICK_PASTE_LIMITS.content}
              rows={10}
              className={`${fieldClasses} mt-2 resize-y font-mono leading-relaxed`}
              placeholder="Reusable text"
              aria-invalid={Boolean(errors.content)}
              aria-describedby={errors.content ? 'quick-paste-content-error' : 'quick-paste-content-help'}
              required
            />
            {errors.content ? (
              <p id="quick-paste-content-error" className="mt-2 text-sm text-red-200">{errors.content}</p>
            ) : (
              <p id="quick-paste-content-help" className="mt-2 text-xs text-slate-500">Stored privately for your signed-in account. No share link is created.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="quick-paste-category" className="text-sm font-medium text-slate-200">Category <span className="text-slate-500">(optional)</span></label>
              <span className="text-xs text-slate-500">{Array.from(input.category || '').length}/{QUICK_PASTE_LIMITS.category}</span>
            </div>
            <input
              id="quick-paste-category"
              value={input.category || ''}
              onChange={(event) => setInput((current) => ({ ...current, category: event.target.value }))}
              maxLength={QUICK_PASTE_LIMITS.category}
              className={`${fieldClasses} mt-2`}
              placeholder="For example: Support"
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? 'quick-paste-category-error' : undefined}
            />
            {errors.category && <p id="quick-paste-category-error" className="mt-2 text-sm text-red-200">{errors.category}</p>}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className={`rounded-2xl border border-slate-700 bg-slate-800/75 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50 ${focusClasses}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`rounded-2xl bg-cyan-500/90 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-55 ${focusClasses}`}
            >
              {busy ? 'Saving…' : item ? 'Save changes' : 'Create Quick Paste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDialog({ item, busy, onCancel, onDelete }: {
  item: QuickPaste;
  busy: boolean;
  onCancel: () => void;
  onDelete: () => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-[175] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-quick-paste-title"
        aria-describedby="delete-quick-paste-description"
        className="glass-panel w-full max-w-md rounded-[2rem] p-6 sm:p-7"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onCancel();
          trapDialogFocus(event, dialogRef.current);
        }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/25 bg-red-500/10 text-red-200">
          <Trash2 className="h-5 w-5" />
        </div>
        <h3 id="delete-quick-paste-title" className="mt-5 text-xl font-semibold text-white">Delete Quick Paste?</h3>
        <p id="delete-quick-paste-description" className="mt-3 text-sm leading-relaxed text-slate-400">
          This permanently deletes “{item.title}”. This action cannot be undone.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={`rounded-2xl border border-slate-700 bg-slate-800/75 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50 ${focusClasses}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onDelete()}
            disabled={busy}
            className={`rounded-2xl bg-red-500/90 px-5 py-3 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50 ${focusClasses}`}
          >
            {busy ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function QuickPastes({ repository }: { repository?: QuickPasteRepository }) {
  const {
    items,
    loading,
    busy,
    error,
    success,
    reload,
    clearNotice,
    createItem,
    updateItem,
    deleteItem,
    duplicateItem,
    toggleFavorite,
    moveItem,
  } = useQuickPastes(repository);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [formItem, setFormItem] = useState<QuickPaste | null | undefined>(undefined);
  const [deleteItemTarget, setDeleteItemTarget] = useState<QuickPaste | null>(null);

  const categories = useMemo(() => quickPasteCategories(items), [items]);
  const visibleItems = useMemo(() => filterQuickPastes(items, search, category), [category, items, search]);
  const filtering = Boolean(search.trim() || category);
  const favorites = items.filter((item) => item.is_favorite).length;

  useEffect(() => {
    if (category && !categories.includes(category)) setCategory('');
  }, [categories, category]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6" aria-labelledby="quick-pastes-heading">
      <header className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
              <FilePenLine className="h-3.5 w-3.5" />
              Private to you
            </div>
            <h2 id="quick-pastes-heading" className="mt-4 text-3xl font-semibold tracking-tight text-white">Quick Pastes</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Keep reusable text ready for fast insertion. Quick Pastes never create a public URL and stay separate from Pastebin.
            </p>
            {!loading && items.length > 0 && (
              <p className="mt-3 text-xs text-slate-500">{items.length} saved · {favorites} favorite{favorites === 1 ? '' : 's'}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              clearNotice();
              setFormItem(null);
            }}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-500/90 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 ${focusClasses}`}
          >
            <Plus className="h-4 w-4" />
            New Quick Paste
          </button>
        </div>
      </header>

      <div className="glass-panel rounded-[2rem] p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.35fr)]">
          <div>
            <label htmlFor="quick-paste-search" className="text-sm font-medium text-slate-200">Search your Quick Pastes</label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="quick-paste-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={`${fieldClasses} pl-11`}
                placeholder="Search titles, content, or categories"
              />
            </div>
          </div>
          <div>
            <label htmlFor="quick-paste-category-filter" className="text-sm font-medium text-slate-200">Category</label>
            <select
              id="quick-paste-category-filter"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={`${fieldClasses} mt-2`}
            >
              <option value="">All categories</option>
              {categories.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </div>
        {filtering && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>{visibleItems.length} matching Quick Paste{visibleItems.length === 1 ? '' : 's'}. Clear search and category to reorder.</span>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategory('');
              }}
              className={`rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-slate-200 hover:bg-slate-700 ${focusClasses}`}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {error && formItem === undefined && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-400/25 bg-red-500/10 px-5 py-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</span>
          <button type="button" onClick={() => void reload()} className={`shrink-0 rounded-xl border border-red-300/25 px-3 py-2 font-medium hover:bg-red-400/10 ${focusClasses}`}>Try again</button>
        </div>
      )}
      {success && !error && <div role="status" className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">{success}</div>}

      {loading ? (
        <div role="status" aria-live="polite" className="glass-panel rounded-[2rem] px-6 py-16 text-center text-sm text-slate-400">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-300" aria-hidden="true" />
          Loading your Quick Pastes…
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="glass-panel rounded-[2rem] px-6 py-16 text-center">
          <FilePenLine className="mx-auto h-10 w-10 text-slate-600" />
          <h3 className="mt-4 text-lg font-semibold text-slate-200">{items.length === 0 ? 'No Quick Pastes yet' : 'No matches found'}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {items.length === 0 ? 'Create your first private reusable snippet to get started.' : 'Try a different search or category.'}
          </p>
          {items.length === 0 && (
            <button type="button" onClick={() => setFormItem(null)} className={`mt-6 rounded-2xl bg-cyan-500/90 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 ${focusClasses}`}>
              Create your first Quick Paste
            </button>
          )}
        </div>
      ) : (
        <ol className="space-y-4" aria-label="Quick Pastes in your chosen order">
          {visibleItems.map((item) => {
            const fullIndex = items.findIndex((candidate) => candidate.id === item.id);
            return (
              <li key={item.id} className="glass-panel rounded-[1.75rem] p-5 sm:p-6">
                <article>
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-lg font-semibold text-white">{item.title}</h3>
                        {item.category && <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-xs text-violet-100">{item.category}</span>}
                        {item.is_favorite && <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-100"><Star className="h-3 w-3 fill-current" />Favorite</span>}
                      </div>
                      <pre className="mt-4 max-h-36 overflow-hidden whitespace-pre-wrap break-words rounded-2xl border border-slate-800/80 bg-slate-950/65 p-4 font-mono text-sm leading-relaxed text-slate-300">{item.content}</pre>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:max-w-[19rem] lg:justify-end">
                      <button type="button" onClick={() => void toggleFavorite(item.id)} disabled={busy} aria-label={item.is_favorite ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`} aria-pressed={item.is_favorite} className={`rounded-xl border border-amber-300/20 bg-amber-400/10 p-2.5 text-amber-100 hover:bg-amber-400/20 disabled:opacity-45 ${focusClasses}`}><Star className={`h-4 w-4 ${item.is_favorite ? 'fill-current' : ''}`} /></button>
                      <button type="button" onClick={() => setFormItem(item)} disabled={busy} aria-label={`Edit ${item.title}`} className={`rounded-xl border border-slate-700 bg-slate-800/75 p-2.5 text-slate-200 hover:bg-slate-700 disabled:opacity-45 ${focusClasses}`}><FilePenLine className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void duplicateItem(item.id)} disabled={busy} aria-label={`Duplicate ${item.title}`} className={`rounded-xl border border-slate-700 bg-slate-800/75 p-2.5 text-slate-200 hover:bg-slate-700 disabled:opacity-45 ${focusClasses}`}><CopyPlus className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void moveItem(item.id, 'up')} disabled={busy || filtering || fullIndex <= 0} aria-label={`Move ${item.title} up`} className={`rounded-xl border border-slate-700 bg-slate-800/75 p-2.5 text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35 ${focusClasses}`}><ChevronUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void moveItem(item.id, 'down')} disabled={busy || filtering || fullIndex >= items.length - 1} aria-label={`Move ${item.title} down`} className={`rounded-xl border border-slate-700 bg-slate-800/75 p-2.5 text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35 ${focusClasses}`}><ChevronDown className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setDeleteItemTarget(item)} disabled={busy} aria-label={`Delete ${item.title}`} className={`rounded-xl border border-red-400/20 bg-red-500/10 p-2.5 text-red-200 hover:bg-red-500/20 disabled:opacity-45 ${focusClasses}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}

      {formItem !== undefined && (
        <QuickPasteFormDialog
          key={formItem?.id || 'new'}
          item={formItem}
          busy={busy}
          saveError={error}
          onClose={() => setFormItem(undefined)}
          onSave={(input) => formItem ? updateItem(formItem.id, input) : createItem(input)}
        />
      )}

      {deleteItemTarget && (
        <DeleteDialog
          item={deleteItemTarget}
          busy={busy}
          onCancel={() => setDeleteItemTarget(null)}
          onDelete={async () => {
            if (await deleteItem(deleteItemTarget.id)) setDeleteItemTarget(null);
          }}
        />
      )}
    </section>
  );
}
