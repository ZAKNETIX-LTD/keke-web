import {
  GoogleMap,
  MarkerF,
  PolylineF,
} from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_MAP_OPTIONS,
  MAP_CONTAINER_STYLE,
  fitMapToPoints,
  isValidCoord,
  mapPinIcon,
  toLatLngLiteral,
  useGoogleMaps,
  useRoadPath,
  type MapCoord,
} from '../lib/maps';

function MapsUnavailable({
  className = '',
  message,
}: {
  className?: string;
  message: string;
}) {
  return (
    <div
      className={`flex h-[360px] items-center justify-center rounded-[1.25rem] border border-dashed border-line bg-canvas/70 px-4 text-center text-sm font-medium text-muted md:h-[420px] ${className}`}
    >
      {message}
    </div>
  );
}

export function TripMap({
  pickup,
  destination,
  polyline,
  driverLocation,
  className = '',
}: {
  pickup?: MapCoord | null;
  destination?: MapCoord | null;
  polyline?: MapCoord[];
  driverLocation?: MapCoord | null;
  className?: string;
}) {
  const { isLoaded, shouldUseFallback, loadError, hasKey } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [ready, setReady] = useState(false);
  const { path } = useRoadPath(pickup, destination, polyline, {
    googleReady: isLoaded && !shouldUseFallback,
    enabled: true,
  });

  const boundsPoints = useMemo(() => {
    const pts = [...path];
    if (isValidCoord(driverLocation)) pts.push(toLatLngLiteral(driverLocation));
    return pts;
  }, [path, driverLocation]);

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
    fitMapToPoints(map, boundsPoints);
  }, [map, boundsPoints, ready]);

  if (shouldUseFallback || !hasKey) {
    return (
      <MapsUnavailable
        className={className}
        message={
          loadError?.message ||
          'Google Maps is unavailable. Check VITE_GOOGLE_MAPS_API_KEY and Maps JavaScript API access.'
        }
      />
    );
  }

  if (!isLoaded || !boundsPoints.length) {
    return (
      <div
        className={`skeleton h-[360px] w-full rounded-[1.25rem] md:h-[420px] ${className}`}
      />
    );
  }

  return (
    <div
      className={`h-[360px] overflow-hidden rounded-[1.25rem] border border-line md:h-[420px] ${className}`}
    >
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={boundsPoints[0]}
        zoom={13}
        options={DEFAULT_MAP_OPTIONS}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {ready && path.length >= 2 ? (
          <PolylineF
            path={path}
            options={{
              strokeColor: '#4285F4',
              strokeOpacity: 0.95,
              strokeWeight: 6,
            }}
          />
        ) : null}
        {ready && isValidCoord(pickup) ? (
          <MarkerF
            position={toLatLngLiteral(pickup)}
            icon={mapPinIcon('pickup')}
            title="Pickup"
          />
        ) : null}
        {ready && isValidCoord(destination) ? (
          <MarkerF
            position={toLatLngLiteral(destination)}
            icon={mapPinIcon('dropoff')}
            title="Drop-off"
          />
        ) : null}
        {ready && isValidCoord(driverLocation) ? (
          <MarkerF
            position={toLatLngLiteral(driverLocation)}
            icon={mapPinIcon('driver')}
            title="Driver"
          />
        ) : null}
      </GoogleMap>
    </div>
  );
}
