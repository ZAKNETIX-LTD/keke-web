import { useEffect, useMemo, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

import { GOOGLE_MAPS_API_KEY } from '../lib/types';

export type MapCoord = { latitude: number; longitude: number };

const LIBRARIES: ('geometry' | 'places')[] = ['geometry'];

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

export function isValidCoord(c?: MapCoord | null): c is MapCoord {
  return Boolean(
    c &&
      Number.isFinite(c.latitude) &&
      Number.isFinite(c.longitude) &&
      !(c.latitude === 0 && c.longitude === 0),
  );
}

export function toLatLngLiteral(c: MapCoord): google.maps.LatLngLiteral {
  return { lat: c.latitude, lng: c.longitude };
}

export function straightPath(
  pickup?: MapCoord | null,
  destination?: MapCoord | null,
): google.maps.LatLngLiteral[] {
  const ends: google.maps.LatLngLiteral[] = [];
  if (isValidCoord(pickup)) ends.push(toLatLngLiteral(pickup));
  if (isValidCoord(destination)) ends.push(toLatLngLiteral(destination));
  return ends;
}

/** True when polyline is missing or only a straight A→B segment. */
export function needsRoadRoute(polyline?: MapCoord[] | null) {
  const pts = (polyline || []).filter(isValidCoord);
  return pts.length < 3;
}

export function useGoogleMaps() {
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    const previous = window.gm_authFailure;
    window.gm_authFailure = () => {
      setAuthFailed(true);
      if (typeof previous === 'function') previous();
    };
    return () => {
      if (previous) window.gm_authFailure = previous;
      else delete window.gm_authFailure;
    };
  }, []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'trigo-admin-maps',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || 'invalid',
    libraries: LIBRARIES,
  });

  const blocked =
    authFailed ||
    Boolean(
      loadError &&
        /ApiTargetBlocked|RefererNotAllowed|InvalidKey|Unauthorized/i.test(
          String(loadError.message || loadError),
        ),
    );

  return {
    isLoaded: Boolean(GOOGLE_MAPS_API_KEY) && isLoaded && !blocked,
    loadError: !GOOGLE_MAPS_API_KEY
      ? new Error('Missing VITE_GOOGLE_MAPS_API_KEY')
      : loadError,
    hasKey: Boolean(GOOGLE_MAPS_API_KEY),
    authFailed: blocked,
    shouldUseFallback: !GOOGLE_MAPS_API_KEY || blocked || Boolean(loadError),
  };
}

async function fetchGoogleDirectionsPath(
  pickup: MapCoord,
  destination: MapCoord,
): Promise<google.maps.LatLngLiteral[]> {
  return new Promise((resolve) => {
    if (typeof google === 'undefined' || !google.maps?.DirectionsService) {
      resolve(straightPath(pickup, destination));
      return;
    }
    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: toLatLngLiteral(pickup),
        destination: toLatLngLiteral(destination),
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result?.routes?.[0]) {
          const overview = result.routes[0].overview_path;
          if (overview?.length) {
            resolve(overview.map((p) => ({ lat: p.lat(), lng: p.lng() })));
            return;
          }
        }
        resolve(straightPath(pickup, destination));
      },
    );
  });
}

/**
 * Prefer stored detailed polyline; otherwise request Google Directions.
 */
export function useRoadPath(
  pickup?: MapCoord | null,
  destination?: MapCoord | null,
  polyline?: MapCoord[] | null,
  options?: { googleReady?: boolean; enabled?: boolean },
) {
  const enabled = options?.enabled !== false;
  const googleReady = Boolean(options?.googleReady);
  const stored = useMemo(
    () => (polyline || []).filter(isValidCoord).map(toLatLngLiteral),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      polyline?.length,
      polyline?.[0]?.latitude,
      polyline?.[0]?.longitude,
      polyline?.[polyline.length - 1]?.latitude,
      polyline?.[polyline.length - 1]?.longitude,
    ],
  );

  const [roadPath, setRoadPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [loading, setLoading] = useState(false);

  const pickupKey = isValidCoord(pickup)
    ? `${pickup.latitude},${pickup.longitude}`
    : '';
  const destKey = isValidCoord(destination)
    ? `${destination.latitude},${destination.longitude}`
    : '';

  useEffect(() => {
    if (!enabled) {
      setRoadPath([]);
      return;
    }

    if (stored.length >= 3) {
      setRoadPath(stored);
      setLoading(false);
      return;
    }

    if (!isValidCoord(pickup) || !isValidCoord(destination)) {
      setRoadPath(stored.length ? stored : straightPath(pickup, destination));
      return;
    }

    let cancelled = false;
    setLoading(true);

    const run = async () => {
      try {
        const path = googleReady
          ? await fetchGoogleDirectionsPath(pickup, destination)
          : straightPath(pickup, destination);
        if (!cancelled) {
          setRoadPath(path.length >= 2 ? path : straightPath(pickup, destination));
        }
      } catch {
        if (!cancelled) setRoadPath(straightPath(pickup, destination));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [enabled, googleReady, pickupKey, destKey, stored.length]);

  const path =
    roadPath.length >= 2
      ? roadPath
      : stored.length >= 2
        ? stored
        : straightPath(pickup, destination);

  return { path, loading };
}

export function usePath(
  pickup?: MapCoord | null,
  destination?: MapCoord | null,
  polyline?: MapCoord[],
) {
  return useMemo(() => {
    const fromPoly = (polyline || []).filter(isValidCoord).map(toLatLngLiteral);
    if (fromPoly.length >= 2) return fromPoly;
    return straightPath(pickup, destination);
  }, [pickup, destination, polyline]);
}

export function fitMapToPoints(
  map: google.maps.Map | null,
  points: google.maps.LatLngLiteral[],
  singleZoom = 14,
) {
  if (!map || !points.length) return;
  try {
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(singleZoom);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 56);
  } catch {
    // Ignore when Maps JS API is blocked mid-render.
  }
}

export const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};

export const DEFAULT_MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  clickableIcons: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
  styles: [
    {
      featureType: 'poi',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

export function pinSvg(label: string, color: string): google.maps.Icon | undefined {
  if (typeof google === 'undefined' || !google.maps?.Size) return undefined;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="15" fill="${color}" stroke="white" stroke-width="3"/>
      <text x="17" y="22" text-anchor="middle" fill="white" font-size="13" font-family="Arial" font-weight="700">${label}</text>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(34, 34),
    anchor: new google.maps.Point(17, 17),
  };
}

export type MapPinKind = 'passenger' | 'driver' | 'pickup' | 'dropoff';

export function mapPinIcon(kind: MapPinKind): google.maps.Icon | undefined {
  if (typeof google === 'undefined' || !google.maps?.Size) return undefined;
  const size = kind === 'driver' ? 72 : kind === 'passenger' ? 48 : 52;
  const pin = kind === 'passenger';
  return {
    url: `/map/${kind}.png`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, pin ? size / 2 : size),
  };
}
