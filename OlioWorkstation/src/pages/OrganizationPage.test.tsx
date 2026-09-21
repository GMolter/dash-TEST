import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  profile: { role: 'owner' },
  organization: { id: 'org', name: 'Test Team', code: '1234' },
  members: [], deleteOrg: vi.fn(), leaveOrg: vi.fn(),
}));
vi.mock('../hooks/useOrg', () => ({ useOrg: () => state }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: {}, signOut: vi.fn() }) }));
vi.mock('../components/Quicklinks', () => ({ Quicklinks: () => null }));
vi.mock('../components/LauncherDevices', () => ({ LauncherDevices: () => null }));
vi.mock('../components/AnimatedBackground', () => ({ AnimatedBackground: () => null }));
import { OrganizationPage } from './OrganizationPage';
import { ProfileSettings } from './ProfileSettings';

beforeEach(() => { state.profile.role = 'owner'; state.deleteOrg.mockReset().mockResolvedValue({ success: true }); });
function openDelete() {
  fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Organization' }));
}
function confirmDelete() {
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.change(screen.getByLabelText('Organization name to confirm deletion'), { target: { value: 'Test Team' } });
}
describe('Organization deletion', () => {
  it.each(['admin', 'member'])('does not expose deletion to a %s', role => {
    state.profile.role = role;
    render(<OrganizationPage />);
    if (role === 'admin') fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
    else expect(screen.queryByRole('button', { name: 'Manage' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Organization' })).not.toBeInTheDocument();
  });
  it('requires both acknowledgments and closes after success', async () => {
    render(<OrganizationPage />); openDelete();
    const button = screen.getByRole('button', { name: 'Delete', exact: true });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('Organization name to confirm deletion'), { target: { value: 'test team' } });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Organization name to confirm deletion'), { target: { value: 'Test Team' } });
    fireEvent.click(button);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(state.deleteOrg).toHaveBeenCalledTimes(1);
  });
  it('resets confirmation when cancelled', () => {
    render(<OrganizationPage />); openDelete(); confirmDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Organization' }));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Delete', exact: true })).toBeDisabled();
    expect(state.deleteOrg).not.toHaveBeenCalled();
  });
  it('keeps the dialog open and permits retry after a failure', async () => {
    state.deleteOrg.mockResolvedValueOnce({ success: false, error: 'Permission denied' });
    render(<OrganizationPage />); openDelete(); confirmDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));
    expect(await screen.findByText('Permission denied')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete', exact: true })).toBeEnabled();
  });
  it('blocks repeat clicks while deleting', () => {
    state.deleteOrg.mockReturnValue(new Promise(() => {}));
    render(<OrganizationPage />); openDelete(); confirmDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));
    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(state.deleteOrg).toHaveBeenCalledTimes(1);
  });
  it.each(['owner', 'admin', 'member'])('keeps deletion out of Profile for %s', role => {
    state.profile.role = role;
    render(<ProfileSettings appBackgroundTheme="contour-drift" appBackgroundPreset="teal" getPresetForTheme={() => 'teal'} onAppBackgroundThemeChange={vi.fn()} onAppBackgroundPresetChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Delete Organization' })).not.toBeInTheDocument();
    expect(!!screen.queryByRole('button', { name: 'Leave Organization' })).toBe(role !== 'owner');
  });
});
