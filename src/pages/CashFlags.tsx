import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';

function naira(value: number) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

export function CashFlagsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'riders', { cash: 'flagged' }],
    queryFn: () => adminApi.listRiders({ cash: 'flagged' }),
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash flags"
        description="Riders taken offline until unremitted cash is recorded. Amber rows need remittance."
        actions={
          <Link to="/riders?cash=flagged" className="ui-btn ui-btn-ghost">
            All riders
          </Link>
        }
      />

      {error ? <Flash tone="error">{(error as Error).message}</Flash> : null}

      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Rider</th>
              <th>Unremitted</th>
              <th>Why flagged</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="text-muted" colSpan={4}>
                  Loading cash flags…
                </td>
              </tr>
            ) : (data || []).length === 0 ? (
              <tr>
                <td className="text-muted" colSpan={4}>
                  No flagged riders right now
                </td>
              </tr>
            ) : (
              (data || []).map((rider) => (
                <tr key={rider.id} className="bg-amber-50/80">
                  <td>
                    <Link
                      to={`/riders/${rider.id}`}
                      className="font-bold text-trigo hover:underline"
                    >
                      {rider.name}
                    </Link>
                    <div className="text-xs font-medium text-muted">
                      {rider.user?.email || 'No email'} · #{rider.id}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm font-extrabold text-amber-800">
                      {naira(Number(rider.cash?.held || 0))}
                    </div>
                  </td>
                  <td>
                    <span className="inline-flex rounded-lg bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                      Flagged
                    </span>
                    <div className="mt-1 text-xs font-medium text-muted">
                      {rider.cash?.reasonLabel || 'Needs remittance'}
                    </div>
                  </td>
                  <td>
                    <Link
                      to={`/riders/${rider.id}`}
                      className="ui-btn ui-btn-primary !px-2.5 !py-1.5 text-xs"
                    >
                      Record remittance
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
