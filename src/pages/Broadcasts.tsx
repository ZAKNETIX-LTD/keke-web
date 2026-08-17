import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Send } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { adminApi, type AdminBroadcast } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';

type Audience = 'passengers' | 'drivers' | 'all' | 'user';
type Kind = 'system' | 'promo' | 'safety';

const AUDIENCE_LABEL: Record<Audience, string> = {
  passengers: 'Passengers',
  drivers: 'Riders',
  all: 'Passengers and riders',
  user: 'One person',
};

function formatWhen(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function BroadcastsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('passengers');
  const [kind, setKind] = useState<Kind>('system');
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewParams = useMemo(
    () => ({
      audience,
      userId: audience === 'user' ? userId.trim() : undefined,
    }),
    [audience, userId],
  );

  const preview = useQuery({
    queryKey: ['admin', 'broadcasts', 'preview', previewParams],
    queryFn: () => adminApi.previewBroadcast(previewParams),
    enabled: audience !== 'user' || Boolean(userId.trim()),
  });

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey: ['admin', 'broadcasts'],
    queryFn: () => adminApi.listBroadcasts(),
  });

  const sendMut = useMutation({
    mutationFn: () =>
      adminApi.sendBroadcast({
        title: title.trim(),
        body: body.trim(),
        audience,
        kind,
        userId: audience === 'user' ? userId.trim() : undefined,
      }),
    onSuccess: (result) => {
      setError(null);
      setMessage(
        `Sent to ${result.targeted} ${
          result.targeted === 1 ? 'person' : 'people'
        }. Inbox: ${result.inbox}. Push delivered: ${result.pushed}.`,
      );
      setTitle('');
      setBody('');
      void qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
    },
    onError: (err: Error) => {
      setMessage(null);
      setError(err.message);
    },
  });

  useEffect(() => {
    setMessage(null);
    setError(null);
  }, [audience]);

  const count = preview.data?.count ?? 0;
  const recipientCopy =
    audience === 'user'
      ? userId.trim()
        ? `User #${userId.trim()}`
        : 'Enter a user ID'
      : `${count} ${AUDIENCE_LABEL[audience].toLowerCase()}`;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    if (audience === 'user' && !userId.trim()) {
      setError('Enter the user ID to message.');
      return;
    }
    const label = AUDIENCE_LABEL[audience];
    const ok = window.confirm(
      `Send “${title.trim()}” to ${
        audience === 'user' ? `user #${userId.trim()}` : label.toLowerCase()
      }?`,
    );
    if (!ok) return;
    sendMut.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Push notifications"
        description="Send an inbox message and device push to passengers, riders, or one person."
      />

      {message ? <Flash>{message}</Flash> : null}
      {error ? <Flash tone="error">{error}</Flash> : null}

      <section className="ui-panel p-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-trigo/10 text-trigo">
            <Bell size={18} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              New broadcast
            </div>
            <h2 className="text-lg font-extrabold tracking-[-0.03em]">
              Compose alert
            </h2>
          </div>
        </div>

        <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
          <label className="text-sm font-bold">
            Audience
            <select
              className="ui-input mt-1.5"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
            >
              <option value="passengers">Passengers (users)</option>
              <option value="drivers">Riders (drivers)</option>
              <option value="all">Everyone (users and riders)</option>
              <option value="user">One person</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            Type
            <select
              className="ui-input mt-1.5"
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
            >
              <option value="system">Announcement</option>
              <option value="promo">Promo</option>
              <option value="safety">Safety</option>
            </select>
          </label>
          {audience === 'user' ? (
            <label className="sm:col-span-2 text-sm font-bold">
              User ID
              <input
                className="ui-input mt-1.5"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="From Users or Riders, copy the person ID"
                required
              />
            </label>
          ) : null}
          <label className="sm:col-span-2 text-sm font-bold">
            Title
            <input
              className="ui-input mt-1.5"
              required
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Service update"
            />
          </label>
          <label className="sm:col-span-2 text-sm font-bold">
            Message
            <textarea
              className="ui-input mt-1.5 min-h-[120px] resize-y"
              required
              maxLength={500}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What should they see on the phone?"
            />
          </label>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted">
              Will send to {recipientCopy}
              {preview.isFetching ? '…' : ''}
            </p>
            <button
              type="submit"
              disabled={sendMut.isPending || !title.trim() || !body.trim()}
              className="ui-btn ui-btn-primary disabled:opacity-50"
            >
              <Send size={16} />
              {sendMut.isPending ? 'Sending…' : 'Send notification'}
            </button>
          </div>
        </form>
      </section>

      <section className="ui-panel overflow-hidden">
        <div className="border-b border-line/70 px-5 py-4">
          <h2 className="text-lg font-extrabold tracking-[-0.03em]">
            Recent sends
          </h2>
          <p className="mt-0.5 text-xs font-medium text-muted">
            Inbox + push results for each broadcast
          </p>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-5">
            <div className="skeleton h-12" />
            <div className="skeleton h-12" />
          </div>
        ) : broadcasts.length === 0 ? (
          <p className="p-5 text-sm font-medium text-muted">
            No broadcasts yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-canvas/80 text-[11px] font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">Message</th>
                  <th className="px-3 py-3">Audience</th>
                  <th className="px-3 py-3">Reached</th>
                  <th className="px-5 py-3">Sent</th>
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((item: AdminBroadcast) => (
                  <tr key={item.id} className="border-t border-line/60">
                    <td className="px-5 py-3">
                      <div className="font-extrabold">{item.title}</div>
                      <div className="max-w-md text-xs font-medium text-muted">
                        {item.body}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-semibold capitalize">
                      {item.audience === 'drivers'
                        ? 'Riders'
                        : item.audience === 'passengers'
                          ? 'Passengers'
                          : item.audience === 'user'
                            ? `User #${item.userId || '—'}`
                            : 'Everyone'}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {item.targeted} targeted · {item.inbox} inbox ·{' '}
                      {item.pushed} push
                    </td>
                    <td className="px-5 py-3 font-medium text-muted">
                      {formatWhen(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
