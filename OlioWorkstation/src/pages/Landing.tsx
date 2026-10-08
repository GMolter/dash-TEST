import { useEffect, useState, type MouseEvent } from 'react';
import { ArrowDown, ArrowRight, LayoutDashboard, Folder, Wrench, X, Menu, ListTodo } from 'lucide-react';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { FolderCard, QuicklinkCard, ShortcutCard } from '../components/DashboardCards';
import { BoardColumnView, type BoardCard, type BoardColumn } from '../components/BoardColumn';
import { UtilitiesHub } from '../components/UtilitiesHub';
import { TaskPanelContent } from '../components/DashboardTaskPanel';
import type { DashboardTodo } from '../hooks/useDashboardTodos';
import './Landing.css';

const views = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, title: 'Customize your dashboard', description: 'Arrange and resize cards, organize bookmarks into folders, and choose your background.' },
  { id: 'projects', label: 'Projects', icon: Folder, title: 'Manage projects with boards and planners', description: 'Track tasks through each stage, set priorities, and keep project files together.' },
  { id: 'utilities', label: 'Utilities', icon: Wrench, title: 'Use the tools built into Workstation', description: 'Shorten URLs, generate QR codes, share one-time messages, and save reusable text.' },
] as const;
type Preview = typeof views[number]['id'];
const tools = [
  { id: 'quicklinks', label: 'Quick Links', icon: '🔗', desc: 'Manage bookmarks' },
  { id: 'projects', label: 'Projects', icon: '📁', desc: 'Track your work' },
  { id: 'help', label: 'Help Center', icon: '📚', desc: 'Browse docs and guides' },
  { id: 'shortener', label: 'URL Shortener', icon: '✂️', desc: 'Shorten URLs' },
  { id: 'secrets', label: 'Secret Sharing', icon: '🔒', desc: 'One-time links' },
  { id: 'qr', label: 'QR Generator', icon: '📱', desc: 'Generate QR codes' },
  { id: 'quick-pastes', label: 'Quick Pastes', icon: '📋', desc: 'Manage private reusable text' },
  { id: 'pastebin', label: 'Pastebin', icon: '📝', desc: 'Share code/text' },
  { id: 'plugins', label: 'Plugins & Dashboard', icon: '🧩', desc: 'Install modules and customize Home' },
];
const sampleLinks = [
  { id: 'docs', title: 'Documentation', url: 'https://developer.mozilla.org', icon: '📚', order_index: 0 },
  { id: 'design', title: 'Figma', url: 'https://figma.com', icon: '🎨', order_index: 1 },
  { id: 'github', title: 'GitHub', url: 'https://github.com', icon: '💻', order_index: 2 },
];
const columns: BoardColumn[] = ['To Do', 'In Progress', 'Done'].map((name, i) => ({ id: String(i), name, project_id: 'example', position: i, archived: false, created_at: '', updated_at: '' }));
function sampleCard(id: string, title: string, column: string, priority: BoardCard['priority'] = 'none'): BoardCard {
  return { id, title, column_id: column, priority, project_id: 'example', description: '', due_date: null, assignee_name: 'Jamie', position: 0, archived: false, completed: column === '2', created_at: '', updated_at: '' };
}

function AccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    // Only session state is needed here; workspace/profile providers stay unmounted.
    void import('../lib/supabase').then(({ supabase }) => {
      if (!active) return;
      let revision = 0;
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        revision += 1;
        if (active) setSignedIn(Boolean(session));
      });
      unsubscribe = () => data.subscription.unsubscribe();
      const initialRevision = revision;
      void supabase.auth.getSession().then(({ data: sessionData }) => {
        if (active && revision === initialRevision) setSignedIn(Boolean(sessionData.session));
      }).catch(() => {});
    }).catch(() => {});
    return () => { active = false; unsubscribe?.(); };
  }, []);
  return <a className="landing-account" href="/">{signedIn ? 'Dashboard' : 'Log in'}<ArrowRight size={16} /></a>;
}

function DashboardPreview({ onSelect }: { onSelect: (view: Preview) => void }) {
  const [folderOpen, setFolderOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [todos, setTodos] = useState<DashboardTodo[]>([{ id: 'sample-task', user_id: 'example', title: 'Review the project brief', note: null, completed: false, sort_order: 0, completed_at: null, created_at: '', updated_at: '' }]);
  return <div className="landing-home">
    <div className="landing-home-controls">
      <button className="glass-control flex h-14 w-14 items-center justify-center" aria-label="Show utilities preview" onClick={() => onSelect('utilities')}><Menu className="h-6 w-6" /></button>
      <button className="glass-control flex h-14 items-center gap-3 px-5" onClick={() => setTasksOpen(!tasksOpen)} aria-expanded={tasksOpen}><ListTodo className="h-5 w-5 text-indigo-200" /><span className="text-sm">My Tasks</span><span className="rounded-full border border-indigo-300/20 bg-indigo-400/15 px-2 py-1 text-xs">{todos.filter(todo => !todo.completed).length}</span></button>
    </div>
    <div className="mx-auto max-w-4xl text-center">
      <h3 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">Olio Workstation</h3>
      <p className="mt-3 text-sm text-slate-300 sm:text-lg">Good morning<span className="mx-2 text-violet-400">•</span>Wed, Oct 7<span className="mx-2 text-violet-400">•</span><span className="font-mono text-slate-200">9:41:00 AM</span></p>
      <div className="mx-auto mt-4 h-px w-14 bg-gradient-to-r from-transparent via-violet-400 to-transparent shadow-[0_0_14px_rgba(139,92,246,0.9)]" />
    </div>
    {tasksOpen && <aside aria-label="Sample tasks" className="landing-task-drawer todo-drawer-open border-l border-slate-700/70 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
      <TaskPanelContent todos={todos} loading={false} syncing={false} error={null} mobile={false} onClose={() => setTasksOpen(false)}
        onAddTodo={async (title, note) => { setTodos(previous => [...previous, { id: crypto.randomUUID(), user_id: 'example', title, note: note || null, completed: false, sort_order: previous.length, completed_at: null, created_at: '', updated_at: '' }]); return true; }}
        onSaveTodo={async (id, updates) => { setTodos(previous => previous.map(todo => todo.id === id ? { ...todo, ...updates } : todo)); return true; }}
        onToggleTodo={async id => { setTodos(previous => previous.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo)); return true; }}
        onDeleteTodo={async id => { setTodos(previous => previous.filter(todo => todo.id !== id)); return true; }}
        onMoveTodo={async (id, direction) => { setTodos(previous => { const ordered = [...previous].sort((a, b) => a.sort_order - b.sort_order); const index = ordered.findIndex(todo => todo.id === id); const next = index + (direction === 'up' ? -1 : 1); if (next < 0 || next >= ordered.length) return previous; [ordered[index], ordered[next]] = [ordered[next], ordered[index]]; return ordered.map((todo, i) => ({ ...todo, sort_order: i })); }); return true; }} />
    </aside>}
    <div className="landing-home-cards">
      <FolderCard folder={{ id: 'resources', name: 'Resources', icon: 'folder', order_index: 0 }} linkCount={3} onOpen={() => setFolderOpen(!folderOpen)} />
      {sampleLinks.map(link => <QuicklinkCard key={link.id} link={link} />)}
      <ShortcutCard shortcut="utilities" onNavigate={() => onSelect('utilities')} onOpenTool={() => onSelect('utilities')} />
    </div>
    {folderOpen && <section className="glass-panel mt-5 rounded-[2rem] p-5" aria-label="Resources folder"><div className="mb-4 flex justify-between"><h4 className="font-semibold">Resources</h4><button onClick={() => setFolderOpen(false)} aria-label="Close folder"><X size={18} /></button></div><div className="grid grid-cols-3 gap-3">{sampleLinks.map(link => <QuicklinkCard key={link.id} link={link} />)}</div></section>}
  </div>;
}

function BoardPreview() {
  const [cards, setCards] = useState(() => [sampleCard('one', 'Write the project brief', '0', 'medium'), sampleCard('two', 'Review page layouts', '1', 'high'), sampleCard('three', 'Collect requirements', '2')]);
  const [dragged, setDragged] = useState<string | null>(null);
  const [selected, setSelected] = useState<BoardCard | null>(null);
  return <div className="landing-project">
    <div className="mb-6"><p className="text-sm text-slate-400">Projects / Website refresh</p><h3 className="mt-2 text-2xl font-semibold">Website refresh</h3></div>
    <div className="rounded-3xl border border-slate-800/60 bg-slate-950/35 p-4 backdrop-blur sm:p-6">
      <div className="mb-6"><div className="text-2xl font-semibold">Board</div><div className="text-slate-300">Organize tasks across columns</div></div>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
        {columns.map(column => <BoardColumnView key={column.id} column={column} cards={cards.filter(card => card.column_id === column.id)} highlightCardId={null}
          onCreateCard={(id, title) => setCards(previous => [...previous, sampleCard(crypto.randomUUID(), title, id)])}
          onDragStart={setDragged} onDragOver={event => event.preventDefault()}
          onDrop={id => { setCards(previous => previous.map(card => card.id === dragged ? { ...card, column_id: id, completed: id === '2' } : card)); setDragged(null); }}
          onCardClick={setSelected} />)}
      </div>
      {selected && <div className="mt-4 rounded-xl border border-slate-700 p-4"><div className="flex justify-between gap-4"><strong>{selected.title}</strong><button aria-label="Close task details" onClick={() => setSelected(null)}><X size={18} /></button></div><p className="mt-2 text-sm text-slate-400">Assigned to {selected.assignee_name}. Priority: {selected.priority}.</p><label className="mt-3 flex items-center gap-2 text-sm">Move to<select className="rounded-lg border border-slate-700 bg-slate-900 p-2" value={selected.column_id} onChange={event => { const updated = { ...selected, column_id: event.target.value, completed: event.target.value === '2' }; setSelected(updated); setCards(previous => previous.map(card => card.id === updated.id ? updated : card)); }}>{columns.map(column => <option key={column.id} value={column.id}>{column.name}</option>)}</select></label></div>}
    </div>
  </div>;
}

export default function Landing() {
  const [preview, setPreview] = useState<Preview>('dashboard');
  const [tool, setTool] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const activeView = views.find(view => view.id === preview)!;
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Olio Workstation — Dashboard, projects, and utilities';
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(media.matches);
    media.addEventListener('change', update);
    return () => { document.title = previousTitle; media.removeEventListener('change', update); };
  }, []);
  const scrollToTour = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById('workspace')?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', '#workspace');
  };
  return <div className="landing-page">
    <a href="#main" className="landing-skip">Skip to content</a>
    <header className="landing-header landing-container">
      <a className="landing-brand" href="/landing"><LayoutDashboard size={23} /><span>olio<span className="text-violet-400">.</span></span><span className="landing-product">Workstation</span></a>
      <AccountLink />
    </header>
    <main id="main">
      <section className="landing-hero landing-container">
        <div className="landing-ambient" aria-hidden="true"><span /><span /></div>
        <p className="landing-eyebrow">OLIO WORKSTATION</p>
        <h1>Your dashboard.<br /><span>Your projects and tools.</span></h1>
        <p className="landing-summary">Organize your bookmarks, manage projects, and use everyday utilities in a workspace you can customize.</p>
        <a href="#workspace" className="landing-tour-button" onClick={scrollToTour}>Take a look around <ArrowDown size={18} /></a>
      </section>
      <section id="workspace" className="landing-tour landing-container" aria-labelledby="tour-title">
        <div className="landing-tour-heading"><h2 id="tour-title">Inside Workstation</h2><span>Interactive preview · Sample data</span></div>
        <div className="landing-tabs" role="group" aria-label="Choose a preview">{views.map(({ id, label, icon: Icon }, index) => <button key={id} className={preview === id ? 'active' : ''} aria-pressed={preview === id} aria-controls="landing-screen" onClick={() => { setPreview(id); setTool(null); }}><span className="landing-tab-number">0{index + 1}</span><Icon size={17} />{label}</button>)}</div>
        <div className="landing-screen" id="landing-screen" aria-label={`${activeView.label} preview`}>
          <div className="landing-screen-background" aria-hidden="true">{!reduceMotion && <AnimatedBackground fixed={false} theme="dynamic-waves" preset="indigo" />}</div>
          <div key={preview} className="landing-screen-content">
            {preview === 'dashboard' && <DashboardPreview onSelect={setPreview} />}
            {preview === 'projects' && <BoardPreview />}
            {preview === 'utilities' && <div className="landing-utilities"><UtilitiesHub tools={tools} persistPreferences={false} onOpenTool={id => { if (id === 'projects') setPreview('projects'); else if (id === 'quicklinks') setPreview('dashboard'); else setTool(id); }} />{tool && <div role="status" className="glass-panel mt-5 rounded-2xl p-5"><div className="flex items-center justify-between gap-4"><strong>{tools.find(item => item.id === tool)?.label}</strong><button aria-label="Close tool description" onClick={() => setTool(null)}><X size={18} /></button></div><p className="mt-2 text-sm text-slate-300">{tools.find(item => item.id === tool)?.desc}. Available in your Workstation account.</p></div>}</div>}
          </div>
        </div>
        <div className="landing-description" aria-live="polite"><div><h3>{activeView.title}</h3><p>{activeView.description}</p></div><span>{preview === 'dashboard' ? 'Open a folder or try My Tasks.' : preview === 'projects' ? 'Add a task or move a card between columns.' : 'Toggle descriptions to see what each tool does.'} Changes here are not saved.</span></div>
      </section>
    </main>
    <footer className="landing-footer landing-container"><span>Olio Workstation</span><a href="/help">Help Center <ArrowRight size={14} /></a></footer>
  </div>;
}
