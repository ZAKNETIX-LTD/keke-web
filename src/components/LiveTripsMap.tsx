import {
  GoogleMap,
  MarkerF,
  PolylineF,
} from '@react-google-maps/api';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import type { AdminTrip } from '../lib/types';
import { driverMapPinKind } from '../lib/vehicle';
import {
  DEFAULT_MAP_OPTIONS,
  MAP_CONTAINER_STYLE,
  fitMapToPoints,
  isValidCoord,
  mapPinIcon,
  straightPath,
  toLatLngLiteral,
  useGoogleMaps,
  useRoadPath,
} from '../lib/maps';

export function LiveTripsMap({
  trips,
  selectedId,
  onSelect,
  className = '',
  heightClass = 'h-[340px] md:h-[400px]',
}: {
  trips: AdminTrip[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  heightClass?: string;
}) {
  const { isLoaded, shouldUseFallback, loadError, hasKey } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [ready, setReady] = useState(false);
  const selected = trips.find((t) => t.id === selectedId) || null;

  const { path: selectedPath } = useRoadPath(
    selected?.pickup?.coordinates,
    selected?.destination?.coordinates,
    selected?.polyline,
    {
      googleReady: isLoaded && !shouldUseFallback,
      enabled: Boolean(selected),
    },
  );

  const points = useMemo(() => {
    const pts: google.maps.LatLngLiteral[] = [];
    trips.forEach((trip) => {
      if (isValidCoord(trip.pickup?.coordinates)) {
        pts.push(toLatLngLiteral(trip.pickup.coordinates));
      }
      if (isValidCoord(trip.destination?.coordinates)) {
        pts.push(toLatLngLiteral(trip.destination.coordinates));
      }
      if (isValidCoord(trip.driver?.location)) {
        pts.push(toLatLngLiteral(trip.driver.location));
      }
    });
    if (selectedPath.length) pts.push(...selectedPath);
    return pts;
  }, [trips, selectedPath]);

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
    fitMapToPoints(map, points);
  }, [map, points, ready]);

  if (shouldUseFallback || !hasKey) {
    return (
      <div
        className={`flex min-h-[320px] items-center justify-center rounded-[1.25rem] border border-dashed border-line bg-canvas/70 px-4 text-center text-sm font-medium text-muted ${className}`}
      >
        {loadError?.message ||
          'Google Maps is unavailable. Check VITE_GOOGLE_MAPS_API_KEY.'}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={`skeleton w-full rounded-[1.25rem] ${heightClass} ${className}`}
      />
    );
  }

  if (!trips.length || !points.length) {
    return (
      <div
        className={`flex min-h-[320px] items-center justify-center rounded-[1.25rem] border border-dashed border-line bg-canvas/70 text-sm font-medium text-muted ${className}`}
      >
        No trips with map coordinates
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[1.25rem] border border-line ${heightClass} ${className}`}
    >
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={points[0]}
        zoom={12}
        options={DEFAULT_MAP_OPTIONS}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {ready
          ? trips.map((trip) => {
              const active = trip.id === selectedId;
              const pickup = trip.pickup?.coordinates;
              const dropoff = trip.destination?.coordinates;
              const faint = straightPath(pickup, dropoff);

              return (
                <Fragment key={trip.id}>
                  {!active && faint.length >= 2 ? (
                    <PolylineF
                      path={faint}
                      options={{
                        strokeColor: '#94a3b8',
                        strokeOpacity: 0.35,
                        strokeWeight: 3,
                        clickable: true,
                      }}
                      onClick={() => onSelect?.(trip.id)}
                    />
                  ) : null}
                  {isValidCoord(pickup) ? (
                    <MarkerF
                      position={toLatLngLiteral(pickup)}
                      icon={mapPinIcon('pickup')}
                      title={`Trip #${trip.id} pickup`}
                      onClick={() => onSelect?.(trip.id)}
                    />
                  ) : null}
                  {isValidCoord(dropoff) ? (
                    <MarkerF
                      position={toLatLngLiteral(dropoff)}
                      icon={mapPinIcon('dropoff')}
                      title={`Trip #${trip.id} drop-off`}
                      onClick={() => onSelect?.(trip.id)}
                    />
                  ) : null}
                </Fragment>
              );
            })
          : null}

        {ready && selectedPath.length >= 2 ? (
          <PolylineF
            path={selectedPath}
            options={{
              strokeColor: '#4285F4',
              strokeOpacity: 0.95,
              strokeWeight: 6,
            }}
          />
        ) : null}

        {ready && selected && isValidCoord(selected.driver?.location) ? (
          <MarkerF
            position={toLatLngLiteral(selected.driver.location)}
            icon={mapPinIcon(
              driverMapPinKind(
                selected.driver.vehicle?.type || selected.rideType,
              ),
            )}
            title={
              selected.driver.vehicle?.type === 'car' ? 'Car' : 'Keke'
            }
          />
        ) : null}
      </GoogleMap>
    </div>
  );
}
