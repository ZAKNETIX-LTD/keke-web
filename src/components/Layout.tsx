import {
  AlertTriangle,
  Bike,
  Banknote,
  BarChart3,
  Bell,
  Headphones,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Navigation,
  Percent,
  Settings,
  Shield,
  Users,
  Wallet,
  FileCheck2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { NotificationsBell } from './NotificationsBell';
import { useAdminRealtime } from '../hooks/useAdminRealtime';
import { roleLabel } from '../lib/types';

const NAV: {
  to: string;
  label: string;
  end?: boolean;
  icon: LucideIcon;
  group?: string;
}[] = [
  { to: '/', label: 'Overview', end: true, icon: LayoutDashboard, group: 'Ops' },
  { to: '/users', label: 'Users', icon: Users, group: 'Ops' },
  { to: '/staff', label: 'Staff', icon: Shield, group: 'Ops' },
  { to: '/riders', label: 'Riders', icon: Bike, group: 'Ops' },
  { to: '/kyc', label: 'KYC queue', icon: FileCheck2, group: 'Ops' },
  { to: '/live-riders', label: 'Live map', icon: Navigation, group: 'Ops' },
  { to: '/trips', label: 'Trips', icon: MapPinned, group: 'Ops' },
  { to: '/sos', label: 'SOS', icon: AlertTriangle, group: 'Care' },
  { to: '/tickets', label: 'Support', icon: Headphones, group: 'Care' },
  { to: '/broadcasts', label: 'Notifications', icon: Bell, group: 'Care' },
  { to: '/wallets', label: 'Wallets', icon: Wallet, group: 'Money' },
  { to: '/payouts', label: 'Payouts', icon: Banknote, group: 'Money' },
  { to: '/promos', label: 'Promos', icon: Percent, group: 'Money' },
  { to: '/reports', label: 'Reports', icon: BarChart3, group: 'Money' },
  { to: '/settings', label: 'Settings', icon: Settings, group: 'Money' },
];

const NAV_GROUPS = NAV.reduce<
  { name: string; items: typeof NAV }[]
>((acc, item) => {
  const name = item.group || 'Menu';
  const existing = acc.find((g) => g.name === name);
  if (existing) existing.items.push(item);
  else acc.push({ name, items: [item] });
  return acc;
}, []);

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.name}>
          <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted/80">
            {group.name}
          </div>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    [
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors duration-150',
                      isActive
                        ? 'bg-trigo text-white shadow-[0_8px_20px_rgba(13,148,136,0.28)]'
                        : 'text-ink/70 hover:bg-trigo-muted/60 hover:text-ink',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2.25 : 1.85}
                        className={
                          isActive
                            ? 'text-white'
                            : 'text-muted group-hover:text-trigo'
                        }
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 pb-5 pt-6">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-trigo text-white shadow-[0_8px_18px_rgba(13,148,136,0.3)]">
        <MapPinned size={18} strokeWidth={2.4} />
      </div>
      <div className="min-w-0">
        <div className="text-base font-extrabold tracking-[-0.04em] text-ink">
          TriGo
        </div>
        <div className="text-[11px] font-semibold text-muted">Ops console</div>
      </div>
    </div>
  );
}

function UserCard({
  name,
  initials,
  role,
  onLogout,
}: {
  name: string;
  initials: string;
  role: string;
  onLogout: () => void;
}) {
  return (
    <div className="mx-3 mb-3 rounded-2xl border border-line bg-canvas/80 p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-soft text-xs font-extrabold text-amber">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-ink">{name}</div>
          <div className="truncate text-[11px] font-medium text-muted">{role}</div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title="Sign out"
          className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-muted transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

export function Layout() {
  const { user, logout, isAuthenticated } = useAuth();
  useAdminRealtime(isAuthenticated);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const name =
    [user?.firstname, user?.lastname].filter(Boolean).join(' ') ||
    user?.email ||
    'Admin';
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const role = roleLabel(Number(user?.role || 0));

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Brand />
      <SidebarNav onNavigate={() => setMobileOpen(false)} />
      <UserCard name={name} initials={initials} role={role} onLogout={logout} />
    </div>
  );

  return (
    <div className="min-h-screen text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-[15.5rem] shrink-0 border-r border-line/90 bg-white/80 backdrop-blur-xl md:flex md:flex-col">
          {sidebar}
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="animate-rise absolute inset-y-0 left-0 flex w-[16.5rem] flex-col border-r border-line bg-white shadow-2xl">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-5 z-10 grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-muted"
              >
                <X size={16} />
              </button>
              {sidebar}
            </aside>
          </div>
        ) : null}

        <main className="relative flex min-w-0 flex-1 flex-col overflow-auto">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line/70 bg-white/70 px-4 py-3 backdrop-blur-xl md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-ink"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold tracking-[-0.03em]">
                TriGo Ops
              </div>
              <div className="truncate text-[11px] font-medium text-muted">
                {name}
              </div>
            </div>
            <NotificationsBell />
          </header>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(700px_180px_at_20%_0%,rgba(13,148,136,0.1),transparent)]" />
          <div className="relative z-10 hidden items-center justify-end gap-3 px-6 pt-4 md:flex lg:px-8">
            <NotificationsBell />
          </div>
          <div
            key={location.pathname}
            className="animate-rise relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
