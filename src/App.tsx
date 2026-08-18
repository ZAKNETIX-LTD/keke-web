import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/Login';
import { SettingsPage } from './pages/Settings';
import { SosPage } from './pages/Sos';
import { SosDetailPage } from './pages/SosDetail';
import { TicketsPage } from './pages/Tickets';
import { TicketDetailPage } from './pages/TicketDetail';
import { TripDetailPage } from './pages/TripDetail';
import { TripsPage } from './pages/Trips';
import { UsersPage } from './pages/Users';
import { UserDetailPage } from './pages/UserDetail';
import { RidersPage } from './pages/Riders';
import { RiderDetailPage } from './pages/RiderDetail';
import { KycQueuePage } from './pages/KycQueue';
import { CashFlagsPage } from './pages/CashFlags';
import { LiveRidersPage } from './pages/LiveRiders';
import { WalletPage } from './pages/Wallet';
import { WalletDetailPage } from './pages/WalletDetail';
import { PromosPage } from './pages/Promos';
import { ReportsPage } from './pages/Reports';
import { PayoutsPage } from './pages/Payouts';
import { StaffPage } from './pages/Staff';
import { BroadcastsPage } from './pages/Broadcasts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
});

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <Protected>
                  <Layout />
                </Protected>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:id" element={<UserDetailPage />} />
              <Route path="/staff" element={<StaffPage />} />
              <Route path="/riders" element={<RidersPage />} />
              <Route path="/riders/:id" element={<RiderDetailPage />} />
              <Route path="/kyc" element={<KycQueuePage />} />
              <Route path="/cash-flags" element={<CashFlagsPage />} />
              <Route path="/live-riders" element={<LiveRidersPage />} />
              <Route path="/trips" element={<TripsPage />} />
              <Route path="/trips/:id" element={<TripDetailPage />} />
              <Route path="/sos" element={<SosPage />} />
              <Route path="/sos/:id" element={<SosDetailPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
              <Route path="/broadcasts" element={<BroadcastsPage />} />
              <Route path="/wallets" element={<WalletPage />} />
              <Route path="/wallets/:userId" element={<WalletDetailPage />} />
              <Route path="/payouts" element={<PayoutsPage />} />
              <Route path="/promos" element={<PromosPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
