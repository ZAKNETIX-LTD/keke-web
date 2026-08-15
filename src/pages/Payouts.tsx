import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';

import { adminApi, type AdminPayout } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';

function naira(value: number) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

function formatWhen(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function PayoutsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    userId: '',
    amount: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    note: '',
  });

  const params = useMemo(
    () => ({ status: status === 'all' ? undefined : status }),
    [status],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'payouts', params],
    queryFn: () => adminApi.listPayouts(params),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', { kind: 'all', status: 'active' }],
    queryFn: () => adminApi.listUsers({ status: 'active' }),
    enabled: showCreate,
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      status: next,
      adminNote,
    }: {
      id: string;
      status: string;
      adminNote?: string;
    }) => adminApi.updatePayout(id, { status: next, adminNote }),
    onSuccess: () => {
      setMessage('Payout updated');
      void qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'wallets'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const createMut = useMutation({
    mutationFn: () =>
      adminApi.createPayout({
        userId: form.userId.trim(),
        amount: Number(form.amount),
        bankName: form.bankName || undefined,
        accountName: form.accountName || undefined,
        accountNumber: form.accountNumber || undefined,
        note: form.note || undefined,
      }),
    onSuccess: () => {
      setMessage('Payout created — funds held from wallet');
      setShowCreate(false);
      setForm({
        userId: '',
        amount: '',
        bankName: '',
        accountName: '',
        accountNumber: '',
        note: '',
      });
      void qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const payouts = data?.payouts || [];
  const summary = data?.summary || { pending: 0, approved: 0 };

  const act = (payout: AdminPayout, next: string) => {
    const note =
      next === 'rejected' || next === 'cancelled'
        ? window.prompt('Optional admin note', '') || undefined
        : undefined;
    updateMut.mutate({ id: payout.id, status: next, adminNote: note });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payouts"
        description="Review withdrawal requests. Approving keeps funds held; paid closes the request; reject refunds the wallet."
        actions={
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? 'Close form' : 'Create payout'}
          </button>
        }
      />

      {message ? <Flash>{message}</Flash> : null}
      {error ? <Flash tone="error">{(error as Error).message}</Flash> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="ui-panel flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber/15 text-amber">
            <Banknote size={18} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Pending
            </div>
            <div className="text-2xl font-extrabold">{summary.pending}</div>
          </div>
        </div>
        <div className="ui-panel flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-trigo/10 text-trigo">
            <Banknote size={18} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Approved (awaiting pay)
            </div>
            <div className="text-2xl font-extrabold">{summary.approved}</div>
          </div>
        </div>
      </div>

      {showCreate ? (
        <form
          className="ui-panel grid gap-3 p-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
        >
          <label className="text-sm font-bold">
            User
            <select
              className="ui-input mt-1.5"
              required
              value={form.userId}
              disabled={usersLoading}
              onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
            >
              <option value="">
                {usersLoading ? 'Loading users…' : 'Select a user'}
              </option>
              {users.map((user) => {
                const name =
                  [user.firstname, user.lastname].filter(Boolean).join(' ') ||
                  user.username;
                return (
                  <option key={user.id} value={user.id}>
                    {name} · {user.email}
                    {user.phone ? ` · ${user.phone}` : ''}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="text-sm font-bold">
            Amount (₦)
            <input
              className="ui-input mt-1.5"
              type="number"
              min={1}
              step="1"
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </label>
          <label className="text-sm font-bold">
            Bank name
            <input
              className="ui-input mt-1.5"
              value={form.bankName}
              onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
            />
          </label>
          <label className="text-sm font-bold">
            Account name
            <input
              className="ui-input mt-1.5"
              value={form.accountName}
              onChange={(e) =>
                setForm((f) => ({ ...f, accountName: e.target.value }))
              }
            />
          </label>
          <label className="text-sm font-bold">
            Account number
            <input
              className="ui-input mt-1.5"
              value={form.accountNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, accountNumber: e.target.value }))
              }
            />
          </label>
          <label className="text-sm font-bold sm:col-span-2">
            Note
            <input
              className="ui-input mt-1.5"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="ui-btn ui-btn-primary disabled:opacity-50"
              disabled={createMut.isPending}
            >
              Hold funds & create request
            </button>
          </div>
        </form>
      ) : null}

      <div className="ui-panel flex flex-wrap gap-3 p-3">
        <select
          className="ui-input w-auto min-w-[160px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Request</th>
              <th>User</th>
              <th>Bank</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="text-muted" colSpan={6}>
                  Loading payouts…
                </td>
              </tr>
            ) : payouts.length === 0 ? (
              <tr>
                <td className="text-muted" colSpan={6}>
                  No payouts for this filter
                </td>
              </tr>
            ) : (
              payouts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="font-extrabold">#{p.id}</div>
                    <div className="text-xs font-medium text-muted">
                      {formatWhen(p.createdAt)}
                    </div>
                  </td>
                  <td>
                    {p.userId ? (
                      <Link
                        to={`/wallets/${p.userId}`}
                        className="font-bold text-trigo hover:underline"
                      >
                        {p.user?.name || `User #${p.userId}`}
                      </Link>
                    ) : (
                      '—'
                    )}
                    <div className="text-xs font-medium text-muted">
                      {p.user?.email || p.user?.phone || ''}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm font-semibold">
                      {p.bankName || '—'}
                    </div>
                    <div className="text-xs font-medium text-muted">
                      {p.accountName || '—'} · {p.accountNumber || '—'}
                    </div>
                  </td>
                  <td className="font-extrabold text-trigo">
                    {naira(p.amount)}
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {p.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            className="ui-btn ui-btn-ghost !px-2.5 !py-1.5 text-xs"
                            disabled={updateMut.isPending}
                            onClick={() => act(p, 'approved')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="ui-btn ui-btn-primary !px-2.5 !py-1.5 text-xs"
                            disabled={updateMut.isPending}
                            onClick={() => act(p, 'paid')}
                          >
                            Mark paid
                          </button>
                          <button
                            type="button"
                            className="ui-btn ui-btn-danger !px-2.5 !py-1.5 text-xs"
                            disabled={updateMut.isPending}
                            onClick={() => act(p, 'rejected')}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {p.status === 'approved' ? (
                        <>
                          <button
                            type="button"
                            className="ui-btn ui-btn-primary !px-2.5 !py-1.5 text-xs"
                            disabled={updateMut.isPending}
                            onClick={() => act(p, 'paid')}
                          >
                            Mark paid
                          </button>
                          <button
                            type="button"
                            className="ui-btn ui-btn-danger !px-2.5 !py-1.5 text-xs"
                            disabled={updateMut.isPending}
                            onClick={() => act(p, 'cancelled')}
                          >
                            Cancel
                          </button>
                        </>
                      ) : null}
                    </div>
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
