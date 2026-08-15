import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { roleLabel } from '../lib/types';

function naira(value: number) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

export function WalletPage() {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');

  const listParams = useMemo(
    () => ({
      q: q || undefined,
      kind: kind === 'all' ? undefined : kind,
    }),
    [q, kind],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'wallets', listParams],
    queryFn: () => adminApi.listWallets(listParams),
  });

  const wallets = data?.wallets || [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallets"
        description="All users and balances. Open a wallet for the ledger and adjustments."
      />

      {error ? <Flash tone="error">{(error as Error).message}</Flash> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="ui-panel p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Users
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">
            {summary?.users ?? '—'}
          </div>
          <div className="mt-1 text-xs font-semibold text-muted">
            In this view
          </div>
        </div>
        <div className="ui-panel p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            With balance
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">
            {summary?.withBalance ?? '—'}
          </div>
          <div className="mt-1 text-xs font-semibold text-muted">
            Balance greater than zero
          </div>
        </div>
        <div className="ui-panel p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Total float
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">
            {summary ? naira(summary.totalBalance) : '—'}
          </div>
          <div className="mt-1 text-xs font-semibold text-muted">
            {summary?.currency || 'NGN'} across listed wallets
          </div>
        </div>
      </section>

      <div className="ui-panel flex flex-wrap gap-3 p-3">
        <input
          className="ui-input min-w-[220px] flex-1"
          placeholder="Search name, email, phone, user id…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="ui-input w-auto min-w-[160px]"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="all">All users</option>
          <option value="passenger">Passengers</option>
          <option value="rider">Riders</option>
        </select>
      </div>

      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Kind</th>
              <th>Role</th>
              <th>Balance</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="text-muted" colSpan={6}>
                  Loading wallets…
                </td>
              </tr>
            ) : wallets.length === 0 ? (
              <tr>
                <td className="text-muted" colSpan={6}>
                  No users match these filters
                </td>
              </tr>
            ) : (
              wallets.map((row) => {
                const name =
                  [row.user.firstname, row.user.lastname]
                    .filter(Boolean)
                    .join(' ') || row.user.username;
                return (
                  <tr key={row.user.id}>
                    <td>
                      <Link
                        to={`/wallets/${row.user.id}`}
                        className="font-extrabold text-trigo hover:underline"
                      >
                        {name}
                      </Link>
                      <div className="text-xs font-medium text-muted">
                        #{row.user.id} · {row.user.email}
                      </div>
                    </td>
                    <td className="capitalize font-semibold">{row.kind}</td>
                    <td className="text-xs font-semibold text-muted">
                      {roleLabel(row.user.role)}
                    </td>
                    <td className="font-extrabold">{naira(row.balance)}</td>
                    <td>
                      <StatusBadge status={row.user.status || 'active'} />
                    </td>
                    <td>
                      <Link
                        to={`/wallets/${row.user.id}`}
                        className="ui-btn ui-btn-ghost !px-2.5 !py-1.5 text-xs"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
