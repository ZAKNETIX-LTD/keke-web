import type { AdminTrip } from './types';

export function isCancelledTrip(status?: string | null) {
  return status === 'cancelled';
}

export function formatTripCancelReason(
  trip: Pick<AdminTrip, 'cancelReason' | 'status'>,
) {
  const reason = String(trip.cancelReason || '').trim();
  if (reason) return reason;
  if (isCancelledTrip(trip.status)) return 'No reason recorded';
  return '—';
}
