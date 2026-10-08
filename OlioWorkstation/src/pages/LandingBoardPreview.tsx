import { useState } from 'react';
import { X } from 'lucide-react';
import { BoardColumnView, type BoardCard, type BoardColumn } from '../components/BoardColumn';

const columns: BoardColumn[] = ['To Do', 'In Progress', 'Done'].map((name, i) => ({ id: String(i), name, project_id: 'example', position: i, archived: false, created_at: '', updated_at: '' }));
function sampleCard(id: string, title: string, column: string, priority: BoardCard['priority'] = 'none'): BoardCard {
  return { id, title, column_id: column, priority, project_id: 'example', description: '', due_date: null, assignee_name: 'Jamie', position: 0, archived: false, completed: column === '2', created_at: '', updated_at: '' };
}

export default function BoardPreview() {
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

