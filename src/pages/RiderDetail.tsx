import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { RiderKycPanel } from '../components/RiderKycPanel';
import { StatusBadge } from '../components/StatusBadge';
import {
  rideTypeLabel,
  toApiVehicleType,
  vehicleTypeLabel,
} from '../lib/vehicle';
import {
  formatTripCancelReason,
  isCancelledTrip,
} from '../lib/tripCancel';

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

export function RiderDetailPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<
    'overview' | 'kyc' | 'trips' | 'wallet' | 'ledger' | 'ratings' | 'support'
  >(searchParams.get('tab') === 'kyc' ? 'kyc' : 'overview');
  const [form, setForm] = useState({
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
  });
  const [remitAmount, setRemitAmount] = useState('');
  const [remitNote, setRemitNote] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'rider', id],
    queryFn: () => adminApi.getRider(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!data?.rider) return;
    const rider = data.rider;
    const rawType = String(rider.vehicle?.type || 'keke').toLowerCase();
    setForm({
      firstname: rider.user?.firstname || '',
      lastname: rider.user?.lastname || '',
      username: rider.user?.username || '',
      email: rider.user?.email || '',
      phone: rider.phone || rider.user?.phone || '',
      password: '',
      name: rider.name || '',
      status: rider.user?.status || 'active',
      vehicleType: rawType === 'car' ? 'car' : 'keke',
      vehicleColor: rider.vehicle?.color || 'Yellow',
      plateNumber: rider.vehicle?.plateNumber || '',
      vehicleModel: rider.vehicle?.model || 'TVS King',
    });
  }, [data]);

  const updateMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      adminApi.updateRider(id, payload),
    onSuccess: () => {
      setMessage('Rider updated');
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ['admin', 'rider', id] });
      void qc.invalidateQueries({ queryKey: ['admin', 'riders'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const remitMut = useMutation({
    mutationFn: () =>
      adminApi.reconcileRiderCash(id, {
        amount: remitAmount.trim() ? Number(remitAmount) : null,
        note: remitNote.trim() || undefined,
      }),
    onSuccess: (res) => {
      setMessage(
        `Recorded ₦${Number(res.remitted || 0).toLocaleString()} remittance. Remaining ₦${Number(res.remaining || 0).toLocaleString()}.`,
      );
      setRemitAmount('');
      setRemitNote('');
      void qc.invalidateQueries({ queryKey: ['admin', 'rider', id] });
      void qc.invalidateQueries({ queryKey: ['admin', 'riders'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const flagMut = useMutation({
    mutationFn: () =>
      adminApi.flagRiderCash(id, {
        note: remitNote.trim() || undefined,
      }),
    onSuccess: () => {
      setMessage('Rider flagged and taken offline until remittance.');
      void qc.invalidateQueries({ queryKey: ['admin', 'rider', id] });
      void qc.invalidateQueries({ queryKey: ['admin', 'riders'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
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

  if (error || !data?.rider) {
    return (
      <div className="space-y-4">
        <Link to="/riders" className="text-sm font-bold text-trigo hover:underline">
          ← Back to riders
        </Link>
        <Flash tone="error">
          {(error as Error)?.message || 'Rider not found'}
        </Flash>
      </div>
    );
  }

  const rider = data.rider;
  const user = data.user;
  const activity = data.activity;
  const ratings = data.ratings;
  const trips = data.trips || [];
  const wallet = data.wallet;
  const cash = rider.cash;
  const cashHeld = Number(cash?.held || 0);
  const fullName =
    [user?.firstname, user?.lastname].filter(Boolean).join(' ') || rider.name;

  const tabs = [
    { id: 'overview' as const, label: 'Profile' },
    {
      id: 'kyc' as const,
      label: `KYC (${data.kyc?.status || rider.kycStatus || 'not_started'})`,
    },
    { id: 'trips' as const, label: `Trips (${activity.totalTrips})` },
    {
      id: 'wallet' as const,
      label: `Wallet (${wallet.transactions?.length || 0})`,
    },
    {
      id: 'ledger' as const,
      label: `Ledger (${data.ledger?.length || 0})`,
    },
    { id: 'ratings' as const, label: `Ratings (${ratings.count})` },
    {
      id: 'support' as const,
      label: `Support (${(data.sos?.length || 0) + (data.tickets?.length || 0)})`,
    },
  ];

  const maxDist = Math.max(
    1,
    ...[1, 2, 3, 4, 5].map((s) => Number(ratings.distribution?.[String(s)] || 0)),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link to="/riders" className="text-sm font-bold text-trigo hover:underline">
          ← Back to riders
        </Link>
        <PageHeader
          title={rider.name}
          description={`${fullName}${user?.email ? ` · ${user.email}` : ''}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={rider.user?.status || 'active'} />
              <StatusBadge status={rider.kycStatus || data.kyc?.status || 'not_started'} />
              {cash?.flagged ? (
                <span className="inline-flex items-center rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  Cash flagged
                </span>
              ) : null}
              <span
                className={[
                  'inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
                  rider.isOnline
                    ? 'bg-emerald-500/12 text-emerald-800'
                    : 'bg-slate-500/10 text-slate-600',
                ].join(' ')}
              >
                {rider.isOnline ? 'Online' : 'Offline'}
                {rider.isAvailable ? ' · available' : ''}
              </span>
              <button
                type="button"
                className="ui-btn ui-btn-ghost"
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? 'Cancel edit' : 'Edit'}
              </button>
            </div>
          }
        />
      </div>

      {message ? <Flash>{message}</Flash> : null}

      {cashHeld > 0 || cash?.flagged ? (
        <section
          className={[
            'ui-panel p-5',
            cash?.flagged
              ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300'
              : 'border-amber-200 bg-amber-50/40',
          ].join(' ')}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-800">
                {cash?.flagged ? 'Needs commission payment' : 'Commission owed (cash trips)'}
              </div>
              <div className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-amber-950">
                {naira(cashHeld)}
              </div>
              <div className="mt-1 text-sm font-semibold text-muted">
                {cash?.flagged
                  ? cash.reasonLabel ||
                    'Taken offline until commission is paid from wallet or remittance desk'
                  : 'Platform commission from cash trips (not full fare). Wallet earnings auto-clear this. Flag to take offline now.'}
              </div>
              {cash?.flaggedAt ? (
                <div className="mt-1 text-xs font-medium text-muted">
                  Flagged {formatWhen(cash.flaggedAt)}
                </div>
              ) : null}
            </div>
            <form
              className="flex min-w-[240px] flex-1 flex-wrap items-end gap-2 sm:max-w-md"
              onSubmit={(e) => {
                e.preventDefault();
                remitMut.mutate();
              }}
            >
              <label className="min-w-[120px] flex-1 text-xs font-bold">
                Amount (blank = full)
                <input
                  className="ui-input mt-1"
                  type="number"
                  min="0"
                  step="1"
                  placeholder={String(Math.round(cashHeld))}
                  value={remitAmount}
                  onChange={(e) => setRemitAmount(e.target.value)}
                />
              </label>
              <label className="min-w-[140px] flex-[2] text-xs font-bold">
                Note
                <input
                  className="ui-input mt-1"
                  placeholder="Wallet / cash desk / reference"
                  value={remitNote}
                  onChange={(e) => setRemitNote(e.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={remitMut.isPending}
                className="ui-btn ui-btn-primary disabled:opacity-60"
              >
                {remitMut.isPending ? 'Recording…' : 'Record remittance'}
              </button>
              {!cash?.flagged && cashHeld > 0 ? (
                <button
                  type="button"
                  disabled={flagMut.isPending}
                  className="ui-btn border border-amber-400 bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
                  onClick={() => flagMut.mutate()}
                >
                  {flagMut.isPending ? 'Flagging…' : 'Flag & take offline'}
                </button>
              ) : null}
            </form>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="ui-panel p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Rating
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">
            {Number(ratings.average || 0).toFixed(2)}★
          </div>
          <div className="mt-1 text-xs font-semibold text-muted">
            {ratings.count} passenger review{ratings.count === 1 ? '' : 's'}
          </div>
        </div>
        <div className="ui-panel p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Completed
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">
            {activity.completed}
          </div>
          <div className="mt-1 text-xs font-semibold text-muted">
            {activity.active} active · {activity.cancelled} cancelled
          </div>
        </div>
        <div className="ui-panel p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Earnings
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">
            {naira(activity.earnings)}
          </div>
          <div className="mt-1 text-xs font-semibold text-muted">
            From completed trips
          </div>
        </div>
        <div className="ui-panel p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Cancel rate
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">
            {activity.cancelRate}%
          </div>
          <div className="mt-1 text-xs font-semibold text-muted">
            Of {activity.totalTrips} assigned trips
          </div>
        </div>
        <div className="ui-panel p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Wallet
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">
            {naira(wallet.balance || 0)}
          </div>
          <div className="mt-1 text-xs font-semibold text-muted">
            {wallet.currency || 'NGN'}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5 border-b border-line pb-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={[
              'rounded-xl px-3.5 py-2 text-sm font-bold transition',
              tab === item.id
                ? 'bg-trigo text-white'
                : 'bg-canvas text-muted hover:bg-trigo-muted hover:text-ink',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="ui-panel p-6 lg:col-span-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
                Profile
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="font-semibold text-muted">Display name</dt>
                  <dd className="mt-1 font-bold">{rider.name}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Full name</dt>
                  <dd className="mt-1 font-bold">{fullName}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Email</dt>
                  <dd className="mt-1 font-bold">{user?.email || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Phone</dt>
                  <dd className="mt-1 font-bold">
                    {rider.phone || user?.phone || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Username</dt>
                  <dd className="mt-1 font-bold">{user?.username || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Account status</dt>
                  <dd className="mt-1">
                    <StatusBadge status={user?.status || 'active'} />
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Rider ID</dt>
                  <dd className="mt-1 font-bold">#{rider.id}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">User ID</dt>
                  <dd className="mt-1 font-bold">
                    {rider.userId ? `#${rider.userId}` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Joined</dt>
                  <dd className="mt-1 font-bold">{formatWhen(rider.createdAt)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Last known location</dt>
                  <dd className="mt-1 font-bold">
                    {rider.latitude != null && rider.longitude != null
                      ? `${Number(rider.latitude).toFixed(5)}, ${Number(rider.longitude).toFixed(5)}`
                      : '—'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="ui-panel relative overflow-hidden p-6">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber/20 blur-3xl" />
              <div className="relative space-y-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
                    Performance snapshot
                  </div>
                  <div className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">
                    {Number(ratings.average || rider.rating || 0).toFixed(2)}★
                  </div>
                  <div className="mt-1 text-sm font-semibold text-muted">
                    {rider.completedTrips} completed (profile counter)
                  </div>
                </div>
                <div className="border-t border-line pt-4">
                  <div className="text-2xl font-extrabold tracking-[-0.04em]">
                    {naira(wallet.balance || 0)}
                  </div>
                  <div className="text-xs font-semibold text-muted">
                    Wallet balance
                  </div>
                </div>
                {rider.userId ? (
                  <Link
                    to={`/wallets/${rider.userId}`}
                    className="ui-btn ui-btn-primary"
                  >
                    Manage wallet
                  </Link>
                ) : null}
              </div>
            </section>
          </div>

          <section className="ui-panel p-6">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber">
              Vehicle
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <div>
                <div className="text-xs font-semibold text-muted">Plate</div>
                <div className="mt-1 text-lg font-extrabold">
                  {rider.vehicle?.plateNumber || '—'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">Type</div>
                <div className="mt-1 text-lg font-extrabold">
                  {vehicleTypeLabel(rider.vehicle?.type)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">Model</div>
                <div className="mt-1 text-lg font-extrabold">
                  {rider.vehicle?.model || '—'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">Color</div>
                <div className="mt-1 text-lg font-extrabold">
                  {rider.vehicle?.color || '—'}
                </div>
              </div>
            </div>
          </section>

          {editing ? (
            <form
              className="ui-panel grid gap-3 p-6 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const payload: Record<string, unknown> = {
                  firstname: form.firstname,
                  lastname: form.lastname,
                  username: form.username,
                  email: form.email,
                  phone: form.phone,
                  name: form.name,
                  status: form.status,
                  vehicle: {
                    type: toApiVehicleType(form.vehicleType),
                    color: form.vehicleColor,
                    plateNumber: form.plateNumber,
                    model: form.vehicleModel,
                  },
                };
                if (form.password.trim()) payload.password = form.password;
                updateMut.mutate(payload);
              }}
            >
              <div className="sm:col-span-2">
                <h2 className="text-lg font-extrabold tracking-[-0.03em]">
                  Edit rider
                </h2>
              </div>
              {(
                [
                  ['firstname', 'First name'],
                  ['lastname', 'Last name'],
                  ['username', 'Username'],
                  ['email', 'Email'],
                  ['phone', 'Phone'],
                  ['name', 'Display name'],
                  ['password', 'Reset password'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-sm font-bold">
                  {label}
                  <input
                    className="ui-input mt-1.5"
                    type={
                      key === 'password'
                        ? 'password'
                        : key === 'email'
                          ? 'email'
                          : 'text'
                    }
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    required={
                      key !== 'password' && key !== 'phone' && key !== 'lastname'
                    }
                    placeholder={
                      key === 'password' ? 'Leave blank to keep' : undefined
                    }
                  />
                </label>
              ))}
              <label className="text-sm font-bold">
                Status
                <select
                  className="ui-input mt-1.5"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
              <label className="text-sm font-bold">
                Vehicle type
                <select
                  className="ui-input mt-1.5"
                  value={form.vehicleType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vehicleType: e.target.value }))
                  }
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
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={updateMut.isPending}
                  className="ui-btn ui-btn-primary disabled:opacity-60"
                >
                  {updateMut.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          ) : (
            <section className="ui-panel flex flex-wrap gap-2 p-5">
              <button
                type="button"
                className="ui-btn ui-btn-ghost"
                onClick={() =>
                  updateMut.mutate({
                    status:
                      rider.user?.status === 'suspended' ? 'active' : 'suspended',
                  })
                }
              >
                {rider.user?.status === 'suspended' ? 'Activate' : 'Suspend'}
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-primary"
                onClick={() => setEditing(true)}
              >
                Edit rider
              </button>
            </section>
          )}
        </div>
      ) : null}

      {tab === 'kyc' ? (
        <RiderKycPanel riderId={id} kyc={data.kyc} />
      ) : null}

      {tab === 'trips' ? (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Trip</th>
                <th>Route</th>
                <th>Passenger</th>
                <th>Fare</th>
                <th>Rating</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {trips.length === 0 ? (
                <tr>
                  <td className="text-muted" colSpan={7}>
                    No trips for this rider yet
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
                      <div className="text-xs font-medium text-muted">
                        {rideTypeLabel(trip.rideType)}
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
                          [trip.passenger?.firstname, trip.passenger?.lastname]
                            .filter(Boolean)
                            .join(' ') ||
                          trip.passenger?.email ||
                          'Passenger'}
                      </div>
                      {trip.passenger?.id || trip.passengerId ? (
                        <Link
                          to={`/users/${trip.passenger?.id || trip.passengerId}`}
                          className="text-xs font-bold text-trigo hover:underline"
                        >
                          View user
                        </Link>
                      ) : null}
                    </td>
                    <td className="font-extrabold">
                      {naira(Number(trip.fare?.total || 0))}
                    </td>
                    <td className="font-semibold">
                      {trip.rating != null ? `${trip.rating}★` : '—'}
                    </td>
                    <td>
                      <StatusBadge status={trip.status} />
                      {isCancelledTrip(trip.status) ? (
                        <div className="mt-1 max-w-[220px] text-xs font-semibold text-rose-700">
                          {formatTripCancelReason(trip)}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-xs font-medium text-muted">
                      {formatWhen(trip.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'wallet' ? (
        <div className="space-y-4">
          <section className="ui-panel flex flex-wrap items-end justify-between gap-3 p-5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
                Balance
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">
                {naira(wallet.balance || 0)}
              </div>
              <div className="text-sm font-semibold text-muted">
                {wallet.currency || 'NGN'}
              </div>
            </div>
            {rider.userId ? (
              <Link
                to={`/wallets/${rider.userId}`}
                className="ui-btn ui-btn-primary"
              >
                Adjust wallet
              </Link>
            ) : null}
          </section>

          <div className="ui-table-wrap">
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
                      No wallet transactions yet
                    </td>
                  </tr>
                ) : (
                  wallet.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="font-bold capitalize">{tx.type}</td>
                      <td className="font-extrabold">{naira(tx.amount)}</td>
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
        </div>
      ) : null}

      {tab === 'ledger' ? (
        <div className="space-y-4">
          <section className="ui-panel p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              Rider ledger
            </div>
            <p className="mt-2 text-sm font-semibold text-muted">
              Immutable accountability log: trip earnings, cash-trip commission
              debt, wallet payments, remittances, promos, and payouts.
            </p>
          </section>
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Wallet Δ</th>
                  <th>Debt Δ</th>
                  <th>Debt after</th>
                  <th>Description</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {(data.ledger || []).length === 0 ? (
                  <tr>
                    <td className="text-muted" colSpan={7}>
                      No ledger entries yet — new settlements will appear here.
                    </td>
                  </tr>
                ) : (
                  (data.ledger || []).map((row) => (
                    <tr key={row.id}>
                      <td className="font-bold capitalize">
                        {String(row.type || '').replace(/_/g, ' ')}
                      </td>
                      <td className="font-extrabold">{naira(row.amount)}</td>
                      <td className="font-semibold">
                        {row.walletDelta > 0
                          ? `+${naira(row.walletDelta)}`
                          : row.walletDelta < 0
                            ? `−${naira(Math.abs(row.walletDelta))}`
                            : '—'}
                      </td>
                      <td className="font-semibold">
                        {row.cashHeldDelta > 0
                          ? `+${naira(row.cashHeldDelta)}`
                          : row.cashHeldDelta < 0
                            ? `−${naira(Math.abs(row.cashHeldDelta))}`
                            : '—'}
                      </td>
                      <td className="font-semibold">
                        {row.cashHeldAfter != null
                          ? naira(row.cashHeldAfter)
                          : '—'}
                      </td>
                      <td className="max-w-sm truncate font-medium">
                        {row.description || '—'}
                        {row.reference ? (
                          <div className="text-[10px] font-medium text-muted">
                            {row.reference}
                          </div>
                        ) : null}
                      </td>
                      <td className="text-xs font-medium text-muted">
                        {formatWhen(row.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'ratings' ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <section className="ui-panel p-6 lg:col-span-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              Rating breakdown
            </div>
            <div className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
              {Number(ratings.average || 0).toFixed(2)}★
            </div>
            <div className="mt-1 text-sm font-semibold text-muted">
              Based on {ratings.count} rated trip{ratings.count === 1 ? '' : 's'}
            </div>
            <div className="mt-6 space-y-2.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = Number(ratings.distribution?.[String(star)] || 0);
                return (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="w-8 font-bold">{star}★</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-canvas">
                      <div
                        className="h-full rounded-full bg-amber"
                        style={{ width: `${(count / maxDist) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-semibold text-muted">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="ui-panel p-5 lg:col-span-3">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              Passenger reviews
            </div>
            {(ratings.reviews || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line px-4 py-12 text-center text-sm font-medium text-muted">
                No ratings yet
              </div>
            ) : (
              <div className="space-y-3">
                {ratings.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-line/80 bg-canvas/60 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-extrabold">{review.rating}★</div>
                      <Link
                        to={`/trips/${review.id}`}
                        className="text-xs font-bold text-trigo hover:underline"
                      >
                        Trip #{review.id}
                      </Link>
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {review.passenger?.name || 'Passenger'}
                    </div>
                    <div className="text-xs font-medium text-muted">
                      {review.route.pickup} → {review.route.destination}
                    </div>
                    {review.review ? (
                      <p className="mt-2 text-sm font-medium">{review.review}</p>
                    ) : (
                      <p className="mt-2 text-sm font-medium text-muted">
                        No written review
                      </p>
                    )}
                    <div className="mt-2 text-[11px] font-semibold text-muted">
                      {formatWhen(review.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'support' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="ui-panel p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
                SOS events
              </div>
              <Link to="/sos" className="text-xs font-bold text-trigo hover:underline">
                All SOS
              </Link>
            </div>
            {(data.sos || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm font-medium text-muted">
                No SOS linked to this rider
              </div>
            ) : (
              <div className="space-y-2">
                {data.sos.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-line/80 bg-canvas/60 px-3.5 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold">#{event.id}</span>
                      <StatusBadge status={event.status} />
                    </div>
                    <div className="mt-1 text-sm font-medium">
                      {event.note || 'No note'}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-muted">
                      <span>{formatWhen(event.createdAt)}</span>
                      {event.tripId ? (
                        <Link
                          to={`/trips/${event.tripId}`}
                          className="text-trigo hover:underline"
                        >
                          Trip #{event.tripId}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="ui-panel p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
                Support tickets
              </div>
              <Link
                to="/tickets"
                className="text-xs font-bold text-trigo hover:underline"
              >
                All tickets
              </Link>
            </div>
            {(data.tickets || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm font-medium text-muted">
                No support tickets from this rider
              </div>
            ) : (
              <div className="space-y-2">
                {data.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-2xl border border-line/80 bg-canvas/60 px-3.5 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold">{ticket.subject}</span>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <div className="mt-1 text-xs font-semibold capitalize text-muted">
                      {ticket.category}
                    </div>
                    <p className="mt-2 text-sm font-medium">{ticket.message}</p>
                    <div className="mt-2 text-[11px] font-semibold text-muted">
                      {formatWhen(ticket.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
