import {
  GoogleMap,
  InfoWindowF,
  MarkerF,
} from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import type { AdminRider } from '../lib/types';
import { driverMapPinKind, toAdminVehicleCategory, vehicleTypeLabel } from '../lib/vehicle';
import {
  DEFAULT_MAP_OPTIONS,
  MAP_CONTAINER_STYLE,
  fitMapToPoints,
  mapPinIcon,
  useGoogleMaps,
} from '../lib/maps';

function riderPoint(r: AdminRider): google.maps.LatLngLiteral | null {
  if (
    r.latitude == null ||
    r.longitude == null ||
    !Number.isFinite(Number(r.latitude)) ||
    !Number.isFinite(Number(r.longitude))
  ) {
    return null;
  }
  const lat = Number(r.latitude);
  const lng = Number(r.longitude);
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

const ABUJA = { lat: 9.0765, lng: 7.3986 };

export function LiveRidersPage() {
  const [onlineOnly, setOnlineOnly] = useState(true);
  const [vehicleFilter, setVehicleFilter] = useState<'all' | 'keke' | 'car'>(
    'all',
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [ready, setReady] = useState(false);
  const { isLoaded, shouldUseFallback, loadError, hasKey } = useGoogleMaps();

  const { data: riders = [], isLoading, error, isFetching } = useQuery({
    queryKey: ['admin', 'riders', 'map', onlineOnly ? 'online' : 'all'],
    queryFn: () =>
      adminApi.listRiders({
        online: onlineOnly ? 'true' : undefined,
        status: 'active',
      }),
    refetchInterval: 12_000,
  });

  const located = useMemo(
    () =>
      riders
        .map((r) => ({ rider: r, point: riderPoint(r) }))
        .filter(
          (x): x is { rider: AdminRider; point: google.maps.LatLngLiteral } =>
            Boolean(x.point),
        )
        .filter((x) =>
          vehicleFilter === 'all'
            ? true
            : toAdminVehicleCategory(x.rider.vehicle?.type) === vehicleFilter,
        ),
    [riders, vehicleFilter],
  );

  const points = useMemo(() => located.map((x) => x.point), [located]);
  const selected = located.find((x) => x.rider.id === selectedId) || null;

  const onLoad = useCallback((next: google.maps.Map) => {
    setMap(next);
    setReady(true);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
    setReady(false);
  }, []);

  useEffect(() => {
    if (!ready) return;
    fitMapToPoints(map, points.length ? points : [ABUJA], points.length ? 14 : 11);
  }, [map, points, ready]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live riders"
        description="Google Map of rider locations. Pins refresh about every 12 seconds."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="ui-input w-auto min-w-[120px]"
              value={vehicleFilter}
              onChange={(e) =>
                setVehicleFilter(e.target.value as 'all' | 'keke' | 'car')
              }
            >
              <option value="all">All vehicles</option>
              <option value="keke">Keke</option>
              <option value="car">Car</option>
            </select>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => setOnlineOnly(e.target.checked)}
              />
              Online only
              {isFetching ? (
                <span className="text-xs font-semibold text-muted">Updating…</span>
              ) : null}
            </label>
          </div>
        }
      />

      {error ? <Flash tone="error">{(error as Error).message}</Flash> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="ui-panel overflow-hidden p-2 sm:p-3">
          {isLoading || (!shouldUseFallback && !isLoaded) ? (
            <div className="skeleton h-[420px] w-full rounded-2xl" />
          ) : shouldUseFallback || !hasKey ? (
            <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/70 px-4 text-center text-sm font-medium text-muted">
              {loadError?.message ||
                'Google Maps is unavailable. Check VITE_GOOGLE_MAPS_API_KEY.'}
            </div>
          ) : (
            <div className="h-[420px] overflow-hidden rounded-2xl border border-line">
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={points[0] || ABUJA}
                zoom={12}
                options={DEFAULT_MAP_OPTIONS}
                onLoad={onLoad}
                onUnmount={onUnmount}
              >
                {ready
                  ? located.map(({ rider, point }) => (
                      <MarkerF
                        key={rider.id}
                        position={point}
                        icon={mapPinIcon(driverMapPinKind(rider.vehicle?.type))}
                        title={`${rider.name} · ${vehicleTypeLabel(rider.vehicle?.type)}`}
                        onClick={() => setSelectedId(rider.id)}
                      />
                    ))
                  : null}
                {ready && selected ? (
                  <InfoWindowF
                    position={selected.point}
                    onCloseClick={() => setSelectedId(null)}
                  >
                    <div className="min-w-[140px] text-sm">
                      <div className="font-extrabold text-slate-900">
                        {selected.rider.name}
                      </div>
                      <div className="text-xs text-slate-600">
                        {selected.rider.isOnline ? 'Online' : 'Offline'}
                        {selected.rider.isAvailable ? ' · available' : ' · busy'}
                      </div>
                      <div className="mt-1 text-xs text-slate-700">
                        {vehicleTypeLabel(selected.rider.vehicle?.type)}
                        {selected.rider.vehicle?.model
                          ? ` · ${selected.rider.vehicle.model}`
                          : ''}
                        {selected.rider.vehicle?.plateNumber
                          ? ` · ${selected.rider.vehicle.plateNumber}`
                          : ''}
                      </div>
                      <div className="mt-1 text-xs text-slate-700">
                        {Number(selected.rider.rating || 0).toFixed(1)}★ ·{' '}
                        {selected.rider.completedTrips} trips
                      </div>
                      <Link
                        to={`/riders/${selected.rider.id}`}
                        className="mt-2 inline-block text-xs font-bold text-teal-700"
                      >
                        Open profile
                      </Link>
                    </div>
                  </InfoWindowF>
                ) : null}
              </GoogleMap>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-3 px-2 text-xs font-bold text-muted">
            <span className="inline-flex items-center gap-1.5">
              <img src="/map/driver.png" alt="" className="h-5 w-5 object-contain" />{' '}
              Keke
            </span>
            <span className="inline-flex items-center gap-1.5">
              <img src="/map/driver-car.png" alt="" className="h-5 w-5 object-contain" />{' '}
              Car
            </span>
            <span>
              {located.length} located · {riders.length} listed
            </span>
          </div>
        </section>

        <aside className="ui-panel max-h-[460px] overflow-y-auto p-4">
          <h3 className="text-sm font-extrabold">Riders on map</h3>
          <p className="mt-0.5 text-xs font-medium text-muted">
            Missing pins have no last GPS fix.
          </p>
          <ul className="mt-3 space-y-2">
            {riders.length === 0 ? (
              <li className="text-sm font-medium text-muted">No riders found.</li>
            ) : (
              riders
                .filter((r) =>
                  vehicleFilter === 'all'
                    ? true
                    : toAdminVehicleCategory(r.vehicle?.type) === vehicleFilter,
                )
                .map((r) => {
                const hasPin = Boolean(riderPoint(r));
                return (
                  <li
                    key={r.id}
                    className="rounded-xl border border-line/70 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => {
                          if (hasPin) setSelectedId(r.id);
                        }}
                      >
                        <div className="truncate text-sm font-extrabold">
                          {r.name}
                        </div>
                        <div className="text-[11px] font-semibold text-muted">
                          {vehicleTypeLabel(r.vehicle?.type)}
                          {r.vehicle?.plateNumber
                            ? ` · ${r.vehicle.plateNumber}`
                            : ''}
                          {' · '}
                          {r.isOnline ? 'Online' : 'Offline'}
                          {r.isAvailable ? ' · free' : ' · busy'}
                          {hasPin ? '' : ' · no location'}
                        </div>
                      </button>
                      <Link
                        to={`/riders/${r.id}`}
                        className="text-[11px] font-bold text-trigo"
                      >
                        View
                      </Link>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
