import { api } from './client';
import type {
  AdminTrip,
  AdminUser,
  AdminRider,
  RiderKycPayload,
  SosEvent,
  SupportMessage,
  SupportTicket,
  WalletPayload,
} from '../lib/types';

export const adminApi = {
  stats(params?: { from?: string; to?: string }) {
    return api
      .get('/api/admin/stats', { params })
      .then((r) => r.data as DashboardPayload);
  },

  listUsers(params?: {
    q?: string;
    role?: string;
    status?: string;
    kind?: 'passenger' | 'rider' | 'staff' | 'all';
  }) {
    return api
      .get('/api/admin/users', { params })
      .then((r) => r.data.users as AdminUser[]);
  },

  listRiders(params?: {
    q?: string;
    status?: string;
    online?: string;
    kycStatus?: string;
  }) {
    return api
      .get('/api/admin/riders', { params })
      .then((r) => r.data.riders as AdminRider[]);
  },

  createRider(payload: Record<string, unknown>) {
    return api.post('/api/admin/riders', payload).then(
      (r) =>
        r.data as {
          rider: AdminRider;
          user: AdminUser;
        },
    );
  },

  updateRider(id: string, payload: Record<string, unknown>) {
    return api.patch(`/api/admin/riders/${id}`, payload).then(
      (r) =>
        r.data as {
          rider: AdminRider;
          user: AdminUser;
        },
    );
  },

  updateRiderKyc(id: string, payload: Record<string, unknown>) {
    return api.patch(`/api/admin/riders/${id}/kyc`, payload).then(
      (r) =>
        r.data as {
          rider: AdminRider;
          kyc: RiderKycPayload;
        },
    );
  },

  reviewRiderKyc(
    id: string,
    payload: { status: 'approved' | 'rejected'; reason?: string },
  ) {
    return api.post(`/api/admin/riders/${id}/kyc/review`, payload).then(
      (r) =>
        r.data as {
          rider: AdminRider;
          kyc: RiderKycPayload;
        },
    );
  },

  uploadFile(file: File) {
    const body = new FormData();
    body.append('file', file);
    return api
      .post('/api/uploads', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(
        (r) =>
          r.data as {
            url: string;
            path: string;
            mimeType: string;
            originalName: string;
          },
      );
  },

  getRider(id: string) {
    return api.get(`/api/admin/riders/${id}`).then(
      (r) =>
        r.data as {
          rider: AdminRider;
          user: AdminUser | null;
          kyc?: RiderKycPayload;
          wallet: WalletPayload;
          trips: AdminTrip[];
          ratings: {
            average: number;
            count: number;
            distribution: Record<string, number>;
            reviews: Array<{
              id: string;
              rating: number;
              review?: string | null;
              passenger?: {
                id?: string | null;
                name: string;
                email?: string | null;
              } | null;
              route: { pickup: string; destination: string };
              createdAt?: string | null;
            }>;
          };
          activity: {
            totalTrips: number;
            completed: number;
            cancelled: number;
            active: number;
            earnings: number;
            cancelRate: number;
          };
          sos: Array<{
            id: string;
            tripId?: string | null;
            note?: string | null;
            status: string;
            createdAt?: string;
          }>;
          tickets: SupportTicket[];
        },
    );
  },

  createUser(payload: Record<string, unknown>) {
    return api
      .post('/api/admin/users', payload)
      .then((r) => r.data.user as AdminUser);
  },

  updateUser(id: string, payload: Record<string, unknown>) {
    return api
      .patch(`/api/admin/users/${id}`, payload)
      .then((r) => r.data.user as AdminUser);
  },

  listTrips(params?: {
    q?: string;
    status?: string;
    scheduled?: string;
    page?: number;
    pageSize?: number;
  }) {
    return api.get('/api/admin/trips', { params }).then(
      (r) =>
        r.data as {
          trips: AdminTrip[];
          pagination?: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
          };
        },
    );
  },

  getTrip(id: string) {
    return api
      .get(`/api/admin/trips/${id}`)
      .then((r) => r.data.trip as AdminTrip);
  },

  listTripMessages(id: string) {
    return api.get(`/api/admin/trips/${id}/messages`).then(
      (r) =>
        r.data.messages as Array<{
          id: string;
          tripId: string;
          senderId?: string | null;
          senderRole: string;
          message: string;
          messageType?: string;
          createdAt?: string;
        }>,
    );
  },

  updateTripStatus(id: string, status: string, cancelReason?: string) {
    return api
      .patch(`/api/admin/trips/${id}/status`, { status, cancelReason })
      .then((r) => r.data.trip as AdminTrip);
  },

  assignTripDriver(id: string, driverId: string) {
    return api
      .post(`/api/admin/trips/${id}/assign`, { driverId })
      .then((r) => r.data.trip as AdminTrip);
  },

  listPromos() {
    return api
      .get('/api/admin/promos')
      .then((r) => r.data.promos as AdminPromo[]);
  },

  createPromo(payload: Partial<AdminPromo> & { code: string; discountValue: number }) {
    return api
      .post('/api/admin/promos', payload)
      .then((r) => r.data.promo as AdminPromo);
  },

  updatePromo(id: string, payload: Partial<AdminPromo>) {
    return api
      .patch(`/api/admin/promos/${id}`, payload)
      .then((r) => r.data.promo as AdminPromo);
  },

  deletePromo(id: string) {
    return api.delete(`/api/admin/promos/${id}`).then((r) => r.data as { message: string });
  },

  reports(params?: { from?: string; to?: string }) {
    return api
      .get('/api/admin/reports', { params })
      .then((r) => r.data as ReportsPayload);
  },

  listSos(params?: { status?: string }) {
    return api
      .get('/api/admin/sos', { params })
      .then((r) => r.data.events as SosEvent[]);
  },

  getSos(id: string) {
    return api.get(`/api/admin/sos/${id}`).then(
      (r) =>
        r.data as {
          event: SosEvent;
          trip: AdminTrip | null;
          trustedPartners?: SosEvent['notifiedContacts'];
        },
    );
  },

  updateSos(id: string, status: string) {
    return api
      .patch(`/api/admin/sos/${id}`, { status })
      .then((r) => r.data.event as SosEvent);
  },

  listTickets(params?: { status?: string }) {
    return api
      .get('/api/admin/tickets', { params })
      .then((r) => r.data.tickets as SupportTicket[]);
  },

  getTicket(id: string) {
    return api.get(`/api/admin/tickets/${id}`).then(
      (r) =>
        r.data as {
          ticket: SupportTicket;
          trip: AdminTrip | null;
          messages: SupportMessage[];
        },
    );
  },

  sendTicketMessage(
    id: string,
    payload: { message: string; status?: string },
  ) {
    return api
      .post(`/api/admin/tickets/${id}/messages`, payload)
      .then(
        (r) =>
          r.data as {
            message: SupportMessage;
            ticket: SupportTicket;
            messages: SupportMessage[];
          },
      );
  },

  updateTicket(id: string, payload: { response?: string; status?: string }) {
    return api
      .patch(`/api/admin/tickets/${id}`, payload)
      .then((r) => r.data.ticket as SupportTicket);
  },

  getWallet(userId: string) {
    return api.get(`/api/admin/wallets/${userId}`).then(
      (r) =>
        r.data as {
          user: AdminUser;
          wallet: WalletPayload;
        },
    );
  },

  listWallets(params?: { q?: string; kind?: string }) {
    return api.get('/api/admin/wallets', { params }).then(
      (r) =>
        r.data as {
          wallets: Array<{
            user: AdminUser;
            kind: 'rider' | 'passenger' | string;
            balance: number;
            currency: string;
            walletId?: string | null;
            updatedAt?: string | null;
          }>;
          summary: {
            users: number;
            withBalance: number;
            totalBalance: number;
            currency: string;
          };
        },
    );
  },

  adjustWallet(
    userId: string,
    payload: { amount: number; type: 'credit' | 'debit'; note?: string },
  ) {
    return api.post(`/api/admin/wallets/${userId}/adjust`, payload).then(
      (r) =>
        r.data as {
          user: AdminUser;
          wallet: WalletPayload;
        },
    );
  },

  listPayouts(params?: { status?: string }) {
    return api.get('/api/admin/payouts', { params }).then(
      (r) =>
        r.data as {
          payouts: AdminPayout[];
          summary: { pending: number; approved: number };
        },
    );
  },

  createPayout(payload: {
    userId: string;
    amount: number;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    note?: string;
  }) {
    return api
      .post('/api/admin/payouts', payload)
      .then((r) => r.data.payout as AdminPayout);
  },

  updatePayout(
    id: string,
    payload: { status: string; adminNote?: string },
  ) {
    return api
      .patch(`/api/admin/payouts/${id}`, payload)
      .then((r) => r.data.payout as AdminPayout);
  },

  notifications() {
    return api.get('/api/admin/notifications').then(
      (r) =>
        r.data as {
          items: AdminNotificationItem[];
          counts: {
            sos: number;
            tickets: number;
            payouts: number;
            total: number;
          };
        },
    );
  },

  previewBroadcast(params: { audience: string; userId?: string }) {
    return api
      .get('/api/admin/broadcasts/preview', { params })
      .then((r) => r.data as { audience: string; count: number });
  },

  listBroadcasts() {
    return api.get('/api/admin/broadcasts').then(
      (r) => r.data.broadcasts as AdminBroadcast[],
    );
  },

  sendBroadcast(payload: {
    title: string;
    body: string;
    audience: 'passengers' | 'drivers' | 'all' | 'user';
    kind?: 'system' | 'promo' | 'safety';
    userId?: string;
  }) {
    return api.post('/api/admin/broadcasts', payload).then(
      (r) =>
        r.data as {
          broadcast: AdminBroadcast | null;
          targeted: number;
          inbox: number;
          pushed: number;
        },
    );
  },

  getUser(id: string) {
    return api.get(`/api/admin/users/${id}`).then(
      (r) =>
        r.data as {
          user: AdminUser;
          driver: {
            id: string;
            name: string;
            phone?: string;
            rating: number;
            completedTrips: number;
            isOnline: boolean;
            isAvailable: boolean;
            vehicle?: {
              id?: string | null;
              type?: string;
              color?: string | null;
              plateNumber?: string | null;
              model?: string | null;
            } | null;
          } | null;
          wallet: WalletPayload;
          trips: AdminTrip[];
          ratings: {
            average: number;
            count: number;
            distribution: Record<string, number>;
            reviews: Array<{
              id: string;
              rating: number;
              review?: string | null;
              driver?: {
                id?: string | null;
                name: string;
                phone?: string | null;
              } | null;
              route: { pickup: string; destination: string };
              createdAt?: string | null;
            }>;
          };
          activity: {
            totalTrips: number;
            completed: number;
            cancelled: number;
            active: number;
            spend: number;
            cancelRate: number;
          };
          sos: Array<{
            id: string;
            tripId?: string | null;
            note?: string | null;
            status: string;
            createdAt?: string;
          }>;
          tickets: SupportTicket[];
        },
    );
  },

  deleteUser(id: string) {
    return api.delete(`/api/admin/users/${id}`).then((r) => r.data);
  },

  getSettings() {
    return api
      .get('/api/admin/settings')
      .then((r) => r.data.settings as PlatformSettings);
  },

  updateSettings(payload: Partial<PlatformSettings>) {
    return api
      .put('/api/admin/settings', payload)
      .then((r) => r.data.settings as PlatformSettings);
  },

  updateProfile(payload: Record<string, unknown>) {
    return api
      .patch('/api/admin/profile', payload)
      .then((r) => r.data.user as AdminUser);
  },
};

export type RideRate = {
  base: number;
  perKm: number;
  perMin: number;
  multiplier: number;
};

export type DashboardStats = {
  users: number;
  passengers: number;
  drivers: number;
  driversOnline: number;
  driversAvailable: number;
  activeTrips: number;
  searchingTrips: number;
  completedToday: number;
  cancelledToday: number;
  tripsToday: number;
  gmvToday: number;
  avgFareToday: number;
  cancelRateToday: number;
  completedInRange?: number;
  cancelledInRange?: number;
  tripsInRange?: number;
  gmvInRange?: number;
  avgFareInRange?: number;
  cancelRateInRange?: number;
  walletVolumeInRange?: number;
  completedLast7Days: number;
  cancelledLast7Days: number;
  tripsLast7Days: number;
  gmvLast7Days: number;
  avgFareLast7Days: number;
  cancelRateLast7Days: number;
  completedAllTime: number;
  cancelledAllTime: number;
  tripsAllTime: number;
  gmvAllTime: number;
  avgFareAllTime: number;
  cancelRateAllTime: number;
  sosOpen: number;
  ticketsOpen: number;
  walletVolumeToday: number;
  walletVolumeLast7Days: number;
  completedChange: number;
  gmvChange: number;
  tripsChange: number;
  cancelChange: number;
};

export type DashboardSeriesPoint = {
  date: string;
  label: string;
  created?: number;
  completed?: number;
  cancelled?: number;
  revenue?: number;
};

export type DashboardHourPoint = {
  hour: number;
  label: string;
  trips: number;
};

export type DashboardNamedValue = {
  name: string;
  value: number;
};

export type DashboardPayload = {
  range?: { from: string; to: string; days: number };
  stats: DashboardStats;
  series: {
    tripsInRange?: DashboardSeriesPoint[];
    revenueInRange?: DashboardSeriesPoint[];
    tripsLast7Days: DashboardSeriesPoint[];
    revenueLast7Days: DashboardSeriesPoint[];
    hourlyToday: DashboardHourPoint[];
    hourlyInRange?: DashboardHourPoint[];
  };
  breakdowns: {
    pipeline: DashboardNamedValue[];
    status: DashboardNamedValue[];
    paymentMethod: DashboardNamedValue[];
    rideType: DashboardNamedValue[];
  };
  attention: {
    sos: SosEvent[];
    tickets: SupportTicket[];
  };
  recentTrips: AdminTrip[];
  liveTrips: AdminTrip[];
};

export type PlatformSettings = {
  matchRadiusKm: number;
  offerTtlSec: number;
  taxPercent: number;
  supportEmail: string;
  companyName: string;
  maintenanceMode: boolean;
  rideRates: {
    standard: RideRate;
    shared: RideRate;
    express: RideRate;
  };
};

export type AdminPromo = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  discountType: 'percent' | 'flat' | string;
  discountValue: number;
  maxDiscount?: number | null;
  isActive: boolean;
  expiresAt?: string | null;
};

export type ReportsPayload = {
  range: { from: string; to: string; days: number };
  summary: {
    gmv: number;
    completed: number;
    cancelled: number;
    created: number;
    cancelRate: number;
    avgFare: number;
    walletVolume: number;
  };
  series: {
    trips: Array<{
      date: string;
      label: string;
      created: number;
      completed: number;
      cancelled: number;
    }>;
    revenue: Array<{ date: string; label: string; revenue: number }>;
  };
  breakdowns: {
    paymentMethod: Array<{ name: string; value: number }>;
    rideType: Array<{ name: string; value: number }>;
  };
  topDrivers: Array<{
    driverId: string;
    name: string;
    phone?: string | null;
    rating: number;
    trips: number;
    earnings: number;
  }>;
};

export type AdminPayout = {
  id: string;
  userId?: string | null;
  walletId?: string | null;
  amount: number;
  currency: string;
  status: string;
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  note?: string | null;
  adminNote?: string | null;
  processedBy?: string | null;
  processedAt?: string | null;
  createdAt?: string;
  user?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export type AdminBroadcast = {
  id: string;
  title: string;
  body: string;
  audience: 'passengers' | 'drivers' | 'all' | 'user' | string;
  kind: string;
  sentBy?: string | null;
  userId?: string | null;
  targeted: number;
  inbox: number;
  pushed: number;
  createdAt?: string;
};

export type AdminNotificationItem = {
  id: string;
  type: 'sos' | 'ticket' | 'payout' | string;
  title: string;
  body: string;
  href: string;
  createdAt?: string;
};
