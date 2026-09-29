import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { DashboardPhoto, DashboardPhotoSettings } from './DashboardPhoto';

const mocks = vi.hoisted(() => ({ user: { id: 'user-1' }, upload: vi.fn(), remove: vi.fn(), createSignedUrl: vi.fn(), decode: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../lib/supabase', () => ({ supabase: { storage: { from: () => mocks } } }));
beforeEach(() => {
  mocks.user = { id: 'user-1' };
  mocks.upload.mockReset().mockResolvedValue({ error: null });
  mocks.remove.mockReset().mockResolvedValue({ error: null });
  mocks.createSignedUrl.mockReset().mockResolvedValue({ data: { signedUrl: 'https://example.com/private-photo' } });
  mocks.decode.mockReset().mockResolvedValue({ close: vi.fn() });
  vi.stubGlobal('createImageBitmap', mocks.decode);
});
it('rejects unsupported, oversized, and corrupt images before uploading', async () => {
  render(<DashboardPhotoSettings />);
  const input = screen.getByLabelText('Dashboard photo');
  fireEvent.change(input, { target: { files: [new File(['svg'], 'image.svg', { type: 'image/svg+xml' })] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPEG');
  fireEvent.change(input, { target: { files: [new File([new Uint8Array(5242881)], 'large.png', { type: 'image/png' })] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('smaller than 5 MB');
  mocks.decode.mockRejectedValue(new Error('Invalid image'));
  fireEvent.change(input, { target: { files: [new File(['bad'], 'bad.png', { type: 'image/png' })] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be opened');
  expect(mocks.upload).not.toHaveBeenCalled();
});
it('uploads privately to the current account and supports restoring the built-in background', async () => {
  render(<DashboardPhotoSettings />);
  const file = new File(['image'], 'photo.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Dashboard photo'), { target: { files: [file] } });
  expect(await screen.findByText('Dashboard photo saved.')).toBeInTheDocument();
  expect(mocks.upload).toHaveBeenCalledWith('user-1/background', file, expect.objectContaining({ upsert: true }));
  fireEvent.click(screen.getByText('Use built-in background'));
  expect(await screen.findByText('Built-in background restored.')).toBeInTheDocument();
  expect(mocks.remove).toHaveBeenCalledWith(['user-1/background']);
});
it('hides the previous account photo immediately on account switch', async () => {
  const { container, rerender } = render(<DashboardPhoto />);
  await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
  mocks.createSignedUrl.mockReturnValue(new Promise(() => {}));
  mocks.user = { id: 'user-2' };
  rerender(<DashboardPhoto />);
  expect(container.querySelector('img')).toBeNull();
});
