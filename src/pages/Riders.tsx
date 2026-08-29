import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import {
  toApiVehicleType,
  toAdminVehicleCategory,
  vehicleTypeLabel,
} from '../lib/vehicle';
import { isKycOfficerOnly } from '../lib/types';
import { useAuth } from '../auth/AuthContext';

const emptyForm = {
  firstname: '',
  lastname: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  name: '',
  status: 'active',
  vehicleType: 'keke',
  vehicleColor: 'Yellow',
  plateNumber: '',
  vehicleModel: 'TVS King',
};

export function RidersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const officerOnly = isKycOfficerOnly(Number(me?.role || 0));
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [online, setOnline] = useState('all');
  const [kycStatus, setKycStatus] = useState(
    searchParams.get('kyc') || 'all',
  );
  const [cash, setCash] = useState(searchParams.get('cash') || 'all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [message, setMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const params = useMemo(
    () => ({
      q: q || undefined,
      status: status === 'all' ? undefined : status,
      online: online === 'all' ? undefined : online,
      kycStatus: kycStatus === 'all' ? undefined : kycStatus,
      cash: cash === 'all' ? undefined : cash,
    }),
    [q, status, online, kycStatus, cash],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'riders', params],
    queryFn: () => adminApi.listRiders(params),
  });

  const riders = useMemo(() => {
    const list = data || [];
    if (vehicleFilter === 'all') return list;
    return list.filter(
      (rider) => toAdminVehicleCategory(rider.vehicle?.type) === vehicleFilter,
    );
  }, [data, vehicleFilter]);

  const createMut = useMutation({
    mutationFn: () =>
      adminApi.createRider({
        firstname: form.firstname,
        lastname: form.lastname,
        username: form.username,
        email: form.email,
        phone: form.phone,
        password: form.password,
        name:
          form.name ||
          [form.firstname, form.lastname].filter(Boolean).join(' ').trim(),
        status: form.status,
        vehicle: {
          type: toApiVehicleType(form.vehicleType),
          color: form.vehicleColor,
          plateNumber: form.plateNumber,
          model: form.vehicleModel,
        },
      }),
    onSuccess: (res) => {
      setMessage('Rider created');
      setShowCreate(false);
      setForm(emptyForm);
      void qc.invalidateQueries({ queryKey: ['admin', 'riders'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      navigate(`/riders/${res.rider.id}`);
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => adminApi.updateRider(id, payload),
    onSuccess: () => {
      setMessage('Rider updated');
      void qc.invalidateQueries({ queryKey: ['admin', 'riders'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riders"
        description="Driver accounts and vehicle profiles (keke or car). Open a rider for full details."
        actions={
          officerOnly ? undefined : (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="ui-btn ui-btn-primary"
          >
            {showCreate ? 'Close form' : 'Create rider'}
          </button>
          )
        }
      />

      {message ? <Flash>{message}</Flash> : null}

      {showCreate && !officerOnly ? (
        <form
          className="animate-rise ui-panel grid gap-3 p-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
        >
          <div className="sm:col-span-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              New rider
            </div>
            <h2 className="mt-1 text-lg font-extrabold tracking-[-0.03em]">
              Create driver login + vehicle
            </h2>
          </div>

          {(
            [
              ['firstname', 'First name'],
              ['lastname', 'Last name'],
              ['username', 'Username'],
              ['email', 'Email'],
              ['phone', 'Phone'],
              ['password', 'Password'],
              ['name', 'Display name'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm font-bold">
              {label}
              <input
                className="ui-input mt-1.5"
                type={
                  key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'
                }
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required={
                  key !== 'phone' && key !== 'name' && key !== 'lastname'
                }
                placeholder={
                  key === 'name' ? 'Optional · defaults to full name' : undefined
                }
              />
            </label>
          ))}

          <label className="text-sm font-bold">
            Status
            <select
              className="ui-input mt-1.5"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>

          <div className="sm:col-span-2 mt-2 border-t border-line pt-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber">
              Vehicle
            </div>
          </div>

          <label className="text-sm font-bold">
            Type
            <select
              className="ui-input mt-1.5"
              value={form.vehicleType}
              onChange={(e) => {
                const vehicleType = e.target.value;
                setForm((f) => ({
                  ...f,
                  vehicleType,
                  vehicleModel:
                    vehicleType === 'car' &&
                    (f.vehicleModel === 'TVS King' || f.vehicleModel === 'Keke')
                      ? 'Sedan'
                      : vehicleType === 'keke' && f.vehicleModel === 'Sedan'
                        ? 'TVS King'
                        : f.vehicleModel,
                }));
              }}
            >
              <option value="keke">Keke</option>
              <option value="car">Car</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            Color
            <input
              className="ui-input mt-1.5"
              value={form.vehicleColor}
              onChange={(e) =>
                setForm((f) => ({ ...f, vehicleColor: e.target.value }))
              }
              required
            />
          </label>
          <label className="text-sm font-bold">
            Plate number
            <input
              className="ui-input mt-1.5"
              value={form.plateNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, plateNumber: e.target.value }))
              }
              required
              placeholder="ABC-234-XY"
            />
          </label>
          <label className="text-sm font-bold">
            Model
            <input
              className="ui-input mt-1.5"
              value={form.vehicleModel}
              onChange={(e) =>
                setForm((f) => ({ ...f, vehicleModel: e.target.value }))
              }
              required
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={createMut.isPending}
              className="ui-btn ui-btn-primary disabled:opacity-60"
            >
              {createMut.isPending ? 'Creating…' : 'Create rider'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="ui-panel flex flex-wrap gap-3 p-3">
        <input
          className="ui-input min-w-[220px] flex-1"
          placeholder="Search name, email, plate…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="ui-input w-auto min-w-[140px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          className="ui-input w-auto min-w-[140px]"
          value={online}
          onChange={(e) => setOnline(e.target.value)}
        >
          <option value="all">Online + offline</option>
          <option value="true">Online</option>
          <option value="false">Offline</option>
        </select>
        <select
          className="ui-input w-auto min-w-[150px]"
          value={kycStatus}
          onChange={(e) => setKycStatus(e.target.value)}
        >
          <option value="all">All KYC</option>
          <option value="not_started">Not started</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          className="ui-input w-auto min-w-[140px]"
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
        >
          <option value="all">All vehicles</option>
          <option value="keke">Keke</option>
          <option value="car">Car</option>
        </select>
        <select
          className="ui-input w-auto min-w-[160px]"
          value={cash}
          onChange={(e) => setCash(e.target.value)}
        >
          <option value="all">All cash</option>
          <option value="flagged">Cash flagged</option>
          <option value="over">Holding ₦5,000+</option>
        </select>
      </div>

      {error ? <Flash tone="error">{(error as Error).message}</Flash> : null}

      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Rider</th>
              <th>Vehicle</th>
              <th>KYC</th>
              <th>Cash</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="text-muted" colSpan={6}>
                  Loading riders…
                </td>
              </tr>
            ) : riders.length === 0 ? (
              <tr>
                <td className="text-muted" colSpan={6}>
                  No riders found
                </td>
              </tr>
            ) : (
              riders.map((rider) => (
                <tr
                  key={rider.id}
                  className={
                    rider.cash?.flagged
                      ? 'bg-amber-50/90'
                      : Number(rider.cash?.held || 0) >= 5000
                        ? 'bg-amber-50/40'
                        : undefined
                  }
                >
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
                    <div className="text-sm font-semibold">
                      {rider.vehicle?.plateNumber || 'No plate'}
                    </div>
                    <div className="text-xs font-medium text-muted">
                      {vehicleTypeLabel(rider.vehicle?.type)} ·{' '}
                      {rider.vehicle?.model || '—'}
                      {rider.vehicle?.ownershipType
                        ? ` · ${rider.vehicle.ownershipType}`
                        : ''}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={rider.kycStatus || 'not_started'} />
                  </td>
                  <td>
                    {rider.cash?.flagged ? (
                      <div>
                        <span className="inline-flex rounded-lg bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Needs remittance
                        </span>
                        <div className="mt-1 text-xs font-extrabold text-amber-900">
                          ₦{Number(rider.cash.held || 0).toLocaleString()}
                        </div>
                      </div>
                    ) : Number(rider.cash?.held || 0) >= 5000 ? (
                      <div>
                        <span className="inline-flex rounded-lg bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                          Watch
                        </span>
                        <div className="mt-1 text-xs font-semibold">
                          ₦{Number(rider.cash?.held || 0).toLocaleString()}
                        </div>
                      </div>
                    ) : Number(rider.cash?.held || 0) > 0 ? (
                      <div className="text-sm font-semibold">
                        ₦{Number(rider.cash?.held || 0).toLocaleString()}
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={rider.user?.status || 'active'} />
                      <span
                        className={[
                          'inline-flex w-fit rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          rider.isOnline
                            ? 'bg-emerald-500/12 text-emerald-800'
                            : 'bg-slate-500/10 text-slate-600',
                        ].join(' ')}
                      >
                        {rider.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <Link
                        to={`/riders/${rider.id}`}
                        className="ui-btn ui-btn-ghost !px-2.5 !py-1.5 text-xs"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        className="ui-btn ui-btn-ghost !px-2.5 !py-1.5 text-xs"
                        onClick={() =>
                          updateMut.mutate({
                            id: rider.id,
                            payload: {
                              status:
                                rider.user?.status === 'suspended'
                                  ? 'active'
                                  : 'suspended',
                            },
                          })
                        }
                      >
                        {rider.user?.status === 'suspended'
                          ? 'Activate'
                          : 'Suspend'}
                      </button>
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
