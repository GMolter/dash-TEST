import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { HelpArticlePage } from './HelpArticlePage';

afterEach(() => vi.unstubAllGlobals());

it('opens maintained slug links and editor-created ID links to the published article', async () => {
  const target = { id: 'a1b2c3', slug: 'quick-pastes', title: 'Quick Pastes' };
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    status: 200,
    json: async () => url.startsWith('/api/public/help-article?')
      ? { article: {
        id: 'source', slug: 'utilities-hub', title: 'Utilities Hub', summary: '',
        updated_at: '2026-09-21T12:00:00Z',
        content: '[By slug](olio://help/quick-pastes)\n\n[By ID](olio://help/a1b2c3)\n\n[Unavailable](olio://help/missing)',
      } }
      : { articles: [target] },
  })));

  render(<HelpArticlePage slug="utilities-hub" />);
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  fireEvent.click(await screen.findByRole('button', { name: 'By slug' }));
  expect(open).toHaveBeenLastCalledWith('/help/article/quick-pastes', '_blank', 'noopener,noreferrer');
  fireEvent.click(screen.getByRole('button', { name: 'By ID' }));
  expect(open).toHaveBeenLastCalledWith('/help/article/quick-pastes', '_blank', 'noopener,noreferrer');
  fireEvent.click(screen.getByRole('button', { name: 'Unavailable' }));
  expect(open).toHaveBeenLastCalledWith('/help', '_blank', 'noopener,noreferrer');
});
