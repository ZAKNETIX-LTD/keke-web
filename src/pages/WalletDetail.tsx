import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { roleLabel } from '../lib/types';

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

export function WalletDetailPage() {
  const { userId = '' } = useParams();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('500');
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [note, setNote] = useState('Admin adjustment');
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'wallet', userId],
    queryFn: () => adminApi.getWallet(userId),
    enabled: Boolean(userId),
  });

  const mut = useMutation({
    mutationFn: () =>
      adminApi.adjustWallet(userId, {
        amount: Number(amount),
        type,
        note,
      }),
    onSuccess: () => {
      setMessage(`Wallet ${type} applied`);
      void qc.invalidateQueries({ queryKey: ['admin', 'wallet', userId] });
      void qc.invalidateQueries({ queryKey: ['admin', 'wallets'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-48 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link to="/wallets" className="text-sm font-bold text-trigo hover:underline">
          ← Back to wallets
        </Link>
        <Flash tone="error">
          {(error as Error)?.message || 'Wallet not found'}
        </Flash>
      </div>
    );
  }

  const user = data.user;
  const wallet = data.wallet;
  const fullName =
    [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/wallets" className="text-sm font-bold text-trigo hover:underline">
          ← Back to wallets
        </Link>
        <PageHeader
          title={fullName}
          description={`${user.email} · ${roleLabel(user.role)}`}
          actions={<StatusBadge status={user.status || 'active'} />}
        />
      </div>

      {message ? <Flash>{message}</Flash> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="ui-panel relative overflow-hidden p-6 lg:col-span-1">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber/25 blur-3xl" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              Balance
            </div>
            <div className="mt-3 text-4xl font-extrabold tracking-[-0.05em]">
              {naira(Number(wallet.balance || 0))}
            </div>
            <div className="mt-1 text-sm font-bold text-muted">
              {wallet.currency || 'NGN'}
            </div>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="font-semibold text-muted">User ID</dt>
                <dd className="font-bold">#{user.id}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-semibold text-muted">Phone</dt>
                <dd className="font-bold">{user.phone || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-semibold text-muted">Username</dt>
                <dd className="font-bold">{user.username}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to={`/users/${user.id}`}
                className="ui-btn ui-btn-ghost !px-3 !py-1.5 text-xs"
              >
                View user
              </Link>
            </div>
          </div>
        </section>

        <section className="ui-panel p-6 lg:col-span-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
            Adjust wallet
          </div>
          <h2 className="mt-1 text-lg font-extrabold tracking-[-0.03em]">
            Credit or debit
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold">
              Amount
              <input
                className="ui-input mt-1.5"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="block text-sm font-bold">
              Type
              <select
                className="ui-input mt-1.5"
                value={type}
                onChange={(e) => setType(e.target.value as 'credit' | 'debit')}
              >
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            </label>
            <label className="block text-sm font-bold sm:col-span-2">
              Note
              <input
                className="ui-input mt-1.5"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="button"
                disabled={mut.isPending || !Number(amount)}
                onClick={() => mut.mutate()}
                className="ui-btn ui-btn-primary disabled:opacity-60"
              >
                {mut.isPending ? 'Applying…' : `Apply ${type}`}
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="ui-panel p-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
          Ledger
        </div>
        <h2 className="mt-1 text-lg font-extrabold tracking-[-0.03em]">
          Recent transactions
        </h2>

        <div className="mt-4 ui-table-wrap !border-0 !shadow-none">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {(wallet.transactions || []).length === 0 ? (
                <tr>
                  <td className="text-muted" colSpan={5}>
                    No transactions yet
                  </td>
                </tr>
              ) : (
                wallet.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="font-bold capitalize">{tx.type}</td>
                    <td className="font-extrabold">
                      {naira(Number(tx.amount || 0))}
                    </td>
                    <td className="max-w-sm truncate font-medium">
                      {tx.description || '—'}
                    </td>
                    <td>
                      <StatusBadge status={tx.status || 'completed'} />
                    </td>
                    <td className="text-xs font-medium text-muted">
                      {formatWhen(tx.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
