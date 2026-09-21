import { useState } from 'react';
import { ArrowUpRight, FileText, Link2, Pencil, Pin, Search, Trash2 } from 'lucide-react';
import { EmptyState, displayDate } from './OrganizationUI';
import { RESOURCE_CATEGORIES, safeResourceUrl, useOrganizationActivity, type Announcement, type AnnouncementInput, type Resource, type ResourceInput } from './useOrganizationWorkspace';

export function AnnouncementCard({ item, author, canEdit, busy, onEdit, onPin, onDelete }: {
  item: Announcement; author: string; canEdit: boolean; busy: boolean;
  onEdit: () => void; onPin: () => void; onDelete: () => void;
}) {
  return <article className={`org-announcement ${item.pinned ? 'is-pinned' : ''}`}>
    <div className="org-row"><div className="org-meta">{item.pinned && <span className="org-pin"><Pin size={12} />Pinned</span>}<span>{author}</span><time dateTime={item.created_at}>{displayDate(item.created_at)}</time></div>
      {canEdit && <div className="org-actions"><button className="org-icon-button" disabled={busy} aria-label={`${item.pinned ? 'Unpin' : 'Pin'} ${item.title}`} onClick={onPin}><Pin size={14} /></button><button className="org-icon-button" aria-label={`Edit ${item.title}`} onClick={onEdit}><Pencil size={14} /></button><button className="org-icon-button" aria-label={`Delete ${item.title}`} onClick={onDelete}><Trash2 size={14} /></button></div>}
    </div>
    <h3>{item.title}</h3><p className="org-body">{item.body}</p>
  </article>;
}

export function AnnouncementEditor({ item, busy, onSave, onCancel }: { item?: Announcement; busy: boolean; onSave: (input: AnnouncementInput) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [body, setBody] = useState(item?.body ?? '');
  const [pinned, setPinned] = useState(item?.pinned ?? false);
  return <form className="org-form" onSubmit={event => { event.preventDefault(); if (title.trim() && body.trim()) onSave({ title, body, pinned }); }}>
    <label>Title<input className="org-field" required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} placeholder="What should the team know?" /></label>
    <label>Announcement<textarea className="org-field" required rows={7} maxLength={10000} value={body} onChange={e => setBody(e.target.value)} placeholder="Share an update, decision, or important reminder." /></label>
    <label className="org-checkbox"><input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />Pin to the top of announcements</label>
    <div className="org-form-footer"><button type="button" className="org-button" disabled={busy} onClick={onCancel}>Cancel</button><button className="org-button org-button-primary" disabled={busy || !title.trim() || !body.trim()}>{busy ? 'Saving…' : item ? 'Save announcement' : 'Publish announcement'}</button></div>
  </form>;
}

export function ResourceEditor({ item, busy, onSave, onCancel }: { item?: Resource; busy: boolean; onSave: (input: ResourceInput) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<ResourceInput>(item ?? { title: '', description: '', category: 'General', kind: 'link', url: '', content: '' });
  const update = (values: Partial<ResourceInput>) => setDraft(current => ({ ...current, ...values }));
  return <form className="org-form" onSubmit={event => { event.preventDefault(); if (draft.title.trim()) onSave(draft); }}>
    <div className="org-row"><label style={{ flex: 1 }}>Type<select className="org-field" value={draft.kind} onChange={e => update({ kind: e.target.value as Resource['kind'] })}><option value="link">Link</option><option value="note">Note or guide</option></select></label><label style={{ flex: 1 }}>Category<select className="org-field" value={draft.category} onChange={e => update({ category: e.target.value as Resource['category'] })}>{RESOURCE_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label></div>
    <label>Title<input className="org-field" required maxLength={160} value={draft.title} onChange={e => update({ title: e.target.value })} placeholder="Give this resource a clear name" /></label>
    <label>Description<textarea className="org-field" rows={2} maxLength={500} value={draft.description} onChange={e => update({ description: e.target.value })} placeholder="When should someone use this?" /></label>
    {draft.kind === 'link' ? <label>URL<input className="org-field" type="url" required maxLength={2048} value={draft.url ?? ''} onChange={e => update({ url: e.target.value })} placeholder="https://" /></label>
      : <label>Content<textarea className="org-field" required rows={9} maxLength={20000} value={draft.content} onChange={e => update({ content: e.target.value })} placeholder="Write a guide, checklist, or reusable reference." /></label>}
    <div className="org-form-footer"><button type="button" className="org-button" disabled={busy} onClick={onCancel}>Cancel</button><button className="org-button org-button-primary" disabled={busy || !draft.title.trim() || (draft.kind === 'note' && !draft.content.trim())}>{busy ? 'Saving…' : item ? 'Save resource' : 'Add resource'}</button></div>
  </form>;
}

export function ResourceLibrary({ items, userId, manager, onRead, onEdit, onDelete }: { items: Resource[]; userId?: string; manager: boolean; onRead: (item: Resource) => void; onEdit: (item: Resource) => void; onDelete: (item: Resource) => void }) {
  const [search, setSearch] = useState(''); const [category, setCategory] = useState('all');
  const filtered = items.filter(item => (category === 'all' || item.category === category) && `${item.title} ${item.description} ${item.content}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className="org-toolbar"><div className="org-search"><Search size={17} /><input className="org-field" aria-label="Search resources" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search the library…" /></div><select className="org-field" aria-label="Resource category" value={category} onChange={e => setCategory(e.target.value)}><option value="all">All categories</option>{RESOURCE_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></div>
    {!filtered.length ? <EmptyState title={items.length ? 'No matching resources' : 'Build your team’s bookshelf'}>{items.length ? 'Try another search or category.' : 'Add guides, useful tools, templates, and notes so everyone knows where to find them.'}</EmptyState> : <div className="org-resource-grid">{filtered.map(item => {
      const url = safeResourceUrl(item.url);
      return <article className="org-resource" key={item.id}><div className="org-row" style={{ width: '100%' }}><span className="org-resource-icon">{item.kind === 'link' ? <Link2 size={21} /> : <FileText size={21} />}</span><span className="org-meta">{item.category}</span></div>
        <h3>{item.title}</h3><p>{item.description || (item.kind === 'note' ? 'A shared note for your team.' : 'A useful link for your team.')}</p>
        <div className="org-resource-footer">{item.kind === 'note' ? <button className="org-text-button" onClick={() => onRead(item)}>Read note <ArrowUpRight size={14} /></button> : url ? <a className="org-text-button" href={url} target="_blank" rel="noopener noreferrer">Open resource <ArrowUpRight size={14} /></a> : <span className="org-meta">Link unavailable</span>}
          {(manager || item.created_by === userId) && <div className="org-actions"><button className="org-icon-button" aria-label={`Edit ${item.title}`} onClick={() => onEdit(item)}><Pencil size={14} /></button><button className="org-icon-button" aria-label={`Delete ${item.title}`} onClick={() => onDelete(item)}><Trash2 size={14} /></button></div>}</div>
      </article>;
    })}</div>}
  </>;
}

export function ActivityFeed({ orgId, revision, compact = false }: { orgId?: string; revision: number; compact?: boolean }) {
  const [category, setCategory] = useState('all');
  const feed = useOrganizationActivity(orgId, category, revision);
  return <>
    {!compact && <div className="org-toolbar"><select className="org-field" aria-label="Activity category" value={category} onChange={e => setCategory(e.target.value)}><option value="all">All activity</option>{['announcements','resources','people','settings','links','projects'].map(value => <option value={value} key={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select><button className="org-button" disabled={feed.loading} onClick={() => { void feed.refresh(); }}>Refresh activity</button></div>}
    {feed.error && <div role="alert" className="org-notice org-error">{feed.error} <button className="org-text-button" onClick={() => { void feed.refresh(); }}>Retry</button></div>}
    {!feed.error && !feed.loading && !feed.items.length && <EmptyState title="The next chapter starts here">New announcements, resources, team changes, shared links, and project updates will appear here.</EmptyState>}
    {(compact ? feed.items.slice(0, 5) : feed.items).map(item => <div className="org-activity" key={item.id}><span className="org-activity-dot" /><div><p>{item.category === 'people' ? <><strong>{item.subject}</strong> {item.action}</> : <><strong>{item.actor_name}</strong> {item.action} · <strong>{item.subject}</strong></>}</p><time dateTime={item.created_at} title={new Date(item.created_at).toLocaleString()}>{displayDate(item.created_at)} · {new Date(item.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time></div></div>)}
    {feed.loading && <p role="status" className="org-subtitle">Loading activity…</p>}
    {!compact && feed.more && <button className="org-button" disabled={feed.loading} onClick={feed.loadMore}>Load more activity</button>}
  </>;
}
