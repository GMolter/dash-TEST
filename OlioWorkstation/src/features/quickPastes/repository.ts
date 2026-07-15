import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import {
  normalizeQuickPasteInput,
  QuickPaste,
  QuickPasteInput,
  sortQuickPastes,
} from './model';

const QUICK_PASTE_COLUMNS =
  'id,user_id,title,content,category,sort_order,is_favorite,created_at,updated_at';

export interface QuickPasteRepository {
  list(userId: string): Promise<QuickPaste[]>;
  create(userId: string, input: QuickPasteInput, sortOrder: number): Promise<QuickPaste>;
  update(userId: string, id: string, input: QuickPasteInput): Promise<QuickPaste>;
  remove(userId: string, id: string): Promise<void>;
  setFavorite(userId: string, id: string, isFavorite: boolean): Promise<QuickPaste>;
  reorder(orderedIds: string[]): Promise<void>;
}

export class QuickPasteDataError extends Error {
  constructor() {
    super('Quick Paste data operation failed.');
    this.name = 'QuickPasteDataError';
  }
}

function requireResult<T>(data: T | null, error: unknown): T {
  if (error || !data) throw new QuickPasteDataError();
  return data;
}

export function createQuickPasteRepository(client: SupabaseClient): QuickPasteRepository {
  return {
    async list(userId) {
      const { data, error } = await client
        .from('quick_pastes')
        .select(QUICK_PASTE_COLUMNS)
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw new QuickPasteDataError();
      return sortQuickPastes((data ?? []) as QuickPaste[]);
    },

    async create(userId, input, sortOrder) {
      const normalized = normalizeQuickPasteInput(input);
      const { data, error } = await client
        .from('quick_pastes')
        .insert({
          user_id: userId,
          title: normalized.title,
          content: normalized.content,
          category: normalized.category,
          sort_order: sortOrder,
          is_favorite: false,
        })
        .select(QUICK_PASTE_COLUMNS)
        .single();

      return requireResult(data as QuickPaste | null, error);
    },

    async update(userId, id, input) {
      const normalized = normalizeQuickPasteInput(input);
      const { data, error } = await client
        .from('quick_pastes')
        .update({
          title: normalized.title,
          content: normalized.content,
          category: normalized.category,
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select(QUICK_PASTE_COLUMNS)
        .maybeSingle();

      return requireResult(data as QuickPaste | null, error);
    },

    async remove(userId, id) {
      const { data, error } = await client
        .from('quick_pastes')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();

      requireResult(data as { id: string } | null, error);
    },

    async setFavorite(userId, id, isFavorite) {
      const { data, error } = await client
        .from('quick_pastes')
        .update({ is_favorite: isFavorite })
        .eq('id', id)
        .eq('user_id', userId)
        .select(QUICK_PASTE_COLUMNS)
        .maybeSingle();

      return requireResult(data as QuickPaste | null, error);
    },

    async reorder(orderedIds) {
      const { error } = await client.rpc('reorder_quick_pastes', { ordered_ids: orderedIds });
      if (error) throw new QuickPasteDataError();
    },
  };
}

export const quickPasteRepository = createQuickPasteRepository(supabase);
