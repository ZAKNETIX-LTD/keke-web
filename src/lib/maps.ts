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

const BRAND = {
  teal: '#10A090',
  amber: '#E8AC0C',
  kekeYellow: '#F5C518',
  kekeRoof: '#2D3748',
} as const;

function svgMapIcon(
  svg: string,
  width: number,
  height: number,
  anchorX: number,
  anchorY: number,
): google.maps.Icon | undefined {
  if (typeof google === 'undefined' || !google.maps?.Size) return undefined;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`,
    scaledSize: new google.maps.Size(width, height),
    anchor: new google.maps.Point(anchorX, anchorY),
  };
}

export function pinSvg(label: string, color: string): google.maps.Icon | undefined {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="15" fill="${color}" stroke="white" stroke-width="3"/>
      <text x="17" y="22" text-anchor="middle" fill="white" font-size="13" font-family="Arial" font-weight="700">${label}</text>
    </svg>
  `;
  return svgMapIcon(svg, 34, 34, 17, 17);
}

export type MapPinKind = 'passenger' | 'driver' | 'driverCar' | 'pickup' | 'dropoff';

function teardropPinSvg(label: string, fill: string): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 1C8.8 1 3 6.8 3 14c0 9.5 13 24.5 13 24.5S29 23.5 29 14C29 6.8 23.2 1 16 1z" fill="${fill}" stroke="white" stroke-width="2"/>
      <text x="16" y="19" text-anchor="middle" fill="white" font-size="14" font-family="Arial" font-weight="700">${label}</text>
    </svg>
  `;
}

function kekePinSvg(): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <ellipse cx="18" cy="33" rx="8" ry="2" fill="#000" opacity="0.18"/>
      <rect x="8" y="14" width="20" height="10" rx="2" fill="${BRAND.kekeYellow}"/>
      <path d="M10 14 L14 8 L24 8 L26 14 Z" fill="${BRAND.kekeRoof}"/>
      <rect x="11" y="15" width="6" height="5" rx="1" fill="${BRAND.kekeRoof}" opacity="0.85"/>
      <circle cx="12" cy="26" r="3.5" fill="#1a202c"/>
      <circle cx="24" cy="26" r="3.5" fill="#1a202c"/>
      <circle cx="12" cy="26" r="1.5" fill="#cbd5e1"/>
      <circle cx="24" cy="26" r="1.5" fill="#cbd5e1"/>
    </svg>
  `;
}

function carPinSvg(): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <path d="M6 34 L20 22 L34 34 Z" fill="${BRAND.teal}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M10 22 h20 l-2.5-6.5c-.4-1-1.2-1.5-2.3-1.5H14.8c-1.1 0-1.9.5-2.3 1.5L10 22z" fill="white" stroke="#cbd5e1" stroke-width="0.75"/>
      <rect x="12.5" y="14" width="6" height="4.5" rx="0.75" fill="${BRAND.kekeRoof}" opacity="0.9"/>
      <rect x="21.5" y="14" width="6" height="4.5" rx="0.75" fill="${BRAND.kekeRoof}" opacity="0.9"/>
      <circle cx="14" cy="22.5" r="2.2" fill="#1a202c"/>
      <circle cx="26" cy="22.5" r="2.2" fill="#1a202c"/>
      <circle cx="14" cy="22.5" r="0.9" fill="${BRAND.teal}"/>
      <circle cx="26" cy="22.5" r="0.9" fill="${BRAND.teal}"/>
    </svg>
  `;
}

function passengerPinSvg(): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="12" fill="${BRAND.teal}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="11" r="3.5" fill="white"/>
      <path d="M8.5 21c.8-3 2.7-4.5 5.5-4.5s4.7 1.5 5.5 4.5" fill="white"/>
    </svg>
  `;
}

/** Transparent SVG pins — PNG assets had baked white/black box backgrounds on web maps. */
export function mapPinIcon(kind: MapPinKind): google.maps.Icon | undefined {
  switch (kind) {
    case 'pickup':
      return svgMapIcon(teardropPinSvg('A', BRAND.teal), 32, 40, 16, 37);
    case 'dropoff':
      return svgMapIcon(teardropPinSvg('B', BRAND.amber), 32, 40, 16, 37);
    case 'driver':
      return svgMapIcon(kekePinSvg(), 36, 36, 18, 30);
    case 'driverCar':
      return svgMapIcon(carPinSvg(), 40, 40, 20, 34);
    case 'passenger':
      return svgMapIcon(passengerPinSvg(), 28, 28, 14, 14);
    default:
      return undefined;
  }
}
