import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';

describe('App startup recovery', () => {
  it('renders a reload action instead of an empty root when a view crashes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function BrokenView(): never { throw new Error('Failed to load view'); }
    render(<AppErrorBoundary><BrokenView /></AppErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('This view couldn’t load');
    expect(screen.getByRole('button', { name: 'Reload Olio' })).toBeVisible();
  });

  it('renders a healthy view normally', () => {
    render(<AppErrorBoundary><h1>Welcome to Olio</h1></AppErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'Welcome to Olio' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
