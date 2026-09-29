import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { DashboardPhoto } from './DashboardPhoto';
import { DashboardPhotoSettings } from './DashboardPhotoSettings';

const mocks = vi.hoisted(() => ({ user: { id: 'user-1' }, upload: vi.fn(), remove: vi.fn(), download: vi.fn(), decode: vi.fn(), cached: vi.fn(), publish: vi.fn(), draw: vi.fn() }));
vi.mock('../lib/dashboardPhoto', async original => ({ ...(await original<typeof import('../lib/dashboardPhoto')>()), readCachedPhoto: mocks.cached, publishPhoto: mocks.publish, cachePhoto: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../lib/supabase', () => ({ supabase: { storage: { from: () => mocks } } }));
beforeEach(() => {
  mocks.user = { id: 'user-1' };
  mocks.upload.mockReset().mockResolvedValue({ error: null });
  mocks.remove.mockReset().mockResolvedValue({ error: null });
  mocks.download.mockReset().mockResolvedValue({ data: new Blob(['image'], { type: 'image/jpeg' }), error: null });
  mocks.cached.mockReset().mockResolvedValue(null);
  mocks.publish.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:photo'), revokeObjectURL: vi.fn() }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: mocks.draw, fillRect: vi.fn(), clearRect: vi.fn() } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['crop'], { type: 'image/jpeg' })));
  mocks.decode.mockReset().mockResolvedValue({ close: vi.fn(), width: 2400, height: 1600 });
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
  await screen.findByLabelText('Photo crop preview');
  expect(mocks.upload).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Zoom'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Output width'), { target: { value: '1280' } });
  fireEvent.click(screen.getByText('Apply photo'));
  expect(await screen.findByText('Photo applied. Your background is ready in new tabs, too.')).toBeInTheDocument();
  expect(mocks.upload).toHaveBeenCalledWith('user-1/background', expect.any(Blob), expect.objectContaining({ upsert: true }));
  fireEvent.click(screen.getByText('Use built-in background'));
  expect(await screen.findByText('Built-in background restored.')).toBeInTheDocument();
  expect(mocks.remove).toHaveBeenCalledWith(['user-1/background']);
  expect(mocks.publish).toHaveBeenLastCalledWith('user-1', null);
});
it('hides the previous account photo immediately on account switch', async () => {
  const { container, rerender } = render(<DashboardPhoto />);
  await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
  mocks.download.mockReturnValue(new Promise(() => {}));
  mocks.user = { id: 'user-2' };
  rerender(<DashboardPhoto />);
  expect(container.querySelector('img')).toBeNull();
});

it('shows cached bytes in a fresh tab without a storage network request', async () => {
  mocks.cached.mockResolvedValue({ userId: 'user-1', blob: new Blob(['cached']), savedAt: Date.now() });
  const { container } = render(<DashboardPhoto />);
  await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
  expect(mocks.download).not.toHaveBeenCalled();
});

it('keeps a stale cached photo during network failure and clears it when removed in another tab', async () => {
  mocks.cached.mockResolvedValue({ userId: 'user-1', blob: new Blob(['cached']), savedAt: 0 });
  mocks.download.mockResolvedValue({ error: { statusCode: '500' }, data: null });
  const { container } = render(<DashboardPhoto />);
  await waitFor(() => expect(mocks.download).toHaveBeenCalled());
  expect(container.querySelector('img')).not.toBeNull();
  mocks.cached.mockResolvedValue({ userId: 'user-1', blob: null, savedAt: Date.now() });
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'olio-dashboard-photo-revision:user-1' })));
  await waitFor(() => expect(container.querySelector('img')).toBeNull());
});

it('does not overwrite a cached background when the upload fails', async () => {
  mocks.upload.mockResolvedValue({ error: new Error('Upload failed') });
  render(<DashboardPhotoSettings />);
  fireEvent.change(screen.getByLabelText('Dashboard photo'), { target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] } });
  await screen.findByLabelText('Photo crop preview');
  fireEvent.click(screen.getByText('Apply photo'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Upload failed');
  expect(mocks.publish).not.toHaveBeenCalled();
});
