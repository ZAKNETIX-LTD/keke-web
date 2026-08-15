import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';

export function TicketsPage() {
  const [status, setStatus] = useState('open');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'tickets', status],
    queryFn: () =>
      adminApi.listTickets({ status: status === 'all' ? undefined : status }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Open a ticket to read the thread and reply."
        actions={
          <select
            className="ui-input w-auto min-w-[150px]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
        }
      />

      {error ? <Flash tone="error">{(error as Error).message}</Flash> : null}

      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Requester</th>
              <th>Category</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="text-muted" colSpan={5}>
                  Loading tickets…
                </td>
              </tr>
            ) : (data || []).length === 0 ? (
              <tr>
                <td className="text-muted" colSpan={5}>
                  No tickets in this queue
                </td>
              </tr>
            ) : (
              (data || []).map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="font-extrabold text-trigo hover:underline"
                    >
                      {ticket.subject}
                    </Link>
                    <div className="text-xs font-medium text-muted">
                      #{ticket.id}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm font-semibold">
                      {ticket.user?.name || ticket.userId || '—'}
                    </div>
                    <div className="text-xs font-medium text-muted">
                      {ticket.user?.email || ticket.user?.phone || ''}
                    </div>
                  </td>
                  <td className="capitalize font-semibold">{ticket.category}</td>
                  <td>
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td>
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="ui-btn ui-btn-ghost !px-2.5 !py-1.5 text-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
