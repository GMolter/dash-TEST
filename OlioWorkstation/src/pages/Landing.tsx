import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight, Clipboard, Code2, FileText, Folder, Grip, LayoutDashboard, Link2, ListTodo, LockKeyhole, Plus, QrCode, SlidersHorizontal, Sparkles, Users, Wrench } from 'lucide-react';
import './Landing.css';

const views = [
  { id: 'dashboard', label: 'Your dashboard', icon: LayoutDashboard, caption: 'A home for the way you work.', detail: 'Your links, tasks, and favorite tools, arranged your way.' },
  { id: 'projects', label: 'Your projects', icon: Folder, caption: 'Big ideas. Clear next steps.', detail: 'Bring your plans, boards, and files into one project workspace.' },
  { id: 'tools', label: 'Your everyday tools', icon: Wrench, caption: 'Small tools. Less friction.', detail: 'Shorten a link, share a snippet, or keep useful text close at hand.' },
] as const;
type Preview = typeof views[number]['id'];

const utilities = [
  { icon: Link2, name: 'URL Shortener', text: 'Long links, made simple.', color: 'violet' },
  { icon: LockKeyhole, name: 'Secret Sharing', text: 'Messages with a one-time reveal.', color: 'green' },
  { icon: QrCode, name: 'QR Generator', text: 'From a link to a quick scan.', color: 'blue' },
  { icon: Clipboard, name: 'Quick Pastes', text: 'Your reusable text, kept private.', color: 'peach' },
  { icon: Code2, name: 'Pastebin', text: 'Give your text and code a link.', color: 'pink' },
  { icon: Link2, name: 'Quick Links', text: 'Your go-to places, together.', color: 'violet' },
];

function Brand() {
  return <span className="lp-brand"><span className="lp-brand-icon"><LayoutDashboard size={20} /></span><span>olio<span className="lp-brand-dot">.</span></span></span>;
}

function DashboardDemo() {
  const [completed, setCompleted] = useState([false, false, true]);
  return <div className="lp-dashboard-grid">
    <section className="lp-demo-card lp-links-card">
      <div className="lp-card-heading"><span><Link2 size={15} /> Quick Links</span><Grip size={15} /></div>
      <div className="lp-bookmarks">{[{ name: 'Design files', icon: Folder, color: 'violet' }, { name: 'Team resources', icon: Users, color: 'blue' }, { name: 'Project notes', icon: FileText, color: 'peach' }, { name: 'Inspiration', icon: Sparkles, color: 'pink' }].map(({ name, icon: Icon, color }) => <div key={name}><span className={`lp-icon ${color}`}><Icon size={20} /></span><span>{name}</span></div>)}</div>
      <div className="lp-demo-folder"><Folder size={16} /><span>Everything for your next big idea</span><ChevronRight size={15} /></div>
    </section>
    <section className="lp-demo-card lp-tasks-card">
      <div className="lp-card-heading"><span><ListTodo size={15} /> My Tasks</span><span className="lp-count">{completed.filter(Boolean).length}/3</span></div>
      {['Gather a little inspiration', 'Make room for the next idea', 'Bring it all together'].map((task, index) => <button key={task} className={`lp-task ${completed[index] ? 'is-complete' : ''}`} aria-pressed={completed[index]} onClick={() => setCompleted(previous => previous.map((value, i) => i === index ? !value : value))}><span className="lp-checkbox">{completed[index] && <Check size={12} />}</span><span>{task}</span></button>)}
      <p className="lp-demo-hint">Try checking something off.</p>
    </section>
    <section className="lp-demo-card lp-shortcuts-card"><div className="lp-card-heading"><span><Wrench size={15} /> Within reach</span><Grip size={15} /></div><div className="lp-shortcuts">{utilities.slice(0, 4).map(({ icon: Icon, name, color }) => <div key={name}><span className={`lp-icon ${color}`}><Icon size={17} /></span><span>{name}</span><ArrowUpRight size={13} /></div>)}</div></section>
  </div>;
}

function ProjectsDemo() {
  return <div className="lp-project-demo"><div className="lp-project-heading"><span><span className="lp-icon violet"><Folder size={19} /></span> A fresh start <span className="lp-project-tag">Organization project</span></span><span className="lp-project-avatars"><i>JD</i><i>AM</i></span></div><div className="lp-board">{[
    { label: 'To Do', cards: ['Collect inspiration', 'Sketch the first ideas'], tag: 'Plan', color: 'blue' },
    { label: 'In Progress', cards: ['Make something meaningful'], tag: 'Create', color: 'violet' },
    { label: 'Done', cards: ['Find our direction'], tag: 'Milestone', color: 'green' },
  ].map(({ label, cards, tag, color }) => <section key={label}><div className="lp-lane-title"><span><i className={color} />{label}</span><span>{cards.length}</span></div>{cards.map(card => <div className="lp-board-card" key={card}><span className={`lp-mini-tag ${color}`}>{tag}</span><p>{card}</p><span className="lp-board-meta"><span><FileText size={12} /> Project notes</span>{label === 'Done' ? <CheckCheck size={15} /> : <span className="lp-small-avatar">JD</span>}</span></div>)}<span className="lp-add-card"><Plus size={13} /> Add a card</span></section>)}</div></div>;
}

function ToolsDemo() {
  return <div className="lp-tools-demo">{utilities.map(({ icon: Icon, name, text, color }) => <div className="lp-tool-preview" key={name}><span className={`lp-icon ${color}`}><Icon size={21} /></span><div><h4>{name}</h4><p>{text}</p></div></div>)}</div>;
}

export default function Landing() {
  const [preview, setPreview] = useState<Preview>('dashboard');
  const currentView = views.find(view => view.id === preview)!;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Olio Workstation — A little less scattered.';
    const description = document.createElement('meta');
    description.name = 'description';
    description.content = 'Bring your links, tasks, projects, and everyday tools together in Olio Workstation. A personal workspace, made for your flow.';
    document.head.appendChild(description);
    return () => { document.title = previousTitle; description.remove(); };
  }, []);

  return <div className="lp-page">
    <a href="#main" className="lp-skip">Skip to content</a>
    <header className="lp-header lp-container"><a href="/landing" aria-label="Olio landing page"><Brand /></a><nav aria-label="Main navigation"><a href="#workspace">Workspace</a><a href="#features">Features</a><a href="#tools">Tools</a></nav><a className="lp-nav-cta" href="/">Open Olio <ArrowUpRight size={15} /></a></header>
    <main id="main">
      <section className="lp-hero lp-container" aria-labelledby="hero-heading">
        <div className="lp-orbits" aria-hidden="true"><div /><div /><div /><span /></div>
        <div className="lp-hero-copy"><div className="lp-eyebrow"><span /> OLIO WORKSTATION</div><h1 id="hero-heading">A little less scattered.<br /><span>A lot more together.</span></h1><p>Your projects, links, and everyday tools.<br className="lp-desktop-break" /> One thoughtfully organized space to make things happen.</p><div className="lp-hero-actions"><a href="/" className="lp-button lp-button-primary">Find your flow <ArrowRight size={17} /></a><a href="#workspace" className="lp-button lp-button-secondary">Take a look around <ArrowDown size={16} /></a></div><p className="lp-hero-note">In your browser. In your element.</p></div>
        <div id="workspace" className="lp-showcase">
          <div className="lp-preview-tabs" role="group" aria-label="Choose a workspace preview">{views.map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={preview === id} aria-controls="workspace-preview" onClick={() => setPreview(id)}><Icon size={16} />{label}</button>)}</div>
          <div className="lp-app-window" id="workspace-preview" aria-label={`${currentView.label} example`}>
            <div className="lp-window-bar"><span className="lp-window-dots" aria-hidden="true"><i /><i /><i /></span><span><LockKeyhole size={11} /> olio.one</span><span className="lp-demo-label">WORKSPACE PREVIEW</span></div>
            <div className="lp-app-body"><aside className="lp-preview-sidebar" aria-label="Preview navigation"><LayoutDashboard size={21} /><div>{views.map(({ id, icon: Icon, label }) => <button key={id} aria-label={`Preview ${label.toLowerCase()}`} aria-pressed={preview === id} onClick={() => setPreview(id)}><Icon size={18} /></button>)}</div><span className="lp-user-avatar">JD</span></aside><div className="lp-preview-content"><div className="lp-preview-top"><span>PERSONAL WORKSPACE</span><span className="lp-sample-pill">Sample workspace</span></div><div className="lp-preview-heading"><div><h3>{preview === 'dashboard' ? 'A little space for your best work.' : preview === 'projects' ? 'Ideas, meet a plan.' : 'The right tool. Right here.'}</h3><p>{preview === 'dashboard' ? 'Good morning, Jamie. Make yourself at home.' : preview === 'projects' ? 'From first thought to final detail.' : 'Keep the little things moving.'}</p></div><span className="lp-customize"><SlidersHorizontal size={14} />{preview === 'dashboard' ? 'Your layout' : preview === 'projects' ? 'Boards' : 'Utilities'}</span></div><div key={preview} className="lp-demo-scene">{preview === 'dashboard' ? <DashboardDemo /> : preview === 'projects' ? <ProjectsDemo /> : <ToolsDemo />}</div></div></div>
          </div>
          <div className="lp-preview-caption" aria-live="polite"><strong>{currentView.caption}</strong><span>{currentView.detail}</span></div>
        </div>
      </section>

      <section className="lp-features lp-container" id="features" aria-labelledby="features-heading"><div className="lp-section-intro"><span className="lp-kicker">LESS SEARCHING. MORE DOING.</span><h2 id="features-heading">Make room for<br /><span>what matters.</span></h2><p>A place for the details, so you can focus on the bigger picture.</p></div><div className="lp-feature-grid"><article className="lp-feature-card lp-personal-card"><div className="lp-feature-art lp-layout-art" aria-hidden="true"><div className="lp-layout-block"><Link2 /><i /><i /></div><div className="lp-layout-block"><ListTodo /><i /><i /><i /></div><div className="lp-layout-block"><Wrench /><span><b /><b /><b /></span></div><span className="lp-layout-cursor"><ArrowUpRight size={20} /> Yours, by design</span></div><div className="lp-feature-text"><span className="lp-kicker">01 / MAKE IT YOURS</span><h3>Your day. Your dashboard.</h3><p>Arrange your cards, collect your go-to links, and keep a personal checklist. Choose a background that feels like you.</p></div></article><article className="lp-feature-card"><div className="lp-feature-art lp-project-art" aria-hidden="true"><div className="lp-project-orbit" /><span className="lp-orbit-icon"><Folder size={29} /></span><span className="lp-floating-pill pill-one"><ListTodo size={15} /> Planner</span><span className="lp-floating-pill pill-two"><LayoutDashboard size={15} /> Boards</span><span className="lp-floating-pill pill-three"><FileText size={15} /> Files</span></div><div className="lp-feature-text"><span className="lp-kicker">02 / KEEP IT MOVING</span><h3>From “what if” to what’s next.</h3><p>Turn ideas into tasks, move work across boards, and keep files with your projects. Plan on your own or work with your organization.</p></div></article></div></section>

      <section className="lp-utilities lp-container" id="tools" aria-labelledby="tools-heading"><div className="lp-tools-heading"><div><span className="lp-kicker">THE LITTLE THINGS, TAKEN CARE OF</span><h2 id="tools-heading">A small toolkit.<br /><span>A smoother day.</span></h2></div><p>Useful things you reach for all the time,<br className="lp-desktop-break" /> already part of your workspace.</p></div><div className="lp-utility-grid">{utilities.map(({ icon: Icon, name, text, color }) => <article key={name}><span className={`lp-icon ${color}`}><Icon size={22} /></span><h3>{name}</h3><p>{text}</p></article>)}</div></section>

      <section className="lp-final-section lp-container"><div className="lp-final-glow" aria-hidden="true" /><span className="lp-brand-icon"><LayoutDashboard size={25} /></span><h2>A place to get<br /><span>into your flow.</span></h2><p>Bring your next idea. Give it a little space.</p><a className="lp-button lp-button-primary" href="/">Open Olio Workstation <ArrowRight size={17} /></a></section>
    </main>
    <footer className="lp-footer lp-container"><a href="/landing" aria-label="Olio landing page"><Brand /></a><span>A little more organized. A little more you.</span><a href="/help">Help Center <ArrowUpRight size={14} /></a></footer>
  </div>;
}
