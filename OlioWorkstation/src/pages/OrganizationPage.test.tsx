import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  profile: { id: 'owner', role: 'owner' },
  organization: { id: 'org', name: 'Test Team', code: '1234' },
  members: [] as { id: string; display_name: string; email: string; role: string }[], updateMemberRole: vi.fn(), transferOwnership: vi.fn(), removeMember: vi.fn(), refreshOrg: vi.fn(), deleteOrg: vi.fn(), leaveOrg: vi.fn(),
}));
vi.mock('../hooks/useOrg', () => ({ useOrg: () => state }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: {}, signOut: vi.fn() }) }));
vi.mock('../components/Quicklinks', () => ({ Quicklinks: () => null }));
vi.mock('../components/LauncherDevices', () => ({ LauncherDevices: () => null }));
vi.mock('../components/AnimatedBackground', () => ({ AnimatedBackground: () => null }));
const workspace = vi.hoisted(() => ({ announcements: [], resources: [], loading: false, error: '', refresh: vi.fn(), saveAnnouncement: vi.fn(), saveResource: vi.fn(), remove: vi.fn() }));
vi.mock('../features/organization/useOrganizationWorkspace', async importOriginal => ({
  ...await importOriginal<typeof import('../features/organization/useOrganizationWorkspace')>(),
  useOrganizationWorkspace: () => workspace,
  useOrganizationActivity: () => ({ items: [], loading: false, error: '', more: false, refresh: vi.fn() }),
}));
import { OrganizationPage } from './OrganizationPage';
import { ProfileSettings } from './ProfileSettings';

beforeEach(() => {
  state.profile.role = 'owner'; state.members = [];
  for (const fn of [state.deleteOrg, state.updateMemberRole, state.transferOwnership, state.removeMember]) fn.mockReset().mockResolvedValue({ success: true });
  workspace.saveAnnouncement.mockReset().mockResolvedValue(undefined); workspace.saveResource.mockReset().mockResolvedValue(undefined);
});
function openDelete() {
  fireEvent.click(screen.getByRole('button', { name: 'Admin' }));
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
    if (role === 'admin') fireEvent.click(screen.getByRole('button', { name: 'Admin' }));
    else expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
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

describe('Organization workspace', () => {
  it('copies the large header join code', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<OrganizationPage />);
    const code = screen.getByRole('button', { name: 'Copy join code' });
    expect(code).toHaveTextContent('1234'); fireEvent.click(code);
    await waitFor(() => expect(writeText).toHaveBeenCalledExactlyOnceWith('1234'));
  });
  it('publishes an announcement with pinned state', async () => {
    render(<OrganizationPage />);
    fireEvent.click(screen.getByRole('button', { name: 'New announcement' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Team update' } });
    fireEvent.change(screen.getByLabelText('Announcement'), { target: { value: 'Meet on Friday.' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Publish announcement' }));
    await waitFor(() => expect(workspace.saveAnnouncement).toHaveBeenCalledWith({ title: 'Team update', body: 'Meet on Friday.', pinned: true }, undefined));
  });
  it('allows members to add written resources but not announcements', async () => {
    state.profile.role = 'member'; render(<OrganizationPage />);
    expect(screen.queryByRole('button', { name: 'New announcement' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resources', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Add resource' }));
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'note' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Guide' } });
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'How to get started' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add resource' }));
    await waitFor(() => expect(workspace.saveResource).toHaveBeenCalledWith(expect.objectContaining({ kind: 'note', title: 'Guide', content: 'How to get started' }), undefined));
  });
  it('confirms adding an equal owner before changing their role', async () => {
    state.members = [{ id: 'owner', role: 'owner', display_name: 'Owner', email: 'owner@example.test' }, { id: 'member', role: 'member', display_name: 'Robin', email: 'robin@example.test' }];
    render(<OrganizationPage />);
    fireEvent.click(screen.getByRole('button', { name: 'People', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Manage Robin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add as owner' }));
    expect(state.updateMemberRole).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent('You will remain an owner');
    fireEvent.click(screen.getByRole('button', { name: 'Add owner' }));
    await waitFor(() => expect(state.updateMemberRole).toHaveBeenCalledExactlyOnceWith('member', 'owner'));
  });
  it('confirms ownership transfer and explains the sender becomes admin', async () => {
    state.members = [{ id: 'member', role: 'member', display_name: 'Robin', email: 'robin@example.test' }];
    render(<OrganizationPage />); fireEvent.click(screen.getByRole('button', { name: 'People', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Manage Robin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Transfer my ownership' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('You will become an admin');
    fireEvent.click(screen.getByRole('button', { name: 'Transfer ownership' }));
    await waitFor(() => expect(state.transferOwnership).toHaveBeenCalledExactlyOnceWith('member'));
  });
  it('prevents the last owner from demoting themselves', () => {
    state.members = [{ id: 'owner', role: 'owner', display_name: 'Owner', email: 'owner@example.test' }];
    render(<OrganizationPage />); fireEvent.click(screen.getByRole('button', { name: 'People', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Manage Owner' }));
    expect(screen.getByRole('button', { name: 'Change to admin' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Change to member' })).toBeDisabled();
  });
});
