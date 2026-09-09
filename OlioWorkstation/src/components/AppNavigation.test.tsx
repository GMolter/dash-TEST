import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { AppNavigation } from './AppNavigation';

it('shows the admin panel entry only for admins and navigates to it', async () => {
  const user = userEvent.setup();
  const navigate = vi.fn();
  const { rerender } = render(<AppNavigation currentPath="/" onNavigate={navigate} />);
  await user.click(screen.getByRole('button', { name: 'Open navigation' }));
  expect(screen.queryByRole('button', { name: 'Admin panel' })).not.toBeInTheDocument();
  rerender(<AppNavigation currentPath="/" onNavigate={navigate} isAppAdmin />);
  await user.click(screen.getByRole('button', { name: 'Admin panel' }));
  expect(navigate).toHaveBeenCalledWith('/admin');
});
