/** Production API — always used for `vite build` / deployed admin. */
const PRODUCTION_API_URL = 'https://keke.hamsyltravels.com';

function resolveApiUrl(): string {
  const fromEnv = String(import.meta.env.VITE_API_URL || '')
    .trim()
    .replace(/\/$/, '');

  // Never ship a localhost API in production builds.
  if (import.meta.env.PROD) {
    if (fromEnv && !/localhost|127\.0\.0\.1/i.test(fromEnv)) {
      return fromEnv;
    }
    return PRODUCTION_API_URL;
  }

  return fromEnv || 'http://localhost:34567';
}

export const API_URL = resolveApiUrl();

export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyDiEHcXq-9nqisa3PCxrpZ1rGNs9fBs-tA';

export const ROLE = {
  passenger: 2,
  driver: 4,
  admin: 8,
  superAdmin: 16,
} as const;

export function roleLabel(role: number) {
  if (role & ROLE.superAdmin) return 'Super Admin';
  if (role & ROLE.admin) return 'Admin';
  if (role & ROLE.driver) return 'Driver';
  if (role & ROLE.passenger) return 'Passenger';
  return `Role ${role}`;
}

export function isAdminRole(role: number) {
  return Boolean(role & (ROLE.admin | ROLE.superAdmin));
}

export type AdminUser = {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phone?: string | null;
  role: number;
  status: 'active' | 'suspended' | string;
  avatarUrl?: string | null;
  referralCode?: string | null;
  createdAt?: string;
};

export type AdminRider = {
  id: string;
  userId?: string | null;
  name: string;
  phone?: string | null;
  rating: number;
  completedTrips: number;
  isOnline: boolean;
  isAvailable: boolean;
  kycStatus?: string;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: string;
  vehicle?: {
    id?: string | null;
    type?: string;
    color?: string | null;
    plateNumber?: string | null;
    model?: string | null;
    ownershipType?: string | null;
    companyName?: string | null;
    companyAssetTag?: string | null;
  } | null;
  user?: {
    id: string;
    firstname?: string;
    lastname?: string;
    username?: string;
    email?: string;
    phone?: string | null;
    role?: number;
    status?: string;
  } | null;
  cash?: {
    held: number;
    flagged: boolean;
    reason?: string | null;
    reasonLabel?: string | null;
    flaggedAt?: string | null;
    overThresholdAt?: string | null;
    reconciledAt?: string | null;
  } | null;
};

export type RiderKycPayload = {
  status: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rejectReason?: string | null;
  idNumber?: string | null;
  kin: {
    name?: string | null;
    phone?: string | null;
    relationship?: string | null;
  };
  phone: {
    ownership?: string | null;
    imei?: string | null;
    docUrl?: string | null;
  };
  vehicle: {
    ownershipType?: string | null;
    companyName?: string | null;
    companyAssetTag?: string | null;
    ownershipDocUrl?: string | null;
    type?: string | null;
    color?: string | null;
    plateNumber?: string | null;
    model?: string | null;
  } | null;
  documents: Array<{
    id: string;
    type: string;
    url: string;
    originalName?: string | null;
    mimeType?: string | null;
    uploadedBy?: string;
    createdAt?: string;
  }>;
  latestDocuments: Record<
    string,
    {
      id: string;
      type: string;
      url: string;
      originalName?: string | null;
    }
  >;
  checklist: {
    complete: boolean;
    missing: string[];
    required: Record<string, boolean>;
    ownershipType?: string | null;
    phoneOwnership?: string | null;
  };
};

export type AdminTrip = {
  id: string;
  status: string;
  rideType?: string;
  passengerId?: string | null;
  passenger?: {
    id?: string;
    firstname?: string | null;
    lastname?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  driver?: {
    id?: string;
    userId?: string | null;
    name?: string;
    phone?: string;
    avatarUrl?: string | null;
    rating?: number;
    completedTrips?: number;
    isOnline?: boolean;
    isAvailable?: boolean;
    location?: { latitude: number; longitude: number } | null;
    vehicle?: {
      id?: string;
      type?: string;
      color?: string | null;
      plateNumber?: string | null;
      model?: string | null;
    } | null;
  } | null;
  driverUserId?: string | null;
  pickup: {
    name: string;
    address?: string;
    coordinates?: { latitude: number; longitude: number };
  };
  destination: {
    name: string;
    address?: string;
    coordinates?: { latitude: number; longitude: number };
  };
  stops?: Array<{
    name?: string;
    address?: string;
    coordinates?: { latitude: number; longitude: number };
  }>;
  fare: {
    total: number;
    currency?: string;
    baseFare?: number;
    distanceFare?: number;
    timeFare?: number;
    discount?: number;
    tax?: number;
  };
  paymentMethod?: string;
  distanceKm?: number;
  durationMin?: number;
  etaMin?: number | null;
  notes?: string | null;
  promoCode?: string | null;
  polyline?: Array<{ latitude: number; longitude: number }>;
  rating?: number | null;
  review?: string | null;
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  scheduledAt?: string | null;
  cancelReason?: string | null;
};

export type SosEvent = {
  id: string;
  userId?: string | null;
  tripId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  note?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  notifiedCount?: number;
  notifiedContacts?: Array<{
    id?: string | null;
    name?: string | null;
    phone?: string | null;
    relationship?: string | null;
    isPrimary?: boolean;
    notified?: boolean;
    channel?: string | null;
  }>;
  user?: { id: string; name: string; email?: string | null; phone?: string | null } | null;
};

export type SupportMessage = {
  id: string;
  ticketId: string;
  senderId?: string | null;
  senderRole: string;
  message: string;
  createdAt?: string;
};

export type SupportTicket = {
  id: string;
  userId?: string | null;
  subject: string;
  category: string;
  message: string;
  status: string;
  response?: string | null;
  tripId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  user?: { id: string; name: string; email?: string | null; phone?: string | null } | null;
};

export type WalletPayload = {
  balance: number;
  currency: string;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    description?: string;
    status?: string;
    createdAt?: string;
  }>;
};
