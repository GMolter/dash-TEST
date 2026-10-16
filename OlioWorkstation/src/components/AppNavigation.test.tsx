import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { AppNavigation } from './AppNavigation';
it('opens the Help Center from the main navigation', async () => {
  const user = userEvent.setup();
  const navigate = vi.fn();
  render(<AppNavigation currentPath="/" onNavigate={navigate} />);
  await user.click(screen.getByRole('button', { name: 'Open navigation' }));
  await user.click(screen.getByRole('button', { name: 'Help Center' }));
  expect(navigate).toHaveBeenCalledWith('/help');
});

it('shows the admin panel entry only for admins and navigates to it', async () => {
  const user = userEvent.setup();
  const navigate = vi.fn();
  const { rerender } = render(<AppNavigation currentPath="/" onNavigate={navigate} />);
  await user.click(screen.getByRole('button', { name: 'Open navigation' }));
  expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
  rerender(<AppNavigation currentPath="/" onNavigate={navigate} isAppAdmin />);
  expect(within(screen.getByRole('navigation', { name: 'Primary navigation' })).getAllByRole('button').map(button => button.textContent)).toEqual(['Home', 'Utilities', 'Help Center', 'Organization', 'Profile', 'Admin']);
  await user.click(screen.getByRole('button', { name: 'Admin' }));
  expect(navigate).toHaveBeenCalledWith('/admin');
});
