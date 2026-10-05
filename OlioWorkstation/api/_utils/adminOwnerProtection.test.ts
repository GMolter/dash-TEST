import { expect, it } from 'vitest';
import { protectedOwnerRows } from './adminOwnerProtection';
import { ADMIN_RESOURCES } from './adminResources';

const service = {
  from(table: string) {
    const query = {
      select: () => query,
      eq: () => query,
      in: async (_key: string, ids: string[]) => ({ data: table === 'profiles'
        ? ids.filter(id => id === 'owner').map(id => ({ id }))
        : ids.map(id => ({ id, user_id: id === 'owner-project' ? 'owner' : 'member' })) }),
    };
    return query;
  },
};

it('protects owners from administrators who are not app owners', async () => {
  expect(await protectedOwnerRows(service, ADMIN_RESOURCES.users, [{ id: 'owner' }, { id: 'member' }])).toEqual([true, false]);
});
it('protects owner content and reassignment to an owner', async () => {
  expect(await protectedOwnerRows(service, ADMIN_RESOURCES.pastes, [{ user_id: 'owner' }, { user_id: 'member' }])).toEqual([true, false]);
});
it('protects child records of an owner’s project', async () => {
  expect(await protectedOwnerRows(service, ADMIN_RESOURCES['project-files'], [{ project_id: 'owner-project' }, { project_id: 'member-project' }])).toEqual([true, false]);
});
it('fails closed if the protection lookup fails', async () => {
  const broken = { from() { const query = { select: () => query, eq: () => query, in: async () => ({ error: new Error('unavailable') }) }; return query; } };
  await expect(protectedOwnerRows(broken, ADMIN_RESOURCES.users, [{ id: 'owner' }])).rejects.toThrow('unavailable');
});

it('allows verified app owners to access owner profiles, content, and project records', async () => {
  const noLookup = { from() { throw new Error('An owner does not need a protection lookup'); } };
  for (const [resource, row] of [
    [ADMIN_RESOURCES.users, { id: 'owner', app_owner: true }],
    [ADMIN_RESOURCES.pastes, { user_id: 'owner' }],
    [ADMIN_RESOURCES['project-files'], { project_id: 'owner-project' }],
  ] as const) {
    expect(await protectedOwnerRows(noLookup, resource, [row], true)).toEqual([false]);
  }
});
