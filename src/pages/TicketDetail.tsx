import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import type { SupportMessage } from '../lib/types';

function formatWhen(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatTime(value?: string | null) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function TicketDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [flash, setFlash] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('in_progress');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'ticket', id],
    queryFn: () => adminApi.getTicket(id),
    enabled: Boolean(id),
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (!data?.ticket) return;
    setStatus(
      data.ticket.status === 'open' ? 'in_progress' : data.ticket.status,
    );
  }, [data?.ticket?.status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages?.length]);

  const sendMut = useMutation({
    mutationFn: () =>
      adminApi.sendTicketMessage(id, {
        message: draft.trim(),
        status,
      }),
    onSuccess: () => {
      setDraft('');
      setFlash('Reply sent');
      void qc.invalidateQueries({ queryKey: ['admin', 'ticket', id] });
      void qc.invalidateQueries({ queryKey: ['admin', 'tickets'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (err: Error) => setFlash(err.message),
  });

  const statusMut = useMutation({
    mutationFn: (next: string) => adminApi.updateTicket(id, { status: next }),
    onSuccess: () => {
      setFlash('Status updated');
      void qc.invalidateQueries({ queryKey: ['admin', 'ticket', id] });
      void qc.invalidateQueries({ queryKey: ['admin', 'tickets'] });
    },
    onError: (err: Error) => setFlash(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (error || !data?.ticket) {
    return (
      <div className="space-y-4">
        <Link
          to="/tickets"
          className="text-sm font-bold text-trigo hover:underline"
        >
          ← Back to support
        </Link>
        <Flash tone="error">
          {(error as Error)?.message || 'Ticket not found'}
        </Flash>
      </div>
    );
  }

  const ticket = data.ticket;
  const trip = data.trip;
  const messages: SupportMessage[] = data.messages || [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/tickets"
          className="text-sm font-bold text-trigo hover:underline"
        >
          ← Back to support
        </Link>
        <PageHeader
          title={ticket.subject}
          description={`Ticket #${ticket.id} · ${ticket.category}`}
          actions={<StatusBadge status={ticket.status} />}
        />
      </div>

      {flash ? <Flash>{flash}</Flash> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="ui-panel flex min-h-[520px] flex-col overflow-hidden lg:col-span-2">
          <div className="border-b border-line px-6 py-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              Live chat
            </div>
            <p className="mt-1 text-sm font-medium text-muted">
              Replies appear instantly in the passenger or rider app.
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {messages.length === 0 ? (
              <p className="text-sm font-medium text-muted">No messages yet.</p>
            ) : (
              messages.map((item) => {
                const support = item.senderRole === 'support';
                return (
                  <div
                    key={item.id}
                    className={`flex ${support ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed ${
                        support
                          ? 'bg-trigo text-white'
                          : 'border border-line bg-canvas'
                      }`}
                    >
                      <div
                        className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${
                          support ? 'text-white/70' : 'text-trigo'
                        }`}
                      >
                        {support ? 'Support' : 'Customer'}
                        {item.createdAt ? ` · ${formatTime(item.createdAt)}` : ''}
                      </div>
                      <p className="whitespace-pre-wrap">{item.message}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-line px-6 py-4">
            <textarea
              className="ui-input min-h-24 resize-y"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a reply…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (draft.trim() && !sendMut.isPending) sendMut.mutate();
                }
              }}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="text-sm font-bold">
                Status
                <select
                  className="ui-input ml-2 inline-block w-auto"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="open">Open</option>
                </select>
              </label>
              <button
                type="button"
                disabled={sendMut.isPending || !draft.trim()}
                onClick={() => sendMut.mutate()}
                className="ui-btn ui-btn-primary disabled:opacity-60"
              >
                {sendMut.isPending ? 'Sending…' : 'Send reply'}
              </button>
              <button
                type="button"
                disabled={statusMut.isPending}
                onClick={() => statusMut.mutate('closed')}
                className="ui-btn ui-btn-ghost disabled:opacity-60"
              >
                Close ticket
              </button>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="ui-panel p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              Requester
            </div>
            <div className="mt-2 text-lg font-extrabold">
              {ticket.user?.name ||
                (ticket.userId ? `User #${ticket.userId}` : 'Unknown')}
            </div>
            <div className="text-sm font-medium text-muted">
              {ticket.user?.phone || ticket.user?.email || 'No contact'}
            </div>
            {ticket.userId ? (
              <Link
                to={`/users/${ticket.userId}`}
                className="mt-2 inline-block text-xs font-bold text-trigo hover:underline"
              >
                View user
              </Link>
            ) : null}
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="font-semibold text-muted">Created</dt>
                <dd className="font-bold">{formatWhen(ticket.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-semibold text-muted">Updated</dt>
                <dd className="font-bold">{formatWhen(ticket.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="ui-panel p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              Linked trip
            </div>
            {!trip ? (
              <p className="mt-3 text-sm font-medium text-muted">
                {ticket.tripId
                  ? `Trip #${ticket.tripId} could not be loaded`
                  : 'No trip linked'}
              </p>
            ) : (
              <div className="mt-3">
                <Link
                  to={`/trips/${trip.id}`}
                  className="font-extrabold text-trigo hover:underline"
                >
                  Trip #{trip.id}
                </Link>
                <div className="mt-1 text-sm font-semibold">
                  {trip.pickup?.name} → {trip.destination?.name}
                </div>
                <div className="mt-2">
                  <StatusBadge status={trip.status} />
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
