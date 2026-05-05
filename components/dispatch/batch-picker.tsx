'use client';

export type BatchPickerStatus =
  | 'accepting'
  | 'cutoff'
  | 'preparing'
  | 'dispatching'
  | 'completed'
  | 'cancelled';

export interface TodayBatchSummary {
  id: string;
  status: BatchPickerStatus;
  window_name: string | null;
  delivery_start: string | null;
  delivery_end: string | null;
  total_orders: number;
}

interface Props {
  batches: TodayBatchSummary[];
  selectedId: string | null;   // null = follow auto pick
  activeId: string | null;     // server's auto-pick (for highlight when selectedId is null)
  onSelect: (batchId: string | null) => void;
}

const STATUS_COLOR: Record<BatchPickerStatus, string> = {
  accepting: 'bg-slate-700 text-slate-200',
  cutoff: 'bg-amber-700/70 text-amber-100',
  preparing: 'bg-purple-700/70 text-purple-100',
  dispatching: 'bg-orange-600/80 text-orange-50',
  completed: 'bg-emerald-700/70 text-emerald-100',
  cancelled: 'bg-rose-900/60 text-rose-200',
};

const STATUS_LABEL: Record<BatchPickerStatus, string> = {
  accepting: 'accepting',
  cutoff: 'cutoff',
  preparing: 'preparing',
  dispatching: 'dispatching',
  completed: 'done',
  cancelled: 'cancelled',
};

export function BatchPicker({ batches, selectedId, activeId, onSelect }: Props) {
  if (batches.length === 0) return null;

  const effectiveId = selectedId ?? activeId;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selectedId !== null && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-[11px] uppercase tracking-wider px-2 py-1 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition"
          title="Return to following the active batch"
        >
          Auto
        </button>
      )}

      {batches.map(b => {
        const isSelected = b.id === effectiveId;
        const isAutoPick = selectedId === null && b.id === activeId;
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b.id)}
            className={[
              'text-[11px] px-2 py-1 rounded-full transition flex items-center gap-1.5',
              STATUS_COLOR[b.status],
              isSelected
                ? 'ring-2 ring-orange-400 ring-offset-1 ring-offset-slate-900 font-semibold'
                : 'opacity-80 hover:opacity-100',
            ].join(' ')}
            title={
              b.delivery_start && b.delivery_end
                ? `${b.window_name ?? 'Batch'} · ${b.delivery_start.slice(0, 5)}–${b.delivery_end.slice(0, 5)} · ${STATUS_LABEL[b.status]}`
                : `${b.window_name ?? 'Batch'} · ${STATUS_LABEL[b.status]}`
            }
          >
            <span>{b.window_name ?? 'Batch'}</span>
            <span className="opacity-75">· {STATUS_LABEL[b.status]}</span>
            {b.total_orders > 0 && (
              <span className="ml-0.5 px-1.5 py-px rounded-full bg-black/30 text-[10px] font-semibold">
                {b.total_orders}
              </span>
            )}
            {isAutoPick && (
              <span className="text-[9px] uppercase tracking-wider opacity-70">live</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
