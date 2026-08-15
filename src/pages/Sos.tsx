import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';

export function SosPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('active');
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'sos', status],
    queryFn: () =>
      adminApi.listSos({ status: status === 'all' ? undefined : status }),
  });

  const mut = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) =>
      adminApi.updateSos(id, next),
    onSuccess: () => {
      setMessage('SOS updated');
      void qc.invalidateQueries({ queryKey: ['admin', 'sos'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="SOS"
        description="Safety alerts from riders. Open an alert for the map and full context."
        actions={
          <select
            className="ui-input w-auto min-w-[140px]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        }
      />

      {message ? <Flash>{message}</Flash> : null}
      {error ? <Flash tone="error">{(error as Error).message}</Flash> : null}

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-28" />
            ))}
          </div>
        ) : (data || []).length === 0 ? (
          <div className="ui-panel border-dashed px-4 py-14 text-center text-sm font-medium text-muted">
            No SOS events in this queue
          </div>
        ) : (
          (data || []).map((event, index) => (
            <div
              key={event.id}
              className={`animate-rise ui-panel relative overflow-hidden p-5 ${
                event.status === 'active' ? 'ring-1 ring-rose-200/80' : ''
              }`}
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              {event.status === 'active' ? (
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-rose-400/20 blur-2xl" />
              ) : null}
              <div className="relative flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={event.status} />
                    <Link
                      to={`/sos/${event.id}`}
                      className="text-xs font-bold text-trigo hover:underline"
                    >
                      #{event.id}
                    </Link>
                    {event.status === 'active' ? (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                      </span>
                    ) : null}
                  </div>
                  <Link
                    to={`/sos/${event.id}`}
                    className="mt-2 block text-lg font-extrabold tracking-[-0.03em] hover:text-trigo"
                  >
                    {event.user?.name || `User #${event.userId}`}
                  </Link>
                  <div className="text-sm font-medium text-muted">
                    {event.user?.phone || event.user?.email || 'No contact'}
                  </div>
                  {event.note ? (
                    <p className="mt-3 max-w-2xl text-sm font-medium">{event.note}</p>
                  ) : null}
                  {(event.notifiedContacts || []).length > 0 ? (
                    <div className="mt-3 text-xs font-semibold text-muted">
                      Trusted partners:{' '}
                      {(event.notifiedContacts || [])
                        .map((c) => c.name || c.phone)
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  ) : null}
                  <div className="mt-3 text-xs font-semibold text-muted">
                    {event.latitude != null && event.longitude != null
                      ? `${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}`
                      : 'No coordinates'}
                    {event.tripId ? (
                      <>
                        {' · '}
                        <Link
                          className="font-bold text-trigo hover:underline"
                          to={`/trips/${event.tripId}`}
                        >
                          Trip #{event.tripId}
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/sos/${event.id}`}
                    className="ui-btn ui-btn-ghost !px-3 !py-1.5 text-xs"
                  >
                    View
                  </Link>
                  {event.status === 'active' ? (
                    <button
                      type="button"
                      disabled={mut.isPending}
                      onClick={() =>
                        mut.mutate({ id: event.id, next: 'resolved' })
                      }
                      className="ui-btn ui-btn-primary disabled:opacity-60"
                    >
                      Resolve
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={mut.isPending}
                      onClick={() =>
                        mut.mutate({ id: event.id, next: 'active' })
                      }
                      className="ui-btn ui-btn-ghost disabled:opacity-60"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
