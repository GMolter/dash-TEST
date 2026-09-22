import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowRight, BookOpen, Building2, Copy, Crown, LayoutDashboard, Megaphone, Plus, RefreshCw, Search, Settings, Users } from 'lucide-react';
import { useOrg } from '../hooks/useOrg';
import { Quicklinks } from '../components/Quicklinks';
import { ActivityFeed, AnnouncementCard, AnnouncementEditor, ResourceEditor, ResourceLibrary } from '../features/organization/OrganizationContent';
import { EmptyState, OrganizationModal, RoleBadge } from '../features/organization/OrganizationUI';
import { errorMessage, useOrganizationWorkspace, type Announcement, type Resource } from '../features/organization/useOrganizationWorkspace';
import '../features/organization/organization.css';

type Tab = 'overview' | 'announcements' | 'activity' | 'resources' | 'people' | 'admin';
type Member = ReturnType<typeof useOrg>['members'][number];
type Dialog = { kind: 'announcement'; item?: Announcement } | { kind: 'resource'; item?: Resource } | { kind: 'read'; item: Resource }
  | { kind: 'member'; member: Member } | { kind: 'delete-org' }
  | { kind: 'confirm'; title: string; description: string; label: string; action: () => Promise<unknown> };
const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'activity', label: 'Activity', icon: Activity }, { id: 'resources', label: 'Resources', icon: BookOpen },
  { id: 'people', label: 'People', icon: Users }, { id: 'admin', label: 'Admin', icon: Settings },
] as const;

// A separate keyed workspace drops open editors and cached content on an organization switch.
export function OrganizationPage() {
  const { organization } = useOrg();
  return organization ? <OrganizationWorkspace key={organization.id} /> : <div className="org-workspace"><EmptyState title="No organization selected">Join or create an organization to work with your team.</EmptyState></div>;
}

function OrganizationWorkspace() {
  const org = useOrg();
  const { organization, profile, members } = org;
  const workspace = useOrganizationWorkspace(organization?.id);
  const [tab, setTab] = useState<Tab>('overview');
  const [resourceTab, setResourceTab] = useState<'library' | 'links'>('library');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [editName, setEditName] = useState(organization?.name ?? '');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const owner = profile?.role === 'owner';
  const manager = owner || profile?.role === 'admin';
  const ownerCount = members.filter(member => member.role === 'owner').length;
  useEffect(() => { setEditName(organization?.name ?? ''); }, [organization?.name]);
  // A role refresh immediately removes management actions, including an open editor.
  useEffect(() => {
    if (!manager && (dialog?.kind === 'announcement' || dialog?.kind === 'member')) setDialog(null);
    if (!owner && dialog?.kind === 'delete-org') setDialog(null);
  }, [manager, owner, dialog]);
  if (!organization) return null;
  const activeTab = tab === 'admin' && !manager ? 'overview' : tab;
  const open = (next: Dialog) => { setError(''); setDialog(next); };
  const close = () => { if (!lock.current) { setDialog(null); setError(''); } };
  const run = async (action: () => Promise<unknown>, message: string, closeAfter = false) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await action();
      if (result && typeof result === 'object' && 'success' in result && !result.success) throw new Error('error' in result ? String(result.error) : 'Could not complete this action.');
      if (closeAfter) setDialog(null);
      setNotice(message); setRevision(value => value + 1);
    } catch (err) { setError(errorMessage(err)); }
    finally { lock.current = false; setBusy(false); }
  };
  const confirm = (title: string, description: string, label: string, action: () => Promise<unknown>) => open({ kind: 'confirm', title, description, label, action });
  const authorName = (id: string | null) => members.find(member => member.id === id)?.display_name || 'A teammate';
  const copyCode = () => { void run(async () => { await navigator.clipboard.writeText(organization.code); }, 'Invite code copied.'); };
  const renderAnnouncement = (item: Announcement) => <AnnouncementCard key={item.id} item={item} author={authorName(item.created_by)} canEdit={manager} busy={busy}
    onEdit={() => open({ kind: 'announcement', item })}
    onPin={() => { void run(() => workspace.saveAnnouncement({ ...item, pinned: !item.pinned }, item.id), item.pinned ? 'Announcement unpinned.' : 'Announcement pinned.'); }}
    onDelete={() => confirm('Delete announcement', `Delete “${item.title}”? This cannot be undone.`, 'Delete announcement', () => workspace.remove('org_announcements', item.id))} />;
  const filteredAnnouncements = workspace.announcements.filter(item => `${item.title} ${item.body}`.toLowerCase().includes(announcementSearch.toLowerCase()));
  const filteredMembers = members.filter(member => `${member.display_name ?? ''} ${member.email ?? ''} ${member.role}`.toLowerCase().includes(peopleSearch.toLowerCase()))
    .sort((a, b) => ['owner','admin','member'].indexOf(a.role) - ['owner','admin','member'].indexOf(b.role) || (a.display_name ?? '').localeCompare(b.display_name ?? ''));
  const invitePanel = <section className="org-panel"><div className="org-section-heading"><h2>Better together</h2><Users size={18} className="text-violet-300" /></div><p className="org-subtitle">Give this code to a teammate to invite them into your organization.</p><strong className="org-invite-code">{organization.code}</strong><button className="org-button" onClick={copyCode} disabled={busy}><Copy size={15} />Copy invite code</button></section>;

  return <div className="org-workspace">
    <header className="org-hero"><div className="org-hero-top"><div><div className="org-eyebrow"><Building2 size={14} />Your shared workspace</div><h1>{organization.name}</h1><p>A place for your people, knowledge, and what’s happening next.</p></div><div className="org-hero-right"><div className="org-actions"><RoleBadge role={profile?.role ?? 'member'} /><button className="org-icon-button" aria-label="Refresh organization" disabled={busy || workspace.loading} onClick={() => { void run(async () => { await Promise.all([workspace.refresh(), org.refreshOrg({ silent: true })]); }, 'Workspace refreshed.'); }}><RefreshCw size={16} /></button></div><button className="org-header-code" aria-label="Copy join code" onClick={copyCode} disabled={busy}><span>Join code</span><strong>{organization.code}</strong><span><Copy size={13} /> Click to copy</span></button></div></div>
      <div className="org-stats"><span><strong>{members.length}</strong>{members.length === 1 ? 'person' : 'people'}</span><span><strong>{ownerCount}</strong>{ownerCount === 1 ? 'owner' : 'owners'}</span><span><strong>{workspace.loading ? '—' : workspace.announcements.length}</strong>announcements</span><span><strong>{workspace.loading ? '—' : workspace.resources.length}</strong>resources</span></div>
    </header>
    <nav className="org-nav" aria-label="Organization sections">{tabs.filter(item => item.id !== 'admin' || manager).map(item => <button key={item.id} aria-current={activeTab === item.id ? 'page' : undefined} onClick={() => { setTab(item.id); setError(''); }}><item.icon size={16} />{item.label}</button>)}</nav>
    {notice && <div role="status" className="org-notice">{notice}</div>}
    {error && !dialog && <div role="alert" className="org-notice org-error">{error}</div>}
    {workspace.error && <div role="alert" className="org-notice org-error">Could not load the workspace. {workspace.error} <button className="org-text-button" onClick={() => { void workspace.refresh(); }}>Try again</button></div>}
    {workspace.loading && <p role="status" className="org-subtitle mb-4">Loading workspace…</p>}

    {activeTab === 'overview' && <div className="org-grid"><div className="org-stack"><section className="org-panel"><div className="org-section-heading"><h2>On the team’s radar</h2>{manager ? <button className="org-text-button" onClick={() => open({ kind: 'announcement' })}><Plus size={14} />New announcement</button> : <Megaphone size={19} className="text-violet-300" />}</div>
      {workspace.announcements.slice(0,3).map(renderAnnouncement)}{!workspace.loading && !workspace.announcements.length && <EmptyState title="Keep everyone in the loop">Announcements from your owners and admins will appear here.</EmptyState>}
      {!!workspace.announcements.length && <button className="org-text-button mt-5" onClick={() => setTab('announcements')}>All announcements <ArrowRight size={14} /></button>}
    </section><section className="org-panel"><div className="org-section-heading"><h2>Recently in your organization</h2><button className="org-text-button" onClick={() => setTab('activity')}>View activity <ArrowRight size={14} /></button></div><ActivityFeed orgId={organization.id} revision={revision} compact /></section></div>
    <aside className="org-stack">{invitePanel}<section className="org-panel"><div className="org-section-heading"><h2>Your team’s knowledge</h2><BookOpen size={18} className="text-violet-300" /></div><p className="org-subtitle">Guides, references, and tools. Find what you need, or leave something useful for the next person.</p><button className="org-button mt-5" onClick={() => setTab('resources')}>Explore resources <ArrowRight size={15} /></button></section>
      <section className="org-panel"><div className="org-section-heading"><h2>The people behind it</h2><button className="org-text-button" onClick={() => setTab('people')}>View all</button></div>{members.slice(0,4).map(member => <div className="org-member" key={member.id}><span className="org-avatar">{(member.display_name || 'T').slice(0,2).toUpperCase()}</span><div className="org-member-info"><strong>{member.display_name || 'Teammate'}</strong></div><RoleBadge role={member.role} /></div>)}</section>
    </aside></div>}

    {activeTab === 'announcements' && <section className="org-panel"><div className="org-section-heading"><div><h2>Announcements</h2><p className="org-subtitle">The updates everyone should know. Pinned posts stay at the top.</p></div>{manager && <button className="org-button org-button-primary" onClick={() => open({ kind: 'announcement' })}><Plus size={16} />New announcement</button>}</div>
      <div className="org-toolbar"><div className="org-search"><Search size={17} /><input className="org-field" aria-label="Search announcements" placeholder="Search announcements…" value={announcementSearch} onChange={e => setAnnouncementSearch(e.target.value)} /></div></div>
      {filteredAnnouncements.map(renderAnnouncement)}{!workspace.loading && !filteredAnnouncements.length && <EmptyState title={announcementSearch ? 'No matching announcements' : 'Nothing announced just yet'}>{announcementSearch ? 'Try a different search.' : 'Share the next update with your team.'}</EmptyState>}
    </section>}

    {activeTab === 'activity' && <section className="org-panel"><div className="org-section-heading"><div><h2>Activity</h2><p className="org-subtitle">A shared record of announcements, resources, people, links, and projects.</p></div></div><ActivityFeed orgId={organization.id} revision={revision} /></section>}

    {activeTab === 'resources' && <section><div className="org-section-heading"><div><h2>Resource library</h2><p className="org-subtitle">Useful knowledge, in one place. Curated by your team.</p></div>{resourceTab === 'library' && <button className="org-button org-button-primary" onClick={() => open({ kind: 'resource' })}><Plus size={16} />Add resource</button>}</div>
      <div className="org-subnav"><button className="org-button" aria-pressed={resourceTab === 'library'} onClick={() => setResourceTab('library')}>Library</button><button className="org-button" aria-pressed={resourceTab === 'links'} onClick={() => setResourceTab('links')}>Shared links</button></div>
      {resourceTab === 'links' ? <div className="org-panel"><Quicklinks editMode collection="shared" /></div> : <ResourceLibrary items={workspace.resources} userId={profile?.id} manager={manager} onRead={item => open({ kind: 'read', item })} onEdit={item => open({ kind: 'resource', item })} onDelete={item => confirm('Delete resource', `Delete “${item.title}” from the library? This cannot be undone.`, 'Delete resource', () => workspace.remove('org_resources', item.id))} />}
    </section>}

    {activeTab === 'people' && <div className="org-grid"><section className="org-panel"><div className="org-section-heading"><div><h2>People <span className="org-meta inline">({members.length})</span></h2><p className="org-subtitle">Everyone who makes this organization yours.</p></div></div><div className="org-search mb-4"><Search size={17} /><input className="org-field" aria-label="Search people" placeholder="Search by name, email, or role…" value={peopleSearch} onChange={e => setPeopleSearch(e.target.value)} /></div>
      {filteredMembers.map(member => <div className="org-member" key={member.id}><span className="org-avatar">{(member.display_name || 'T').slice(0,2).toUpperCase()}</span><div className="org-member-info"><strong>{member.display_name || 'Teammate'}{member.id === profile?.id ? ' (you)' : ''}</strong><p>{member.email}</p></div><RoleBadge role={member.role} />{(owner || (manager && member.role === 'member')) && <button className="org-button" aria-label={`Manage ${member.display_name || member.email || 'teammate'}`} onClick={() => open({ kind: 'member', member })}>Manage</button>}</div>)}
      {!filteredMembers.length && <EmptyState title="No matching people">Try a different name or role.</EmptyState>}
    </section><aside className="org-stack">{invitePanel}<section className="org-panel"><div className="org-section-heading"><h2>Shared ownership</h2><Crown size={18} className="text-amber-300" /></div><p className="org-subtitle">An organization can have several owners. Owners manage roles, transfer ownership, and delete the organization. At least one owner must remain.</p>{owner && <p className="org-subtitle mt-3">Choose Manage beside a teammate to add an owner or transfer your ownership.</p>}</section></aside></div>}

    {activeTab === 'admin' && manager && <div className="org-grid"><div className="org-stack"><section className="org-panel"><div className="org-section-heading"><div><h2>Organization settings</h2><p className="org-subtitle">The basics that make this space your team’s.</p></div></div><form className="org-form" onSubmit={e => { e.preventDefault(); if (editName.trim()) void run(() => org.updateOrg({ name: editName.trim() }), 'Organization name updated.'); }}><label>Organization name<input className="org-field" required maxLength={100} value={editName} onChange={e => setEditName(e.target.value)} /></label><div><button className="org-button org-button-primary" disabled={busy || !editName.trim() || editName.trim() === organization.name}>Save changes</button></div></form></section>
      <section className="org-panel"><div className="org-section-heading"><h2>Invite access</h2></div><p className="org-subtitle">Regenerate the invite code to stop people using the old one. Current members keep their access.</p><button className="org-button mt-5" disabled={busy} onClick={() => confirm('Regenerate invite code', 'The current code will stop working. Share the new code with anyone who still needs to join.', 'Regenerate code', () => org.regenerateCode())}><RefreshCw size={15} />Regenerate code</button></section>
      {owner && <section className="org-panel org-danger"><div className="org-section-heading"><h2>Delete Organization</h2></div><p className="org-subtitle">Permanently delete this organization and its data, and remove all members. This cannot be undone.</p><button className="org-button org-button-danger mt-5" onClick={() => open({ kind: 'delete-org' })}>Delete Organization</button></section>}
    </div><aside className="org-stack"><section className="org-panel"><div className="org-section-heading"><h2>Roles & ownership</h2><Users size={18} /></div><p className="org-subtitle">Manage your team’s access from People. {owner ? 'Add more owners, change roles, or hand off your ownership.' : 'Promote members to admin or remove members from the organization.'}</p><button className="org-button mt-5" onClick={() => setTab('people')}>Manage people <ArrowRight size={15} /></button></section>{invitePanel}</aside></div>}

    {dialog && <OrganizationModal title={dialog.kind === 'announcement' ? dialog.item ? 'Edit announcement' : 'New announcement' : dialog.kind === 'resource' ? dialog.item ? 'Edit resource' : 'Add resource' : dialog.kind === 'read' ? dialog.item.title : dialog.kind === 'member' ? `Manage ${dialog.member.display_name || 'teammate'}` : dialog.kind === 'delete-org' ? 'Delete Organization' : dialog.title} busy={busy} onClose={close}>
      {error && <div role="alert" className="org-notice org-error">{error}</div>}
      {dialog.kind === 'announcement' && manager && <AnnouncementEditor item={dialog.item} busy={busy} onCancel={close} onSave={input => { void run(() => workspace.saveAnnouncement(input, dialog.item?.id), 'Announcement saved.', true); }} />}
      {dialog.kind === 'resource' && <ResourceEditor item={dialog.item} busy={busy} onCancel={close} onSave={input => { void run(() => workspace.saveResource(input, dialog.item?.id), 'Resource saved.', true); }} />}
      {dialog.kind === 'read' && <><p className="org-meta mb-4">{dialog.item.category} · {authorName(dialog.item.created_by)}</p>{dialog.item.description && <p className="org-subtitle mb-5">{dialog.item.description}</p>}<div className="org-body">{dialog.item.content}</div></>}
      {dialog.kind === 'member' && <MemberActions member={members.find(member => member.id === dialog.member.id) ?? dialog.member} owner={owner} ownerCount={ownerCount} self={dialog.member.id === profile?.id} busy={busy}
        onRole={role => confirm(role === 'owner' ? 'Add an owner' : 'Change role', role === 'owner' ? `${dialog.member.display_name || 'This teammate'} will have full ownership, including the ability to manage other owners and delete the organization. You will remain an owner.` : `Change ${dialog.member.display_name || 'this teammate'} to ${role}?`, role === 'owner' ? 'Add owner' : 'Change role', () => org.updateMemberRole(dialog.member.id, role))}
        onTransfer={() => confirm('Transfer your ownership', `${dialog.member.display_name || 'This teammate'} will become an owner. You will become an admin and lose the ability to manage owners or delete the organization. Other owners will keep their roles.`, 'Transfer ownership', () => org.transferOwnership(dialog.member.id))}
        onRemove={() => confirm('Remove teammate', `Remove ${dialog.member.display_name || 'this teammate'} from the organization? They will lose access to shared resources.`, 'Remove teammate', () => org.removeMember(dialog.member.id))} />}
      {dialog.kind === 'confirm' && <><p className="org-subtitle">{dialog.description}</p><div className="org-form-footer"><button className="org-button" disabled={busy} onClick={close}>Cancel</button><button className="org-button org-button-primary" disabled={busy} onClick={() => { void run(dialog.action, 'Change saved.', true); }}>{busy ? 'Saving…' : dialog.label}</button></div></>}
      {dialog.kind === 'delete-org' && owner && <DeleteOrganization name={organization.name} busy={busy} onCancel={close} onDelete={() => { void run(org.deleteOrg, 'Organization deleted.', true); }} />}
    </OrganizationModal>}
  </div>;
}

function MemberActions({ member, owner, ownerCount, self, busy, onRole, onTransfer, onRemove }: { member: Member; owner: boolean; ownerCount: number; self: boolean; busy: boolean; onRole: (role: Member['role']) => void; onTransfer: () => void; onRemove: () => void }) {
  const lastOwner = member.role === 'owner' && ownerCount <= 1;
  return <div className="org-stack"><div className="org-row"><p className="org-subtitle">{member.email}</p><RoleBadge role={member.role} /></div>
    {lastOwner && <div className="org-notice">This is the last owner. Add another owner or transfer ownership before changing this role.</div>}
    <div className="org-actions">{member.role === 'member' && <button className="org-button" disabled={busy} onClick={() => onRole('admin')}>Make admin</button>}
      {owner && member.role !== 'owner' && <button className="org-button org-button-primary" disabled={busy} onClick={() => onRole('owner')}><Crown size={15} />Add as owner</button>}
      {owner && member.role === 'owner' && <button className="org-button" disabled={busy || lastOwner} onClick={() => onRole('admin')}>Change to admin</button>}
      {owner && member.role !== 'member' && <button className="org-button" disabled={busy || lastOwner} onClick={() => onRole('member')}>Change to member</button>}
    </div>
    {owner && !self && <div><h3 className="font-semibold mb-2">Hand off your ownership</h3><p className="org-subtitle mb-4">Make this teammate an owner and continue as an admin.</p><button className="org-button" disabled={busy} onClick={onTransfer}>Transfer my ownership</button></div>}
    {!self && <div className="org-form-footer"><button className="org-button org-button-danger" disabled={busy || lastOwner} onClick={onRemove}>Remove teammate</button></div>}
  </div>;
}
function DeleteOrganization({ name, busy, onCancel, onDelete }: { name: string; busy: boolean; onCancel: () => void; onDelete: () => void }) {
  const [confirmed, setConfirmed] = useState(false); const [typed, setTyped] = useState('');
  return <form className="org-form" onSubmit={e => { e.preventDefault(); if (confirmed && typed === name && !busy) onDelete(); }}>
    <label className="org-checkbox"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I understand this will permanently delete the organization and its data and remove all members.</label>
    <label>Type {name} to confirm<input className="org-field" aria-label="Organization name to confirm deletion" value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" /></label>
    <div className="org-form-footer"><button type="button" className="org-button" disabled={busy} onClick={onCancel}>Cancel</button><button className="org-button org-button-danger" disabled={busy || !confirmed || typed !== name}>{busy ? 'Deleting...' : 'Delete'}</button></div>
  </form>;
}
