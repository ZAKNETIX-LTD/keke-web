/** Admin UI vehicle category (passenger-facing ride tiers stay separate). */
export type AdminVehicleCategory = 'keke' | 'car';

export function toAdminVehicleCategory(
  raw?: string | null,
): AdminVehicleCategory {
  return String(raw || '').toLowerCase() === 'car' ? 'car' : 'keke';
}

/** Persist non-car vehicles as `standard` so matching aligns with keke ride tiers. */
export function toApiVehicleType(category: AdminVehicleCategory | string) {
  return String(category).toLowerCase() === 'car' ? 'car' : 'standard';
}

export function vehicleTypeLabel(raw?: string | null) {
  return toAdminVehicleCategory(raw) === 'car' ? 'Car' : 'Keke';
}

export function rideTypeLabel(raw?: string | null) {
  const type = String(raw || 'standard').toLowerCase();
  switch (type) {
    case 'car':
      return 'Car';
    case 'shared':
      return 'Shared (keke)';
    case 'express':
      return 'Express (keke)';
    case 'standard':
    case 'keke':
      return 'Standard (keke)';
    default:
      return type;
  }
}

export function driverMapPinKind(
  raw?: string | null,
  rideType?: string | null,
): 'driver' | 'driverCar' {
  if (toAdminVehicleCategory(raw) === 'car' || toAdminVehicleCategory(rideType) === 'car') {
    return 'driverCar';
  }
  return 'driver';
}

export const RIDE_RATE_LABELS: Record<string, string> = {
  standard: 'Standard (keke)',
  shared: 'Shared (keke)',
  express: 'Express (keke)',
  car: 'Car',
};
