import { useState } from 'react';
import { Plus } from 'lucide-react';

export type BoardColumn = {
  id: string;
  project_id: string;
  name: string;
  position: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type BoardCard = {
  id: string;
  column_id: string;
  project_id: string;
  title: string;
  description: string;
  priority: 'none' | 'low' | 'medium' | 'high';
  due_date: string | null;
  assignee_name: string | null;
  position: number;
  archived: boolean;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

function isCompletedLaneName(columnName: string) {
  const v = (columnName || '').trim().toLowerCase();
  return v.includes('done') || v.includes('complete');
}

export function BoardColumnView({
  column,
  cards,
  onCreateCard,
  onDragStart,
  onDragOver,
  onDrop,
  onCardClick,
  highlightCardId,
}: {
  column: BoardColumn;
  cards: BoardCard[];
  onCreateCard: (columnId: string, title: string) => void;
  onDragStart: (cardId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (columnId: string) => void;
  onCardClick: (card: BoardCard) => void;
  highlightCardId: string | null;
}) {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      onCreateCard(column.id, newCardTitle.trim());
      setNewCardTitle('');
      setAddingCard(false);
    }
  };

  return (
    <div
      className="flex-shrink-0 w-[min(85vw,24rem)] sm:w-[22rem] rounded-2xl border border-slate-800/60 bg-slate-950/40 p-3 sm:p-4 snap-start"
      onDragOver={onDragOver}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(column.id);
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold text-slate-100">{column.name}</div>
          <div className="text-xs text-slate-400">{cards.length} tasks</div>
        </div>
        <button
          aria-label={`Add task to ${column.name}`}
          onClick={() => setAddingCard(true)}
          className="p-1.5 rounded-lg hover:bg-slate-800/50 text-slate-400"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 min-h-[200px]">
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            completedViaLane={isCompletedLaneName(column.name)}
            onDragStart={() => onDragStart(card.id)}
            onClick={() => onCardClick(card)}
            highlighted={highlightCardId === card.id}
          />
        ))}

        {addingCard && (
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-3">
            <input
              type="text"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCard();
                if (e.key === 'Escape') {
                  setAddingCard(false);
                  setNewCardTitle('');
                }
              }}
              placeholder="Task title..."
              autoFocus
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleAddCard}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setAddingCard(false);
                  setNewCardTitle('');
                }}
                className="px-3 py-1.5 rounded-lg hover:bg-slate-800/50 text-slate-400 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CardItem({
  card,
  completedViaLane,
  onDragStart,
  onClick,
  highlighted,
}: {
  card: BoardCard;
  completedViaLane: boolean;
  onDragStart: () => void;
  onClick: () => void;
  highlighted: boolean;
}) {
  const priorityColors = {
    none: 'border-slate-700/50',
    low: 'border-blue-500/30 bg-blue-500/5',
    medium: 'border-amber-500/30 bg-amber-500/5',
    high: 'border-red-500/30 bg-red-500/5',
  };

  const priorityBadges = {
    low: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    medium: 'bg-amber-500/15 text-amber-200 border-amber-500/25',
    high: 'bg-red-500/15 text-red-300 border-red-500/25',
  };

  const isCompleted = card.completed || completedViaLane;

  return (
    <div
      id={`board-card-${card.id}`}
      role="button"
      tabIndex={0}
      aria-label={`Open task: ${card.title}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onClick={onClick}
      className={`rounded-xl border ${
        isCompleted ? 'border-emerald-400/35 bg-emerald-500/10' : `${priorityColors[card.priority]} bg-slate-900/30`
      } p-3 cursor-pointer hover:bg-slate-900/50 transition-colors ${
        highlighted ? 'ring-2 ring-cyan-400/45 border-cyan-400/55' : ''
      }`}
    >
      <div className="text-sm font-medium text-slate-100 mb-2">{card.title}</div>

      <div className="flex items-center gap-2 flex-wrap">
        {isCompleted && <span className="text-xs font-medium text-emerald-300">Completed</span>}

        {card.priority !== 'none' && (
          <span className={`px-2 py-0.5 rounded-full border text-xs ${priorityBadges[card.priority]}`}>
            {card.priority}
          </span>
        )}

        {card.assignee_name && (
          <span className="px-2 py-0.5 rounded-full bg-slate-700/30 border border-slate-700/50 text-xs text-slate-300">
            {card.assignee_name}
          </span>
        )}

        {card.due_date && (
          <span className="text-xs text-slate-400">
            {new Date(card.due_date).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

