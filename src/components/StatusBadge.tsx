const TONES: Record<string, string> = {
  active: 'bg-emerald-500/12 text-emerald-800 ring-emerald-500/20',
  suspended: 'bg-rose-500/12 text-rose-800 ring-rose-500/20',
  open: 'bg-amber-500/15 text-amber-900 ring-amber-500/25',
  in_progress: 'bg-sky-500/12 text-sky-800 ring-sky-500/20',
  resolved: 'bg-emerald-500/12 text-emerald-800 ring-emerald-500/20',
  closed: 'bg-slate-500/10 text-slate-600 ring-slate-500/15',
  searching: 'bg-amber-500/15 text-amber-900 ring-amber-500/25',
  accepted: 'bg-teal-500/12 text-teal-800 ring-teal-500/20',
  arriving: 'bg-teal-500/12 text-teal-800 ring-teal-500/20',
  arrived: 'bg-teal-500/12 text-teal-800 ring-teal-500/20',
  waiting: 'bg-teal-500/12 text-teal-800 ring-teal-500/20',
  started: 'bg-cyan-500/12 text-cyan-900 ring-cyan-500/20',
  awaiting_payment: 'bg-amber-500/15 text-amber-900 ring-amber-500/25',
  completed: 'bg-emerald-500/12 text-emerald-800 ring-emerald-500/20',
  cancelled: 'bg-rose-500/12 text-rose-800 ring-rose-500/20',
  not_started: 'bg-slate-500/10 text-slate-600 ring-slate-500/15',
  pending: 'bg-amber-500/15 text-amber-900 ring-amber-500/25',
  approved: 'bg-emerald-500/12 text-emerald-800 ring-emerald-500/20',
  rejected: 'bg-rose-500/12 text-rose-800 ring-rose-500/20',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = TONES[status] || 'bg-slate-500/10 text-slate-700 ring-slate-500/15';
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize tracking-wide ring-1 ${tone}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
