import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { LocationPinMap } from '../components/LocationPinMap';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';

function formatWhen(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function SosDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'sos', id],
    queryFn: () => adminApi.getSos(id),
    enabled: Boolean(id),
  });

  const mut = useMutation({
    mutationFn: (status: string) => adminApi.updateSos(id, status),
    onSuccess: () => {
      setMessage('SOS updated');
      void qc.invalidateQueries({ queryKey: ['admin', 'sos'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-[320px] w-full" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  if (error || !data?.event) {
    return (
      <div className="space-y-4">
        <Link to="/sos" className="text-sm font-bold text-trigo hover:underline">
          ← Back to SOS
        </Link>
        <Flash tone="error">
          {(error as Error)?.message || 'SOS event not found'}
        </Flash>
      </div>
    );
  }

  const event = data.event;
  const trip = data.trip;
  const partners =
    event.notifiedContacts && event.notifiedContacts.length
      ? event.notifiedContacts
      : data.trustedPartners || [];
  const hasCoords =
    event.latitude != null &&
    event.longitude != null &&
    Number.isFinite(event.latitude) &&
    Number.isFinite(event.longitude);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/sos" className="text-sm font-bold text-trigo hover:underline">
          ← Back to SOS
        </Link>
        <PageHeader
          title={`SOS #${event.id}`}
          description={
            event.user?.name ||
            (event.userId ? `User #${event.userId}` : 'Unknown reporter')
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={event.status} />
              {event.status === 'active' ? (
                <button
                  type="button"
                  disabled={mut.isPending}
                  onClick={() => mut.mutate('resolved')}
                  className="ui-btn ui-btn-primary disabled:opacity-60"
                >
                  {mut.isPending ? 'Saving…' : 'Resolve'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={mut.isPending}
                  onClick={() => mut.mutate('active')}
                  className="ui-btn ui-btn-ghost disabled:opacity-60"
                >
                  {mut.isPending ? 'Saving…' : 'Reopen'}
                </button>
              )}
            </div>
          }
        />
      </div>

      {message ? <Flash>{message}</Flash> : null}

      {event.status === 'active' ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm font-semibold text-rose-800">
          Active safety alert — contact the person and resolve only after they
          are safe.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {hasCoords ? (
            <LocationPinMap
              latitude={Number(event.latitude)}
              longitude={Number(event.longitude)}
              label={`SOS #${event.id}`}
            />
          ) : (
            <div className="flex min-h-[280px] items-center justify-center rounded-[1.25rem] border border-dashed border-line bg-canvas/70 text-sm font-medium text-muted">
              No coordinates were sent with this alert
            </div>
          )}
        </div>

        <section className="ui-panel space-y-4 p-5 lg:col-span-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              Reporter
            </div>
            <div className="mt-2 text-lg font-extrabold">
              {event.user?.name || 'Unknown'}
            </div>
            <div className="text-sm font-medium text-muted">
              {event.user?.phone || event.user?.email || 'No contact'}
            </div>
            {event.userId ? (
              <Link
                to={`/users/${event.userId}`}
                className="mt-2 inline-block text-xs font-bold text-trigo hover:underline"
              >
                View user
              </Link>
            ) : null}
          </div>

          <div className="border-t border-line pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
                Trusted partners
              </div>
              <div className="text-[11px] font-bold text-muted">
                {partners.length}
              </div>
            </div>
            {!partners.length ? (
              <p className="mt-2 text-sm font-medium text-muted">
                This user has no trusted partners saved.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {partners.map((contact, index) => (
                  <li
                    key={contact.id || `${contact.phone}-${index}`}
                    className="rounded-xl border border-line bg-canvas/60 px-3 py-2.5"
                  >
                    <div className="text-sm font-extrabold">
                      {contact.name || 'Unknown'}
                      {contact.isPrimary ? (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-trigo">
                          Primary
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-sm font-medium text-muted">
                      {contact.phone || 'No phone'}
                      {contact.relationship ? ` · ${contact.relationship}` : ''}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted">
                        {contact.notified
                          ? 'SMS sent'
                          : contact.channel === 'live'
                            ? 'From user Safety contacts'
                            : 'Included on this alert'}
                      </span>
                      {contact.phone ? (
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-xs font-bold text-trigo hover:underline"
                        >
                          Call
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-line pt-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              Note
            </div>
            <p className="mt-2 text-sm font-medium">
              {event.note || 'No note provided'}
            </p>
          </div>

          <div className="border-t border-line pt-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              Location
            </div>
            <div className="mt-2 text-sm font-semibold">
              {hasCoords
                ? `${Number(event.latitude).toFixed(5)}, ${Number(event.longitude).toFixed(5)}`
                : '—'}
            </div>
            {hasCoords ? (
              <a
                href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-bold text-trigo hover:underline"
              >
                Open in Google Maps
              </a>
            ) : null}
          </div>

          <div className="border-t border-line pt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-semibold text-muted">Created</span>
              <span className="font-bold">{formatWhen(event.createdAt)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-semibold text-muted">Updated</span>
              <span className="font-bold">{formatWhen(event.updatedAt)}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="ui-panel p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
          Linked trip
        </div>
        {!trip ? (
          <p className="mt-3 text-sm font-medium text-muted">
            {event.tripId
              ? `Trip #${event.tripId} could not be loaded`
              : 'No trip linked to this SOS'}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link
                to={`/trips/${trip.id}`}
                className="text-lg font-extrabold text-trigo hover:underline"
              >
                Trip #{trip.id}
              </Link>
              <div className="mt-1 text-sm font-semibold">
                {trip.pickup?.name} → {trip.destination?.name}
              </div>
              <div className="mt-1 text-xs font-medium text-muted">
                {trip.passenger?.name || trip.passenger?.email || 'Passenger'}
                {trip.driver?.name ? ` · ${trip.driver.name}` : ' · No rider'}
              </div>
            </div>
            <StatusBadge status={trip.status} />
          </div>
        )}
      </section>
    </div>
  );
}
