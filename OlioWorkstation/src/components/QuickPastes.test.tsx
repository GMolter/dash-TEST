import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  MemoryQuickPasteRepository,
  TEST_USER_ID,
  testQuickPaste,
} from '../../test/quickPasteMemoryRepository';
import { QuickPastes } from './QuickPastes';
import type { QuickPaste } from '../features/quickPastes/model';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: TEST_USER_ID } }),
}));

function orderedTitles() {
  const list = screen.getByRole('list', { name: 'Quick Pastes in your chosen order' });
  return within(list).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
}

describe('QuickPastes component', () => {
  it('shows loading, empty, and recoverable load-failure states', async () => {
    let resolveList: ((rows: QuickPaste[]) => void) | undefined;
    const loadingRepository = new MemoryQuickPasteRepository();
    loadingRepository.list = vi.fn((userId: string) => {
      void userId;
      return new Promise<QuickPaste[]>((resolve) => { resolveList = resolve; });
    });
    const { unmount } = render(<QuickPastes repository={loadingRepository} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading your Quick Pastes');
    await act(async () => resolveList?.([]));
    expect(await screen.findByRole('heading', { name: 'No Quick Pastes yet' })).toBeInTheDocument();
    unmount();

    const failingRepository = new MemoryQuickPasteRepository();
    failingRepository.failNext('list');
    render(<QuickPastes repository={failingRepository} />);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load your Quick Pastes");
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'No Quick Pastes yet' })).toBeInTheDocument();
  });

  it('validates required fields and creates a Quick Paste', async () => {
    const user = userEvent.setup();
    const repository = new MemoryQuickPasteRepository();
    render(<QuickPastes repository={repository} />);
    await screen.findByRole('heading', { name: 'No Quick Pastes yet' });

    await user.click(screen.getByRole('button', { name: 'New Quick Paste' }));
    await user.click(screen.getByRole('button', { name: 'Create Quick Paste' }));
    expect(screen.getByText('Enter a title.')).toBeInTheDocument();
    expect(screen.getByText('Enter some content.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), 'Alpha');
    await user.type(screen.getByLabelText('Content'), 'Example content A');
    await user.type(within(screen.getByRole('dialog')).getByLabelText(/Category/), 'General');
    await user.click(screen.getByRole('button', { name: 'Create Quick Paste' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Quick Paste created.');
    expect(orderedTitles()).toEqual(['Alpha']);
    expect(repository.rows).toHaveLength(1);
  });

  it('edits, duplicates, reorders, favorites, deletes, and preserves order after refresh', async () => {
    const user = userEvent.setup();
    const repository = new MemoryQuickPasteRepository([
      testQuickPaste(),
      testQuickPaste({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
        title: 'Beta',
        content: 'Example content B',
        category: 'Sales',
        sort_order: 1,
      }),
    ]);
    const view = render(<QuickPastes repository={repository} />);
    await waitFor(() => expect(orderedTitles()).toEqual(['Alpha', 'Beta']));

    await user.click(screen.getByRole('button', { name: 'Edit Alpha' }));
    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Alpha revised');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(orderedTitles()).toEqual(['Alpha revised', 'Beta']));

    await user.click(screen.getByRole('button', { name: 'Add Alpha revised to favorites' }));
    expect(await screen.findByText('Favorite')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Duplicate Alpha revised' }));
    await waitFor(() => expect(orderedTitles()).toEqual(['Alpha revised', 'Beta', 'Alpha revised copy']));

    await user.click(screen.getByRole('button', { name: 'Move Beta up' }));
    await waitFor(() => expect(orderedTitles()).toEqual(['Beta', 'Alpha revised', 'Alpha revised copy']));

    view.unmount();
    render(<QuickPastes repository={repository} />);
    await waitFor(() => expect(orderedTitles()).toEqual(['Beta', 'Alpha revised', 'Alpha revised copy']));

    await user.click(screen.getByRole('button', { name: 'Delete Alpha revised copy' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('This action cannot be undone.');
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }));
    await waitFor(() => expect(orderedTitles()).toEqual(['Beta', 'Alpha revised']));
  });

  it('searches and filters only the loaded private collection', async () => {
    const user = userEvent.setup();
    const repository = new MemoryQuickPasteRepository([
      testQuickPaste({ title: 'Greeting', content: 'Hello example', category: 'Support' }),
      testQuickPaste({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
        title: 'Closing',
        content: 'Goodbye example',
        category: 'Sales',
        sort_order: 1,
      }),
    ]);
    render(<QuickPastes repository={repository} />);
    await waitFor(() => expect(orderedTitles()).toEqual(['Greeting', 'Closing']));

    await user.type(screen.getByLabelText('Search your Quick Pastes'), 'goodbye');
    expect(orderedTitles()).toEqual(['Closing']);
    expect(screen.getByRole('button', { name: 'Move Closing up' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await user.selectOptions(screen.getByLabelText('Category'), 'Support');
    expect(orderedTitles()).toEqual(['Greeting']);
  });

  it('supports keyboard activation, Escape, focus placement, and visible-focus classes', async () => {
    const user = userEvent.setup();
    render(<QuickPastes repository={new MemoryQuickPasteRepository()} />);
    await screen.findByRole('heading', { name: 'No Quick Pastes yet' });

    const primary = screen.getByRole('button', { name: 'New Quick Paste' });
    expect(primary.className).toContain('focus-visible:ring-2');
    await user.tab();
    expect(primary).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Title')).toHaveFocus();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps a failed mutation recoverable without changing the visible row', async () => {
    const user = userEvent.setup();
    const repository = new MemoryQuickPasteRepository([testQuickPaste()]);
    render(<QuickPastes repository={repository} />);
    await waitFor(() => expect(orderedTitles()).toEqual(['Alpha']));
    repository.failNext('favorite');

    await user.click(screen.getByRole('button', { name: 'Add Alpha to favorites' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't update that favorite");
    expect(screen.queryByText('Favorite')).not.toBeInTheDocument();
    expect(orderedTitles()).toEqual(['Alpha']);
  });

  it('keeps an edit draft visible after a recoverable save failure', async () => {
    const user = userEvent.setup();
    const repository = new MemoryQuickPasteRepository([testQuickPaste()]);
    render(<QuickPastes repository={repository} />);
    await waitFor(() => expect(orderedTitles()).toEqual(['Alpha']));
    await user.click(screen.getByRole('button', { name: 'Edit Alpha' }));
    repository.failNext('update');

    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Retry title');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent("We couldn't save those changes");
    expect(screen.getByLabelText('Title')).toHaveValue('Retry title');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
