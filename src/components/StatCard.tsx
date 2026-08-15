export function StatCard({
  label,
  value,
  hint,
  accent = 'teal',
  delayClass = '',
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'teal' | 'amber' | 'rose' | 'slate';
  delayClass?: string;
}) {
  const accents = {
    teal: 'from-teal-500/15 via-white to-white border-teal-200/70',
    amber: 'from-amber-400/18 via-white to-white border-amber-200/70',
    rose: 'from-rose-400/15 via-white to-white border-rose-200/70',
    slate: 'from-slate-300/20 via-white to-white border-slate-200',
  };

  const dots = {
    teal: 'bg-trigo',
    amber: 'bg-amber',
    rose: 'bg-rose-500',
    slate: 'bg-slate-400',
  };

  return (
    <div
      className={`animate-rise ui-panel relative overflow-hidden border bg-gradient-to-br p-5 ${accents[accent]} ${delayClass}`}
    >
      <div className={`absolute right-4 top-4 h-2 w-2 rounded-full ${dots[accent]}`} />
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
      <div className="mt-3 text-[1.85rem] font-extrabold tracking-[-0.04em] text-ink">
        {value}
      </div>
      {hint ? (
        <div className="mt-2 text-xs font-semibold text-muted">{hint}</div>
      ) : null}
    </div>
  );
}
