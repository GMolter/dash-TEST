import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { AppNavigation } from './AppNavigation';
it('opens Support from the main navigation', async () => {
  const user = userEvent.setup();
  const navigate = vi.fn();
  render(<AppNavigation currentPath="/" onNavigate={navigate} />);
  await user.click(screen.getByRole('button', { name: 'Open navigation' }));
  await user.click(screen.getByRole('button', { name: 'Support' }));
  expect(navigate).toHaveBeenCalledWith('/support');
});

it('shows the admin panel entry only for admins and navigates to it', async () => {
  const user = userEvent.setup();
  const navigate = vi.fn();
  const { rerender } = render(<AppNavigation currentPath="/" onNavigate={navigate} />);
  await user.click(screen.getByRole('button', { name: 'Open navigation' }));
  expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
  rerender(<AppNavigation currentPath="/" onNavigate={navigate} isAppAdmin />);
  expect(within(screen.getByRole('navigation', { name: 'Primary navigation' })).getAllByRole('button').map(button => button.textContent)).toEqual(['Home', 'Utilities', 'Support', 'Profile', 'Organization', 'Admin']);
  await user.click(screen.getByRole('button', { name: 'Admin' }));
  expect(navigate).toHaveBeenCalledWith('/admin');
});
