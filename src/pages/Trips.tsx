import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';

const STATUSES = [
  'all',
  'searching',
  'accepted',
  'arrived',
  'started',
  'awaiting_payment',
  'completed',
  'cancelled',
];

const PAGE_SIZE = 25;

function naira(value: number) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

export function TripsPage() {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(
    STATUSES.includes(initialStatus) ? initialStatus : 'all',
  );
  const [scheduled, setScheduled] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const next = searchParams.get('status');
    if (next && STATUSES.includes(next)) setStatus(next);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [q, status, scheduled]);

  const params = useMemo(
    () => ({
      q: q || undefined,
      status: status === 'all' ? undefined : status,
      scheduled: scheduled === 'all' ? undefined : scheduled,
      page,
      pageSize: PAGE_SIZE,
    }),
    [q, status, scheduled, page],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'trips', params],
    queryFn: () => adminApi.listTrips(params),
  });

  const trips = data?.trips || [];
  const pagination = data?.pagination || {
    page: 1,
    pageSize: PAGE_SIZE,
    total: trips.length,
    totalPages: 1,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trips"
        description="Browse live and historical rides. Open a trip for full detail."
      />

      <div className="ui-panel flex flex-wrap gap-3 p-3">
        <input
          className="ui-input min-w-[220px] flex-1"
          placeholder="Search id, place, passenger, driver…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="ui-input w-auto min-w-[160px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          className="ui-input w-auto min-w-[170px]"
          value={scheduled}
          onChange={(e) => setScheduled(e.target.value)}
        >
          <option value="all">All scheduling</option>
          <option value="any">Scheduled (any)</option>
          <option value="upcoming">Upcoming scheduled</option>
          <option value="past">Past scheduled</option>
        </select>
      </div>

      {error ? <Flash tone="error">{(error as Error).message}</Flash> : null}

      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Trip</th>
              <th>Route</th>
              <th>People</th>
              <th>Fare</th>
              <th>When</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="text-muted" colSpan={6}>
                  Loading trips…
                </td>
              </tr>
            ) : trips.length === 0 ? (
              <tr>
                <td className="text-muted" colSpan={6}>
                  No trips match these filters
                </td>
              </tr>
            ) : (
              trips.map((trip) => (
                <tr key={trip.id}>
                  <td>
                    <Link
                      to={`/trips/${trip.id}`}
                      className="font-extrabold text-trigo hover:underline"
                    >
                      #{trip.id}
                    </Link>
                    <div className="text-xs font-medium capitalize text-muted">
                      {trip.rideType || 'standard'}
                    </div>
                  </td>
                  <td>
                    <div className="max-w-xs truncate font-medium">
                      {trip.pickup?.name} → {trip.destination?.name}
                    </div>
                  </td>
                  <td>
                    <div className="text-xs font-semibold">
                      {trip.passenger?.name ||
                        trip.passenger?.email ||
                        'Passenger'}
                    </div>
                    <div className="text-xs font-medium text-muted">
                      {trip.driver?.name || 'No rider'}
                    </div>
                  </td>
                  <td className="font-extrabold">
                    {naira(Number(trip.fare?.total || 0))}
                  </td>
                  <td>
                    {trip.scheduledAt ? (
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wide text-amber">
                          Scheduled
                        </div>
                        <div className="text-xs font-semibold">
                          {new Date(trip.scheduledAt).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-muted">
                        {trip.createdAt
                          ? new Date(trip.createdAt).toLocaleString()
                          : '—'}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={trip.status} />
                      <Link
                        to={`/trips/${trip.id}`}
                        className="ui-btn ui-btn-ghost !px-2.5 !py-1.5 text-xs"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-muted">
          {pagination.total} trip{pagination.total === 1 ? '' : 's'} · page{' '}
          {pagination.page} of {pagination.totalPages}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="ui-btn ui-btn-ghost disabled:opacity-50"
            disabled={pagination.page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-ghost disabled:opacity-50"
            disabled={pagination.page >= pagination.totalPages || isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
