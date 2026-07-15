export const QUICK_PASTE_LIMITS = {
  title: 120,
  content: 20_000,
  category: 60,
} as const;

export interface QuickPaste {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string | null;
  sort_order: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuickPasteInput {
  title: string;
  content: string;
  category?: string | null;
}

export type QuickPasteValidationErrors = Partial<Record<keyof QuickPasteInput, string>>;

function characterLength(value: string) {
  return Array.from(value).length;
}

function truncateCharacters(value: string, maximum: number) {
  return Array.from(value).slice(0, maximum).join('');
}

export function normalizeQuickPasteInput(input: QuickPasteInput): QuickPasteInput {
  return {
    title: input.title.trim(),
    content: input.content,
    category: input.category?.trim() || null,
  };
}

export function validateQuickPasteInput(input: QuickPasteInput): QuickPasteValidationErrors {
  const normalized = normalizeQuickPasteInput(input);
  const errors: QuickPasteValidationErrors = {};

  if (!normalized.title) {
    errors.title = 'Enter a title.';
  } else if (characterLength(normalized.title) > QUICK_PASTE_LIMITS.title) {
    errors.title = `Use ${QUICK_PASTE_LIMITS.title} characters or fewer.`;
  }

  if (!normalized.content.trim()) {
    errors.content = 'Enter some content.';
  } else if (characterLength(normalized.content) > QUICK_PASTE_LIMITS.content) {
    errors.content = `Use ${QUICK_PASTE_LIMITS.content.toLocaleString()} characters or fewer.`;
  }

  if (normalized.category && characterLength(normalized.category) > QUICK_PASTE_LIMITS.category) {
    errors.category = `Use ${QUICK_PASTE_LIMITS.category} characters or fewer.`;
  }

  return errors;
}

export function isQuickPasteInputValid(input: QuickPasteInput) {
  return Object.keys(validateQuickPasteInput(input)).length === 0;
}

export function sortQuickPastes(items: QuickPaste[]) {
  return [...items].sort((left, right) => {
    if (left.sort_order !== right.sort_order) return left.sort_order - right.sort_order;
    const createdComparison = left.created_at.localeCompare(right.created_at);
    if (createdComparison !== 0) return createdComparison;
    return left.id.localeCompare(right.id);
  });
}

export function normalizeQuickPasteOrder(items: QuickPaste[]) {
  return sortQuickPastes(items).map((item, index) => ({ ...item, sort_order: index }));
}

export function moveQuickPaste(
  items: QuickPaste[],
  id: string,
  direction: 'up' | 'down',
) {
  const ordered = sortQuickPastes(items);
  const currentIndex = ordered.findIndex((item) => item.id === id);
  if (currentIndex === -1) return ordered;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= ordered.length) return ordered;

  const next = [...ordered];
  const [moved] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next.map((item, index) => ({ ...item, sort_order: index }));
}

export function filterQuickPastes(items: QuickPaste[], search: string, category: string) {
  const query = search.trim().toLocaleLowerCase();
  return sortQuickPastes(items).filter((item) => {
    if (category && item.category !== category) return false;
    if (!query) return true;

    return [item.title, item.content, item.category || '']
      .some((value) => value.toLocaleLowerCase().includes(query));
  });
}

export function quickPasteCategories(items: QuickPaste[]) {
  return Array.from(
    new Set(items.map((item) => item.category).filter((category): category is string => Boolean(category))),
  ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
}

export function duplicateQuickPasteTitle(title: string) {
  const suffix = ' copy';
  return `${truncateCharacters(title, QUICK_PASTE_LIMITS.title - suffix.length)}${suffix}`;
}
