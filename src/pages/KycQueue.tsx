import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';

export function KycQueuePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'riders', { kycStatus: 'pending' }],
    queryFn: () => adminApi.listRiders({ kycStatus: 'pending' }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="KYC queue"
        description="Riders waiting for document verification."
        actions={
          <Link to="/riders?kyc=pending" className="ui-btn ui-btn-ghost">
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
              <th>Vehicle</th>
              <th>Ownership</th>
              <th>KYC</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="text-muted" colSpan={5}>
                  Loading pending KYC…
                </td>
              </tr>
            ) : (data || []).length === 0 ? (
              <tr>
                <td className="text-muted" colSpan={5}>
                  No pending KYC submissions
                </td>
              </tr>
            ) : (
              (data || []).map((rider) => (
                <tr key={rider.id}>
                  <td>
                    <div className="font-bold">{rider.name}</div>
                    <div className="text-xs font-medium text-muted">
                      {rider.user?.email || rider.phone || '—'}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm font-semibold">
                      {rider.vehicle?.plateNumber || 'No plate'}
                    </div>
                    <div className="text-xs capitalize text-muted">
                      {rider.vehicle?.model || '—'}
                    </div>
                  </td>
                  <td className="capitalize text-sm font-semibold">
                    {rider.vehicle?.ownershipType || '—'}
                  </td>
                  <td>
                    <StatusBadge status={rider.kycStatus || 'pending'} />
                  </td>
                  <td>
                    <Link
                      to={`/riders/${rider.id}`}
                      className="ui-btn ui-btn-primary !px-2.5 !py-1.5 text-xs"
                    >
                      Review
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
