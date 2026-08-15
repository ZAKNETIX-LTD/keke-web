import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bike,
  Clock3,
  MessageSquare,
  MapPin,
  Navigation,
  Route,
  UserRound,
  Wallet,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { TripMap } from '../components/TripMap';

const ACTIONS = [
  { status: 'accepted', label: 'Set accepted' },
  { status: 'arrived', label: 'Set arrived' },
  { status: 'started', label: 'Set started' },
  { status: 'awaiting_payment', label: 'Awaiting payment' },
  { status: 'completed', label: 'Force complete' },
  { status: 'cancelled', label: 'Force cancel', danger: true },
];

function naira(value?: number) {
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/70 py-2.5 last:border-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="max-w-[65%] text-right text-sm font-semibold text-ink">
        {value}
      </dd>
    </div>
  );
}

export function TripDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Cancelled by admin');
  const [assignDriverId, setAssignDriverId] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(true);

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['admin', 'trip', id],
    queryFn: () => adminApi.getTrip(id),
    enabled: Boolean(id),
  });

  const canAssign = Boolean(
    trip &&
      [
        'searching',
        'driver_found',
        'accepted',
        'arriving',
        'arrived',
        'waiting',
      ].includes(trip.status),
  );

  const { data: riders = [], isLoading: ridersLoading } = useQuery({
    queryKey: ['admin', 'riders', 'assign', onlineOnly ? 'online' : 'all'],
    queryFn: () =>
      adminApi.listRiders({
        online: onlineOnly ? 'true' : undefined,
        status: 'active',
      }),
    enabled: canAssign,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['admin', 'trip', id, 'messages'],
    queryFn: () => adminApi.listTripMessages(id),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });

  const mut = useMutation({
    mutationFn: (status: string) =>
      adminApi.updateTripStatus(
        id,
        status,
        status === 'cancelled' ? cancelReason : undefined,
      ),
    onSuccess: () => {
      setMessage('Trip updated');
      void qc.invalidateQueries({ queryKey: ['admin', 'trip', id] });
      void qc.invalidateQueries({ queryKey: ['admin', 'trips'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const assignMut = useMutation({
    mutationFn: (driverId: string) => adminApi.assignTripDriver(id, driverId),
    onSuccess: () => {
      setMessage('Driver assigned');
      setAssignDriverId('');
      void qc.invalidateQueries({ queryKey: ['admin', 'trip', id] });
      void qc.invalidateQueries({ queryKey: ['admin', 'trips'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'riders'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-[360px] w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="skeleton h-48" />
          <div className="skeleton h-48" />
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="space-y-4">
        <Link to="/trips" className="text-sm font-bold text-trigo hover:underline">
          ← Back to trips
        </Link>
        <Flash tone="error">
          {(error as Error)?.message || 'Trip not found'}
        </Flash>
      </div>
    );
  }

  const passengerName =
    trip.passenger?.name ||
    [trip.passenger?.firstname, trip.passenger?.lastname]
      .filter(Boolean)
      .join(' ') ||
    trip.passenger?.email ||
    (trip.passengerId ? `User #${trip.passengerId}` : 'Unknown passenger');

  const passengerId = trip.passenger?.id || trip.passengerId;
  const driver = trip.driver;
  const fare = trip.fare || { total: 0 };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/trips" className="text-sm font-bold text-trigo hover:underline">
          ← Back to trips
        </Link>
        <PageHeader
          title={`Trip #${trip.id}`}
          description={`${trip.pickup?.name || 'Pickup'} → ${trip.destination?.name || 'Drop-off'}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={trip.status} />
              {trip.rideType ? (
                <span className="inline-flex rounded-lg bg-ink/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">
                  {trip.rideType}
                </span>
              ) : null}
            </div>
          }
        />
      </div>

      {message ? <Flash>{message}</Flash> : null}

      <section className="ui-panel overflow-hidden p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              Route map
            </div>
            <p className="mt-1 text-xs font-medium text-muted">
              Pickup (A) · Drop-off (B)
              {driver?.location ? ' · Driver live pin' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-bold text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-trigo" /> Pickup
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber" /> Drop-off
            </span>
            {driver?.location ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Driver
              </span>
            ) : null}
          </div>
        </div>
        <TripMap
          pickup={trip.pickup?.coordinates}
          destination={trip.destination?.coordinates}
          polyline={trip.polyline}
          driverLocation={driver?.location}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="ui-panel p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-trigo/10 text-trigo">
              <Route size={18} />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
                Trip details
              </div>
              <h2 className="text-lg font-extrabold tracking-[-0.03em]">
                Full ride summary
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-line/80 bg-canvas/60 p-4">
              <div className="flex items-center gap-2 text-trigo">
                <MapPin size={16} />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Pickup
                </span>
              </div>
              <div className="mt-2 text-sm font-extrabold">{trip.pickup?.name}</div>
              <div className="mt-1 text-xs font-medium text-muted">
                {trip.pickup?.address || 'No address'}
              </div>
              {trip.pickup?.coordinates ? (
                <div className="mt-2 text-[11px] font-semibold text-muted">
                  {trip.pickup.coordinates.latitude.toFixed(5)},{' '}
                  {trip.pickup.coordinates.longitude.toFixed(5)}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-line/80 bg-canvas/60 p-4">
              <div className="flex items-center gap-2 text-amber">
                <Navigation size={16} />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Drop-off
                </span>
              </div>
              <div className="mt-2 text-sm font-extrabold">
                {trip.destination?.name}
              </div>
              <div className="mt-1 text-xs font-medium text-muted">
                {trip.destination?.address || 'No address'}
              </div>
              {trip.destination?.coordinates ? (
                <div className="mt-2 text-[11px] font-semibold text-muted">
                  {trip.destination.coordinates.latitude.toFixed(5)},{' '}
                  {trip.destination.coordinates.longitude.toFixed(5)}
                </div>
              ) : null}
            </div>
          </div>

          <dl className="mt-4">
            <DetailRow label="Distance" value={`${Number(trip.distanceKm || 0).toFixed(2)} km`} />
            <DetailRow label="Duration" value={`${Number(trip.durationMin || 0).toFixed(0)} min`} />
            <DetailRow label="ETA" value={trip.etaMin != null ? `${trip.etaMin} min` : '—'} />
            <DetailRow label="Payment" value={trip.paymentMethod || 'cash'} />
            <DetailRow label="Promo" value={trip.promoCode || '—'} />
            <DetailRow label="Notes" value={trip.notes || '—'} />
            <DetailRow label="Created" value={formatWhen(trip.createdAt)} />
            <DetailRow label="Started" value={formatWhen(trip.startedAt)} />
            <DetailRow label="Completed" value={formatWhen(trip.completedAt)} />
            {trip.cancelReason ? (
              <DetailRow
                label="Cancel reason"
                value={
                  <span className="text-rose-700">{trip.cancelReason}</span>
                }
              />
            ) : null}
            {trip.rating != null ? (
              <DetailRow label="Rating" value={`${trip.rating}★`} />
            ) : null}
            {trip.review ? <DetailRow label="Review" value={trip.review} /> : null}
          </dl>
        </div>

        <div className="ui-panel relative overflow-hidden p-5">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber/15 text-amber">
                <Wallet size={18} />
              </div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
                Fare breakdown
              </div>
            </div>
            <div className="mt-4 text-3xl font-extrabold tracking-[-0.04em]">
              {naira(fare.total)}
            </div>
            <div className="text-xs font-semibold text-muted">
              {fare.currency || 'NGN'}
            </div>
            <dl className="mt-4">
              <DetailRow label="Base" value={naira(fare.baseFare)} />
              <DetailRow label="Distance" value={naira(fare.distanceFare)} />
              <DetailRow label="Time" value={naira(fare.timeFare)} />
              <DetailRow label="Discount" value={naira(fare.discount)} />
              <DetailRow label="Tax" value={naira(fare.tax)} />
            </dl>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="ui-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-trigo/10 text-trigo">
                <UserRound size={18} />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
                  Passenger
                </div>
                <h3 className="text-lg font-extrabold tracking-[-0.03em]">
                  {passengerName}
                </h3>
              </div>
            </div>
            {passengerId ? (
              <Link
                to={`/users/${passengerId}`}
                className="ui-btn ui-btn-ghost !px-3 !py-2 text-xs"
              >
                View user
              </Link>
            ) : null}
          </div>
          <dl className="mt-4">
            <DetailRow label="Email" value={trip.passenger?.email || '—'} />
            <DetailRow label="Phone" value={trip.passenger?.phone || '—'} />
            <DetailRow label="User ID" value={passengerId ? `#${passengerId}` : '—'} />
          </dl>
          {passengerId ? (
            <Link
              to={`/wallets/${passengerId}`}
              className="ui-btn ui-btn-primary mt-4"
            >
              Open wallet
            </Link>
          ) : null}
        </div>

        <div className="ui-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber/15 text-amber">
                <Bike size={18} />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
                  Rider / driver
                </div>
                <h3 className="text-lg font-extrabold tracking-[-0.03em]">
                  {driver?.name || 'Unassigned'}
                </h3>
              </div>
            </div>
            {driver?.id ? (
              <Link
                to={`/riders/${driver.id}`}
                className="ui-btn ui-btn-ghost !px-3 !py-2 text-xs"
              >
                View rider
              </Link>
            ) : null}
          </div>

          {!driver ? (
            <p className="mt-4 text-sm font-medium text-muted">
              No rider has been assigned to this trip yet.
            </p>
          ) : (
            <>
              <dl className="mt-4">
                <DetailRow label="Phone" value={driver.phone || '—'} />
                <DetailRow
                  label="Rating"
                  value={
                    driver.rating != null
                      ? `${Number(driver.rating).toFixed(2)}★`
                      : '—'
                  }
                />
                <DetailRow
                  label="Completed trips"
                  value={driver.completedTrips ?? '—'}
                />
                <DetailRow
                  label="Availability"
                  value={
                    <span className="capitalize">
                      {driver.isOnline ? 'Online' : 'Offline'}
                      {driver.isAvailable ? ' · available' : ' · busy'}
                    </span>
                  }
                />
                <DetailRow
                  label="Vehicle"
                  value={
                    driver.vehicle
                      ? `${driver.vehicle.color || ''} ${driver.vehicle.model || 'keke'} · ${driver.vehicle.plateNumber || 'No plate'}`.trim()
                      : '—'
                  }
                />
                <DetailRow
                  label="Ride type"
                  value={
                    <span className="capitalize">
                      {driver.vehicle?.type || trip.rideType || 'standard'}
                    </span>
                  }
                />
                {driver.location ? (
                  <DetailRow
                    label="Last location"
                    value={`${driver.location.latitude.toFixed(5)}, ${driver.location.longitude.toFixed(5)}`}
                  />
                ) : null}
              </dl>
              {driver.userId ? (
                <Link
                  to={`/wallets/${driver.userId}`}
                  className="ui-btn ui-btn-primary mt-4"
                >
                  Open rider wallet
                </Link>
              ) : null}
            </>
          )}

          {canAssign ? (
            <div className="mt-5 border-t border-line/70 pt-4">
              <div className="text-xs font-bold uppercase tracking-wide text-muted">
                {driver ? 'Reassign rider' : 'Assign rider'}
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={onlineOnly}
                  onChange={(e) => setOnlineOnly(e.target.checked)}
                />
                Online only
              </label>
              <select
                className="ui-input mt-2"
                value={assignDriverId}
                onChange={(e) => setAssignDriverId(e.target.value)}
                disabled={ridersLoading || assignMut.isPending}
              >
                <option value="">
                  {ridersLoading ? 'Loading riders…' : 'Select a rider'}
                </option>
                {riders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name || `Rider #${r.id}`}
                    {r.isOnline ? ' · online' : ' · offline'}
                    {r.isAvailable ? ' · free' : ' · busy'}
                    {r.rating != null
                      ? ` · ${Number(r.rating).toFixed(1)}★`
                      : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="ui-btn ui-btn-primary mt-3 w-full disabled:opacity-50"
                disabled={!assignDriverId || assignMut.isPending}
                onClick={() => assignMut.mutate(assignDriverId)}
              >
                {assignMut.isPending
                  ? 'Assigning…'
                  : driver
                    ? 'Reassign selected rider'
                    : 'Assign selected rider'}
              </button>
              <p className="mt-2 text-[11px] font-medium text-muted">
                Stops auto-matching and sets the trip to accepted.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="ui-panel p-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-trigo/10 text-trigo">
            <MessageSquare size={18} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              Trip chat
            </div>
            <h2 className="text-lg font-extrabold tracking-[-0.03em]">
              Passenger ↔ rider messages
            </h2>
          </div>
        </div>

        {messagesLoading ? (
          <div className="mt-4 space-y-2">
            <div className="skeleton h-10" />
            <div className="skeleton h-10" />
          </div>
        ) : messages.length === 0 ? (
          <p className="mt-4 text-sm font-medium text-muted">
            No messages on this trip yet.
          </p>
        ) : (
          <ul className="mt-4 max-h-[360px] space-y-2 overflow-y-auto">
            {messages.map((msg) => {
              const fromDriver = msg.senderRole === 'driver';
              const fromSystem = msg.senderRole === 'system';
              return (
                <li
                  key={msg.id}
                  className={[
                    'rounded-2xl px-3.5 py-2.5 text-sm',
                    fromSystem
                      ? 'bg-canvas text-muted'
                      : fromDriver
                        ? 'ml-6 bg-amber/10'
                        : 'mr-6 bg-trigo/10',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                    <span>
                      {fromSystem
                        ? 'System'
                        : fromDriver
                          ? 'Rider'
                          : 'Passenger'}
                    </span>
                    <span className="font-semibold normal-case tracking-normal">
                      {formatWhen(msg.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 font-semibold text-ink">{msg.message}</div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="ui-panel p-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-trigo/10 text-trigo">
            <Clock3 size={18} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              Admin actions
            </div>
            <h2 className="text-lg font-extrabold tracking-[-0.03em]">
              Override trip status
            </h2>
          </div>
        </div>
        <label className="mt-4 block max-w-md text-sm font-bold">
          Cancel reason
          <input
            className="ui-input mt-1.5"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {ACTIONS.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={mut.isPending || trip.status === action.status}
              onClick={() => mut.mutate(action.status)}
              className={`ui-btn disabled:opacity-50 ${
                action.danger ? 'ui-btn-danger' : 'ui-btn-ghost'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
