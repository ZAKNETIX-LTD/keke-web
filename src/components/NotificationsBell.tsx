import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { adminApi } from '../api/admin';

function timeAgo(value?: string) {
  if (!value) return '';
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

export function NotificationsBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: () => adminApi.notifications(),
    refetchInterval: 15_000,
  });

  const total = data?.counts.total || 0;
  const items = data?.items || [];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-ink transition hover:border-trigo/40 hover:text-trigo"
        aria-label="Notifications"
        onClick={() => {
          setOpen((v) => !v);
          void qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
        }}
      >
        <Bell size={18} strokeWidth={2} />
        {total > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-[1.15rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white">
            {total > 99 ? '99+' : total}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
            <div className="text-sm font-extrabold">Needs attention</div>
            <div className="text-[11px] font-bold text-muted">
              {data?.counts.sos || 0} SOS · {data?.counts.tickets || 0} tickets ·{' '}
              {data?.counts.payouts || 0} payouts
            </div>
          </div>
          <ul className="max-h-[22rem] overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-sm font-medium text-muted">
                All clear — nothing pending.
              </li>
            ) : (
              items.map((item) => (
                <li key={item.id} className="border-b border-line/50 last:border-0">
                  <Link
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 transition hover:bg-trigo-muted/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-ink">
                          {item.title}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-xs font-medium text-muted">
                          {item.body}
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted">
                        {item.type} · {timeAgo(item.createdAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
