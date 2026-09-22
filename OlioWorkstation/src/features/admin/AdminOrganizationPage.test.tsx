import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminOrganizationPage } from './AdminOrganizationPage';
import { loadAdminResource, revealAdminField } from './api';
import { ADMIN_RESOURCES } from '../../../api/_utils/adminResources';
vi.mock('./api', () => ({ loadAdminResource: vi.fn(), revealAdminField: vi.fn() }));
vi.mock('./AdminOperationDialog', () => ({ AdminOperationDialog: ({ operation }: { operation: unknown }) => operation ? <output data-testid="operation">{JSON.stringify(operation)}</output> : null }));
const orgId = '10000000-0000-4000-8000-000000000001';
const memberId = '00000000-0000-4000-8000-000000000001';
beforeEach(() => {
  vi.mocked(revealAdminField).mockResolvedValue({ result: { code: '0012' } });
  vi.mocked(loadAdminResource).mockImplementation(async request => {
    const registry = ADMIN_RESOURCES[request.resource];
    return { resource: request.resource, label: registry.label, fields: registry.fields, actions: ['create','update','delete'], rows: request.resource === 'organizations' ? [{ _admin_id: orgId, name: 'Team', created_at: '2024-01-01T00:00:00Z' }] : request.resource === 'users' ? [{ _admin_id: memberId, display_name: 'Morgan', role: 'member' }] : [], total: 1, page: 1, pageSize: 25, sort: 'created_at', direction: 'desc', filterFields: ['org_id'], sortFields: ['created_at'], redactedFields: [] };
  });
});
describe('organization admin workspace', () => {
  it('shows the join code and submits manual edits through confirmation', async () => {
    const user = userEvent.setup();
    render(<AdminOrganizationPage organizationId={orgId} refreshVersion={0} onBack={vi.fn()} onOpenReference={vi.fn()} />);
    expect(await screen.findByText('0012')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit settings' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Edit settings' }));
    await user.click(screen.getByRole('button', { name: 'Edit', exact: true }));
    await user.clear(screen.getByRole('textbox', { name: 'Join code' }));
    await user.type(screen.getByRole('textbox', { name: 'Join code' }), '0042');
    await user.click(screen.getByRole('button', { name: /Review changes/ }));
    expect(JSON.parse(screen.getByTestId('operation').textContent!)).toMatchObject({ resource: 'organizations', kind: 'update', ids: [orgId], values: { code: '0042' } });
  });
  it('reviews membership role changes without editing application access', async () => {
    const user = userEvent.setup();
    render(<AdminOrganizationPage organizationId={orgId} refreshVersion={0} onBack={vi.fn()} onOpenReference={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'People & owners', exact: true }));
    await user.click(await screen.findByText('Morgan'));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Organization role' }), 'owner');
    await user.click(screen.getByRole('button', { name: 'Save membership' }));
    expect(JSON.parse(screen.getByTestId('operation').textContent!)).toEqual({ resource: 'organizations', kind: 'set-member', ids: [orgId], values: { member_id: memberId, role: 'owner' } });
  });
  it('keeps a searched person selected for adding to the organization', async () => {
    const user = userEvent.setup();
    render(<AdminOrganizationPage organizationId={orgId} refreshVersion={0} onBack={vi.fn()} onOpenReference={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'People & owners', exact: true }));
    await user.type(screen.getByPlaceholderText('Search person by name…'), 'Morgan');
    await user.click(await screen.findByRole('button', { name: 'Morgan', exact: true }));
    expect(screen.getByPlaceholderText('Search person by name…')).toHaveValue('Morgan');
    expect(screen.getByRole('button', { name: 'Save membership' })).toBeEnabled();
  });
  it('scopes every content view to the selected organization and allows editable history', async () => {
    const user = userEvent.setup();
    render(<AdminOrganizationPage organizationId={orgId} refreshVersion={0} onBack={vi.fn()} onOpenReference={vi.fn()} />);
    for (const [label, resource] of [['Announcements', 'org-announcements'], ['Library', 'org-resources'], ['History', 'org-activity'], ['Shared links', 'quicklinks']]) {
      await user.click(screen.getByRole('button', { name: label, exact: true }));
      await waitFor(() => expect(loadAdminResource).toHaveBeenCalledWith(expect.objectContaining({ resource, filters: { org_id: orgId } })));
    }
  });
});

