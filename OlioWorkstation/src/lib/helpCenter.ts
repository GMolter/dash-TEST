export type HelpSummary = { id: string; slug: string; title: string; summary?: string; updated_at?: string };
export const helpTopics = [
  { id: 'start', name: 'Getting started', description: 'Your account and your first workspace.', slugs: ['getting-started', 'organizations', 'utilities-hub'] },
  { id: 'everyday', name: 'Everyday tools', description: 'A little less searching. A little more doing.', slugs: ['home-dashboard', 'quick-links', 'my-tasks', 'quick-pastes', 'olio-launcher'] },
  { id: 'projects', name: 'Projects', description: 'From the first idea to the final task.', slugs: ['projects-center', 'project-overview', 'project-board', 'project-planner', 'project-files', 'project-resources'] },
  { id: 'sharing', name: 'Links & sharing', description: 'Get the right information to the right people.', slugs: ['url-shortener', 'secret-sharing', 'qr-code-generator', 'pastebin', 'public-pages'] },
  { id: 'settings', name: 'Your workspace', description: 'Team settings, personal touches, and plugins.', slugs: ['organization-management', 'profile-and-settings', 'plugins-and-classdash'] },
];
export function topicFor(slug: string) { return helpTopics.find(topic => topic.slugs.includes(slug)); }
export function articleHref(slug: string) { return `/help/article/${encodeURIComponent(slug)}`; }
