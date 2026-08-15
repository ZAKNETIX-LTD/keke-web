import { GoogleMap, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_MAP_OPTIONS,
  MAP_CONTAINER_STYLE,
  fitMapToPoints,
  pinSvg,
  useGoogleMaps,
} from '../lib/maps';

function MapsUnavailable({
  className = '',
  heightClass = 'h-[320px] md:h-[380px]',
  message,
}: {
  className?: string;
  heightClass?: string;
  message: string;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-[1.25rem] border border-dashed border-line bg-canvas/70 px-4 text-center text-sm font-medium text-muted ${heightClass} ${className}`}
    >
      {message}
    </div>
  );
}

export function LocationPinMap({
  latitude,
  longitude,
  label = 'Location',
  className = '',
  heightClass = 'h-[320px] md:h-[380px]',
  pinLabel = 'SOS',
  pinColor = '#e11d48',
}: {
  latitude: number;
  longitude: number;
  label?: string;
  className?: string;
  heightClass?: string;
  pinLabel?: string;
  pinColor?: string;
}) {
  const { isLoaded, shouldUseFallback, loadError, hasKey } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  const point = useMemo(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude === 0 && longitude === 0) return null;
    return { lat: latitude, lng: longitude };
  }, [latitude, longitude]);

  const onLoad = useCallback((next: google.maps.Map) => {
    setMap(next);
    setReady(true);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
    setReady(false);
  }, []);

  useEffect(() => {
    if (!ready || !point) return;
    fitMapToPoints(map, [point], 15);
  }, [map, point, ready]);

  if (!point) {
    return (
      <MapsUnavailable
        className={className}
        heightClass={heightClass}
        message="No map coordinates"
      />
    );
  }

  if (shouldUseFallback || !hasKey) {
    return (
      <MapsUnavailable
        className={className}
        heightClass={heightClass}
        message={
          loadError?.message ||
          'Google Maps is unavailable. Check VITE_GOOGLE_MAPS_API_KEY.'
        }
      />
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={`skeleton w-full rounded-[1.25rem] ${heightClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-[1.25rem] border border-line ${heightClass} ${className}`}
    >
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={point}
        zoom={15}
        options={DEFAULT_MAP_OPTIONS}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {ready ? (
          <>
            <MarkerF
              position={point}
              icon={pinSvg(pinLabel, pinColor)}
              title={label}
              onClick={() => setShowInfo(true)}
            />
            {showInfo ? (
              <InfoWindowF
                position={point}
                onCloseClick={() => setShowInfo(false)}
              >
                <div className="text-sm font-semibold text-slate-800">{label}</div>
              </InfoWindowF>
            ) : null}
          </>
        ) : null}
      </GoogleMap>
    </div>
  );
}
