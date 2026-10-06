export const workspaceGroups = ['projects', 'content', 'utilities'];
export const adminSection = (group: string) => workspaceGroups.includes(group) ? 'workspace' : group;
export const resourceInSection = (group: string, section: string) => adminSection(group) === adminSection(section);
export function defaultAdminResource(section: string) {
  return ({ workspace: 'projects', projects: 'projects', content: 'pastes', utilities: 'quicklinks', organizations: 'organizations', integrations: 'plugin-installations', platform: 'help-articles', audit: 'audit-log', reviews: 'admin-access-requests' } as Record<string, string>)[section] || 'users';
}
