import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Landing from './Landing';

const auth = vi.hoisted(() => ({ getSession: vi.fn(), unsubscribe: vi.fn(), listener: null as null | ((event: string, session: object | null) => void) }));
vi.mock('../lib/supabase', () => ({ supabase: { auth: {
  getSession: auth.getSession,
  onAuthStateChange: (listener: typeof auth.listener) => { auth.listener = listener; return { data: { subscription: { unsubscribe: auth.unsubscribe } } }; },
} } }));
vi.mock('../components/AnimatedBackground', () => ({ AnimatedBackground: () => null }));
const scrollIntoView = vi.fn();
let reduced = false;
beforeEach(() => {
  reduced = false;
  auth.listener = null;
  auth.getSession.mockResolvedValue({ data: { session: null } });
  scrollIntoView.mockClear();
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  Element.prototype.scrollIntoView = scrollIntoView;
});

describe('Landing product tour', () => {
  it('shows one login link and responds to sign-in and sign-out', async () => {
    const { unmount } = render(<Landing />);
    await waitFor(() => expect(auth.listener).not.toBeNull());
    expect(screen.getAllByRole('link', { name: 'Log in' })).toHaveLength(1);
    act(() => auth.listener?.('SIGNED_IN', { user: { id: 'example' } }));
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
    act(() => auth.listener?.('SIGNED_OUT', null));
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    unmount();
    expect(auth.unsubscribe).toHaveBeenCalled();
  });

  it('recognizes an existing session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'example' } } } });
    render(<Landing />);
    expect(await screen.findByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
  });

  it('smoothly scrolls to the tour and respects reduced motion', () => {
    const { unmount } = render(<Landing />);
    fireEvent.click(screen.getByRole('link', { name: 'Take a look around' }));
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'start' });
    unmount();
    reduced = true;
    render(<Landing />);
    fireEvent.click(screen.getByRole('link', { name: 'Take a look around' }));
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'instant', block: 'start' });
  });

  it('uses the actual task panel with local sample data', () => {
    render(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: /My Tasks/ }));
    expect(screen.getByText('Review the project brief')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark task complete' }));
    expect(screen.getByRole('button', { name: 'Mark task incomplete' })).toBeInTheDocument();
  });

  it('keeps preview utility preferences out of account storage', () => {
    localStorage.setItem('utilities_show_desc', 'true');
    render(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: /^03 Utilities$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Show Descriptions/ }));
    fireEvent.click(screen.getByRole('button', { name: /Hide Descriptions/ }));
    expect(localStorage.getItem('utilities_show_desc')).toBe('true');
  });
  it('adds example board cards without needing a workspace connection', () => {
    render(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: '02 Projects' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add task to To Do' }));
    fireEvent.change(screen.getByPlaceholderText('Task title...'), { target: { value: 'Review accessibility' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(screen.getByRole('button', { name: 'Open task: Review accessibility' })).toBeInTheDocument();
  });

});
