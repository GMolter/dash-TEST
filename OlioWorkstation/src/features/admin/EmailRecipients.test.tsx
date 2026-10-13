import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { EmailRecipients } from './EmailRecipients';
import { emailApi } from './emailApi';
vi.mock('./emailApi', () => ({ emailApi: vi.fn() }));
it('searches while typing and adds a person without a separate search action', async () => {
  vi.mocked(emailApi).mockResolvedValue({ users: [{ id: '1', display_name: 'Alex', email: 'alex@example.com' }], organizations: [] });
  const onChange = vi.fn();
  render(<EmailRecipients value={[]} onChange={onChange} disabled={false} />);
  fireEvent.change(screen.getByLabelText('Find registered users'), { target: { value: 'Alex' } });
  fireEvent.click(await screen.findByRole('button', { name: /Alex alex@example.com/ }));
  expect(emailApi).toHaveBeenCalledWith('recipients', { search: 'Alex' });
  expect(onChange).toHaveBeenCalledWith(['alex@example.com']);
});
it('deduplicates typed addresses and rejects invalid input', async () => {
  vi.mocked(emailApi).mockResolvedValue({ users: [], organizations: [] });
  const onChange = vi.fn();
  render(<EmailRecipients value={['alex@example.com']} onChange={onChange} disabled={false} />);
  const input = screen.getByLabelText('Find registered users');
  fireEvent.change(input, { target: { value: 'ALEX@example.com, new@example.com' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onChange).toHaveBeenCalledWith(['alex@example.com', 'new@example.com']);
  await waitFor(() => expect(screen.queryByText('Searching people…')).not.toBeInTheDocument());
  fireEvent.change(input, { target: { value: 'bad@' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByRole('alert')).toHaveTextContent('Enter valid email');
});
