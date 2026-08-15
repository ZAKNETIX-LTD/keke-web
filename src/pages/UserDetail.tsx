import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { ROLE, roleLabel } from '../lib/types';
import { useAuth } from '../auth/AuthContext';

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

export function UserDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<
    'overview' | 'trips' | 'wallet' | 'ratings' | 'support'
  >('overview');
  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    status: 'active',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => adminApi.getUser(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!data?.user) return;
    setForm({
      firstname: data.user.firstname || '',
      lastname: data.user.lastname || '',
      username: data.user.username || '',
      email: data.user.email || '',
      phone: data.user.phone || '',
      password: '',
      status: data.user.status || 'active',
    });
  }, [data]);

  const updateMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      adminApi.updateUser(id, payload),
    onSuccess: () => {
      setMessage('User updated');
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ['admin', 'user', id] });
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => adminApi.deleteUser(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      navigate('/users', { replace: true });
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

  if (error || !data?.user) {
    return (
      <div className="space-y-4">
        <Link to="/users" className="text-sm font-bold text-trigo hover:underline">
          ← Back to users
        </Link>
        <Flash tone="error">
          {(error as Error)?.message || 'User not found'}
        </Flash>
      </div>
    );
  }

  const user = data.user;
  const activity = data.activity;
  const ratings = data.ratings;
  const trips = data.trips || [];
  const wallet = data.wallet;
  const fullName =
    [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username;

  const tabs = [
    { id: 'overview' as const, label: 'Profile' },
    { id: 'trips' as const, label: `Trips (${activity.totalTrips})` },
    {
      id: 'wallet' as const,
      label: `Wallet (${wallet.transactions?.length || 0})`,
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
        <Link to="/users" className="text-sm font-bold text-trigo hover:underline">
          ← Back to users
        </Link>
        <PageHeader
          title={fullName}
          description={`${user.email} · ${roleLabel(user.role)}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={user.status || 'active'} />
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="ui-panel p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Avg rating given
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">
            {ratings.count
              ? `${Number(ratings.average || 0).toFixed(2)}★`
              : '—'}
          </div>
          <div className="mt-1 text-xs font-semibold text-muted">
            {ratings.count} review{ratings.count === 1 ? '' : 's'} left
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
            Spend
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">
            {naira(activity.spend)}
          </div>
          <div className="mt-1 text-xs font-semibold text-muted">
            On completed trips
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
            Of {activity.totalTrips} trips
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
                  <dt className="font-semibold text-muted">Full name</dt>
                  <dd className="mt-1 font-bold">{fullName}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Username</dt>
                  <dd className="mt-1 font-bold">{user.username}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Email</dt>
                  <dd className="mt-1 font-bold">{user.email || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Phone</dt>
                  <dd className="mt-1 font-bold">{user.phone || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Role</dt>
                  <dd className="mt-1 font-bold">{roleLabel(user.role)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Status</dt>
                  <dd className="mt-1">
                    <StatusBadge status={user.status || 'active'} />
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">User ID</dt>
                  <dd className="mt-1 font-bold">#{user.id}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Referral code</dt>
                  <dd className="mt-1 font-bold">{user.referralCode || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Joined</dt>
                  <dd className="mt-1 font-bold">{formatWhen(user.createdAt)}</dd>
                </div>
              </dl>
            </section>

            <section className="ui-panel relative overflow-hidden p-6">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-trigo/10 blur-3xl" />
              <div className="relative space-y-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
                    Wallet
                  </div>
                  <div className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">
                    {naira(wallet.balance || 0)}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-muted">
                    {wallet.currency || 'NGN'}
                  </div>
                </div>
                <Link
                  to={`/wallets/${user.id}`}
                  className="ui-btn ui-btn-primary"
                >
                  Manage wallet
                </Link>
                {data.driver ? (
                  <Link
                    to={`/riders/${data.driver.id}`}
                    className="ui-btn ui-btn-ghost"
                  >
                    Linked rider profile
                  </Link>
                ) : null}
              </div>
            </section>
          </div>

          {data.driver ? (
            <section className="ui-panel p-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber">
                Linked rider account
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-4">
                <div>
                  <div className="text-xs font-semibold text-muted">Name</div>
                  <div className="mt-1 text-lg font-extrabold">
                    {data.driver.name}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted">Rating</div>
                  <div className="mt-1 text-lg font-extrabold">
                    {Number(data.driver.rating || 0).toFixed(2)}★
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted">Trips</div>
                  <div className="mt-1 text-lg font-extrabold">
                    {data.driver.completedTrips}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted">Plate</div>
                  <div className="mt-1 text-lg font-extrabold">
                    {data.driver.vehicle?.plateNumber || '—'}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

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
                  role: ROLE.passenger,
                  status: form.status,
                };
                if (form.password.trim()) payload.password = form.password;
                updateMut.mutate(payload);
              }}
            >
              <div className="sm:col-span-2">
                <h2 className="text-lg font-extrabold tracking-[-0.03em]">
                  Edit passenger
                </h2>
              </div>
              {(
                [
                  ['firstname', 'First name'],
                  ['lastname', 'Last name'],
                  ['username', 'Username'],
                  ['email', 'Email'],
                  ['phone', 'Phone'],
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
                    required={key !== 'password' && key !== 'phone'}
                    placeholder={
                      key === 'password' ? 'Leave blank to keep' : undefined
                    }
                  />
                </label>
              ))}
              <label className="text-sm font-bold sm:col-span-2">
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
              <div className="sm:col-span-2 flex flex-wrap gap-2">
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
                    status: user.status === 'suspended' ? 'active' : 'suspended',
                  })
                }
              >
                {user.status === 'suspended' ? 'Activate' : 'Suspend'}
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-primary"
                onClick={() => setEditing(true)}
              >
                Edit user
              </button>
              {String(me?.id) !== String(user.id) ? (
                <button
                  type="button"
                  className="ui-btn ui-btn-danger"
                  disabled={deleteMut.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Delete this user permanently? This cannot be undone.',
                      )
                    ) {
                      deleteMut.mutate();
                    }
                  }}
                >
                  Delete user
                </button>
              ) : null}
            </section>
          )}
        </div>
      ) : null}

      {tab === 'trips' ? (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Trip</th>
                <th>Route</th>
                <th>Rider</th>
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
                    No trips for this user yet
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
                      <div className="text-xs font-medium capitalize text-muted">
                        {trip.rideType || 'standard'} ·{' '}
                        {trip.paymentMethod || 'cash'}
                      </div>
                    </td>
                    <td>
                      <div className="max-w-xs truncate font-medium">
                        {trip.pickup?.name} → {trip.destination?.name}
                      </div>
                    </td>
                    <td>
                      <div className="text-xs font-semibold">
                        {trip.driver?.name || 'Unassigned'}
                      </div>
                      {trip.driver?.id ? (
                        <Link
                          to={`/riders/${trip.driver.id}`}
                          className="text-xs font-bold text-trigo hover:underline"
                        >
                          View rider
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
            <Link
              to={`/wallets/${user.id}`}
              className="ui-btn ui-btn-primary"
            >
              Adjust wallet
            </Link>
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

      {tab === 'ratings' ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <section className="ui-panel p-6 lg:col-span-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              Ratings given
            </div>
            <div className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
              {ratings.count
                ? `${Number(ratings.average || 0).toFixed(2)}★`
                : '—'}
            </div>
            <div className="mt-1 text-sm font-semibold text-muted">
              Average of {ratings.count} review
              {ratings.count === 1 ? '' : 's'} left for riders
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
              Reviews left
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
                      {review.driver?.name || 'Rider'}
                    </div>
                    {review.driver?.id ? (
                      <Link
                        to={`/riders/${review.driver.id}`}
                        className="text-xs font-bold text-trigo hover:underline"
                      >
                        View rider
                      </Link>
                    ) : null}
                    <div className="mt-1 text-xs font-medium text-muted">
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
                No SOS from this user
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
                No support tickets from this user
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
