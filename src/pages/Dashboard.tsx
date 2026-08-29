import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bike,
  Banknote,
  Coins,
  Headphones,
  MapPinned,
  RefreshCw,
  Search,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { rideTypeLabel } from '../lib/vehicle';

const TEAL = '#10A090';
const AMBER = '#E8AC0C';
const ROSE = '#f43f5e';
const SLATE = '#94a3b8';
const CYAN = '#06b6d4';
const INDIGO = '#6366f1';

const PIE_COLORS = [TEAL, AMBER, ROSE, CYAN, INDIGO, SLATE, '#10A090', '#fb7185'];

function toInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 6);
  return { from: toInputDate(from), to: toInputDate(to) };
}

function shiftDays(base: string, days: number) {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toInputDate(d);
}

function naira(value: number) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

function Trend({ value }: { value?: number }) {
  if (value == null || Number.isNaN(value)) return null;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={[
        'inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[11px] font-bold',
        up ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700',
      ].join(' ')}
    >
      <Icon size={12} strokeWidth={2.5} />
      {Math.abs(value)}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  tone = 'teal',
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: number;
  icon: LucideIcon;
  tone?: 'teal' | 'amber' | 'rose' | 'slate';
  href?: string;
}) {
  const tones = {
    teal: 'bg-trigo/10 text-trigo',
    amber: 'bg-amber/15 text-amber',
    rose: 'bg-rose-500/10 text-rose-600',
    slate: 'bg-slate-500/10 text-slate-600',
  };

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
        <Trend value={trend} />
      </div>
      <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-extrabold tracking-[-0.045em] text-ink sm:text-[1.75rem]">
        {value}
      </div>
      {hint ? (
        <div className="mt-2 text-xs font-medium text-muted">{hint}</div>
      ) : null}
    </>
  );

  const ring =
    tone === 'amber' && Number(value) > 0
      ? 'ring-2 ring-amber-400/80 bg-amber-50/60'
      : tone === 'rose' && Number(value) > 0
        ? 'ring-2 ring-rose-400/70 bg-rose-50/50'
        : '';

  if (href) {
    return (
      <Link
        to={href}
        className={`ui-panel flex h-full flex-col p-4 sm:p-5 transition hover:-translate-y-0.5 ${ring}`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={`ui-panel flex h-full flex-col p-4 sm:p-5 ${ring}`}>
      {inner}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`ui-panel flex flex-col p-4 sm:p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-extrabold tracking-[-0.02em] text-ink">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs font-medium text-muted">{subtitle}</p>
        ) : null}
      </div>
      <div className="min-h-[220px] flex-1">{children}</div>
    </section>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
  fontSize: 12,
  fontWeight: 600,
};

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm font-medium text-muted">
      {label}
    </div>
  );
}

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
] as const;

export function DashboardPage() {
  const initial = defaultRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [preset, setPreset] = useState<string>('7d');

  const rangeParams = useMemo(() => {
    let start = from;
    let end = to;
    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }
    return { from: start, to: end };
  }, [from, to]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'stats', rangeParams],
    queryFn: () => adminApi.stats(rangeParams),
    refetchInterval: 12_000,
  });

  const { data: settings } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminApi.getSettings(),
    staleTime: 60_000,
  });

  const stats = data?.stats;
  const series = data?.series;
  const breakdowns = data?.breakdowns;
  const liveTrips = data?.liveTrips || [];
  const range = data?.range || {
    from: rangeParams.from,
    to: rangeParams.to,
    days: 7,
  };

  const tripSeries = series?.tripsInRange || series?.tripsLast7Days || [];
  const revenueSeries = series?.revenueInRange || series?.revenueLast7Days || [];

  const gmv = stats?.gmvInRange ?? stats?.gmvLast7Days ?? 0;
  const platformRevenue =
    stats?.platformRevenueInRange ?? stats?.platformRevenueLast7Days ?? 0;
  const completed = stats?.completedInRange ?? stats?.completedLast7Days ?? 0;
  const cancelled = stats?.cancelledInRange ?? stats?.cancelledLast7Days ?? 0;
  const tripsCreated = stats?.tripsInRange ?? stats?.tripsLast7Days ?? 0;
  const avgFare = stats?.avgFareInRange ?? stats?.avgFareLast7Days ?? 0;
  const cancelRate = stats?.cancelRateInRange ?? stats?.cancelRateLast7Days ?? 0;
  const walletVol =
    stats?.walletVolumeInRange ?? stats?.walletVolumeLast7Days ?? 0;

  const rangeLabel =
    range.from === range.to
      ? range.from
      : `${range.from} → ${range.to}`;

  function applyPreset(id: string) {
    const today = toInputDate(new Date());
    setPreset(id);
    setTo(today);
    if (id === 'today') setFrom(today);
    else if (id === '7d') setFrom(shiftDays(today, -6));
    else if (id === '30d') setFrom(shiftDays(today, -29));
    else if (id === '90d') setFrom(shiftDays(today, -89));
  }

  const hourlyActive = useMemo(() => {
    const rows = series?.hourlyInRange || series?.hourlyToday || [];
    const first = rows.findIndex((r) => r.trips > 0);
    const last = [...rows].reverse().findIndex((r) => r.trips > 0);
    if (first < 0) return rows.filter((_, i) => i >= 6 && i <= 22);
    const end = last < 0 ? rows.length - 1 : rows.length - 1 - last;
    return rows.slice(Math.max(0, first - 1), Math.min(rows.length, end + 2));
  }, [series]);

  const pipeline = breakdowns?.pipeline || [];
  const payment = breakdowns?.paymentMethod || [];
  const rideTypes = (breakdowns?.rideType || []).map((row) => ({
    ...row,
    name: rideTypeLabel(row.name),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Marketplace KPIs for the selected date range, plus live supply and queues."
        actions={
          <button
            type="button"
            onClick={() => void refetch()}
            className="ui-btn ui-btn-ghost"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <div className="ui-panel flex flex-wrap items-end gap-3 p-3">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => applyPreset(item.id)}
              className={[
                'rounded-xl px-3 py-2 text-xs font-bold transition',
                preset === item.id
                  ? 'bg-trigo text-white'
                  : 'bg-canvas text-muted hover:bg-trigo-muted hover:text-ink',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="text-xs font-bold text-muted">
          From
          <input
            type="date"
            className="ui-input mt-1.5 min-w-[150px]"
            value={from}
            max={to}
            onChange={(e) => {
              setFrom(e.target.value);
              setPreset('custom');
            }}
          />
        </label>
        <label className="text-xs font-bold text-muted">
          To
          <input
            type="date"
            className="ui-input mt-1.5 min-w-[150px]"
            value={to}
            min={from}
            max={toInputDate(new Date())}
            onChange={(e) => {
              setTo(e.target.value);
              setPreset('custom');
            }}
          />
        </label>
        <div className="ml-auto text-xs font-semibold text-muted">
          {range.days} day{range.days === 1 ? '' : 's'} · {rangeLabel}
        </div>
      </div>

      {error ? <Flash tone="error">{(error as Error).message}</Flash> : null}

      {settings?.maintenanceMode ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Maintenance mode is on — passenger and driver apps may be restricted.{' '}
          <Link to="/settings" className="font-extrabold underline">
            Open settings
          </Link>
        </div>
      ) : null}

      {isLoading || !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-32" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Platform revenue"
              value={naira(platformRevenue)}
              trend={stats.platformRevenueChange}
              hint={`Ride commission only · today ${naira(stats.platformRevenueToday || 0)} · all-time ${naira(stats.platformRevenueAllTime || 0)}`}
              icon={Coins}
              tone="teal"
              href="/revenue"
            />
            <KpiCard
              label="Passenger GMV"
              value={naira(gmv)}
              trend={stats.gmvChange}
              hint={`Avg ${naira(avgFare)} · today ${naira(stats.gmvToday)} · all-time ${naira(stats.gmvAllTime ?? 0)}`}
              icon={Wallet}
              tone="slate"
            />
            <KpiCard
              label="Completed trips"
              value={completed}
              trend={stats.completedChange}
              hint={`Today ${stats.completedToday} · all-time ${stats.completedAllTime ?? 0}`}
              icon={MapPinned}
              tone="amber"
            />
            <KpiCard
              label="Active now"
              value={stats.activeTrips}
              hint={`${stats.searchingTrips} still searching`}
              icon={Search}
              tone="slate"
            />
            <KpiCard
              label="Drivers online"
              value={stats.driversOnline}
              hint={`${stats.driversAvailable} available · ${stats.drivers} total`}
              icon={Bike}
              tone="teal"
            />
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Passengers"
              value={stats.passengers}
              hint={`${stats.users} total accounts`}
              icon={Users}
            />
            <KpiCard
              label="Cancel rate"
              value={`${cancelRate}%`}
              trend={stats.cancelChange}
              hint={`${cancelled} cancelled · today ${stats.cancelledToday}`}
              icon={AlertTriangle}
              tone="rose"
            />
            <KpiCard
              label="Open SOS"
              value={stats.sosOpen}
              hint="Needs immediate review"
              icon={AlertTriangle}
              tone="rose"
              href="/sos"
            />
            <KpiCard
              label="Support queue"
              value={stats.ticketsOpen}
              hint="Open + in progress"
              icon={Headphones}
              tone="amber"
            />
            <KpiCard
              label="Cash flags"
              value={stats.cashFlagged || 0}
              hint={`${stats.cashOverThreshold || 0} holding ₦5,000+`}
              icon={Banknote}
              tone="amber"
              href="/cash-flags"
            />
            <KpiCard
              label="Wallet volume"
              value={naira(walletVol)}
              hint={`Today ${naira(stats.walletVolumeToday)}`}
              icon={Wallet}
            />
            <KpiCard
              label="Trips created"
              value={tripsCreated}
              trend={stats.tripsChange}
              hint={`Today ${stats.tripsToday} · all-time ${stats.tripsAllTime ?? 0}`}
              icon={MapPinned}
              tone="slate"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              title="Trips"
              subtitle={`Created vs completed vs cancelled · ${rangeLabel}`}
            >
              {tripSeries.every(
                (d) => !d.created && !d.completed && !d.cancelled,
              ) ? (
                <EmptyChart label="No trip activity in this range" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={tripSeries}>
                    <defs>
                      <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={AMBER} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={AMBER} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                    <Area type="monotone" dataKey="created" name="Created" stroke={TEAL} fill="url(#gCreated)" strokeWidth={2.2} />
                    <Area type="monotone" dataKey="completed" name="Completed" stroke={AMBER} fill="url(#gDone)" strokeWidth={2.2} />
                    <Area type="monotone" dataKey="cancelled" name="Cancelled" stroke={ROSE} fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Live pipeline" subtitle="Trips currently in progress">
              {pipeline.length === 0 ? (
                <EmptyChart label="No active trips" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pipeline}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {pipeline.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      wrapperStyle={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              title="Revenue"
              subtitle={`Passenger GMV vs platform commission · ${rangeLabel}`}
            >
              {revenueSeries.every((d) => !d.revenue && !d.platformRevenue) ? (
                <EmptyChart label="No completed revenue in this range" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={revenueSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                      }
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => [
                        naira(Number(value || 0)),
                        name === 'platformRevenue' ? 'Commission' : 'GMV',
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                    <Bar dataKey="revenue" name="GMV" fill={SLATE} radius={[10, 10, 4, 4]} maxBarSize={28} />
                    <Bar dataKey="platformRevenue" name="Commission" fill={TEAL} radius={[10, 10, 4, 4]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="Demand by hour"
              subtitle={`Trips created by hour of day · ${rangeLabel}`}
            >
              {hourlyActive.every((d) => !d.trips) ? (
                <EmptyChart label="No trips created in this range" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={hourlyActive}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="trips" name="Trips" fill={AMBER} radius={[8, 8, 3, 3]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Payment mix"
              subtitle={`How trips in range are paying · ${rangeLabel}`}
            >
              {payment.length === 0 ? (
                <EmptyChart label="No payment data in this range" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={payment}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={78}
                      label={({ name, percent }) =>
                        `${name} ${Math.round((percent || 0) * 100)}%`
                      }
                    >
                      {payment.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="Ride types"
              subtitle={`Product mix in range · ${rangeLabel}`}
            >
              {rideTypes.length === 0 ? (
                <EmptyChart label="No ride-type mix in this range" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={rideTypes} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" name="Trips" fill={CYAN} radius={[0, 8, 8, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-5">
            <div className="ui-panel p-4 sm:p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold">Needs attention</h3>
                  <p className="text-xs font-medium text-muted">
                    SOS, tickets, and unremitted cash
                  </p>
                </div>
                <Link to="/riders?cash=flagged" className="text-xs font-bold text-trigo hover:underline">
                  Cash flags
                </Link>
              </div>
              <div className="space-y-2">
                {(data?.attention.sos || []).length === 0 &&
                (data?.attention.tickets || []).length === 0 &&
                (data?.attention.cash || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm font-medium text-muted">
                    Queues are clear
                  </div>
                ) : null}

                {(data?.attention.sos || []).map((event) => (
                  <Link
                    key={`sos-${event.id}`}
                    to={`/sos/${event.id}`}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/60 px-3.5 py-3 transition hover:bg-rose-50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status="active" />
                        <span className="text-[11px] font-bold uppercase tracking-wide text-rose-700">
                          SOS
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm font-bold">
                        {event.user?.name || `User #${event.userId}`}
                      </div>
                      <div className="text-xs font-medium text-muted">
                        {event.note || 'No note'}
                      </div>
                    </div>
                    <AlertTriangle size={16} className="mt-1 shrink-0 text-rose-500" />
                  </Link>
                ))}

                {(data?.attention.tickets || []).map((ticket) => (
                  <Link
                    key={`t-${ticket.id}`}
                    to={`/tickets/${ticket.id}`}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-canvas/70 px-3.5 py-3 transition hover:bg-trigo-muted/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={ticket.status} />
                        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                          Ticket
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm font-bold">{ticket.subject}</div>
                      <div className="text-xs font-medium text-muted">
                        {ticket.user?.name || ticket.userId} · {ticket.category}
                      </div>
                    </div>
                    <Headphones size={16} className="mt-1 shrink-0 text-trigo" />
                  </Link>
                ))}

                {(data?.attention.cash || []).map((rider) => (
                  <Link
                    key={`cash-${rider.id}`}
                    to={`/riders/${rider.id}`}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-3 transition hover:bg-amber-50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex rounded-lg bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                          Cash
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm font-bold">{rider.name}</div>
                      <div className="text-xs font-medium text-muted">
                        ₦{Number(rider.cash?.held || 0).toLocaleString()} unremitted
                        {rider.cash?.reasonLabel ? ` · ${rider.cash.reasonLabel}` : ''}
                      </div>
                    </div>
                    <Banknote size={16} className="mt-1 shrink-0 text-amber-600" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="ui-table-wrap xl:col-span-3">
              <div className="flex items-center justify-between gap-2 border-b border-line/80 px-4 py-3.5">
                <div>
                  <h3 className="text-sm font-extrabold">Recent trips</h3>
                  <p className="text-xs font-medium text-muted">Latest marketplace activity</p>
                </div>
                <Link to="/trips" className="text-xs font-bold text-trigo hover:underline">
                  All trips
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="ui-table min-w-[720px]">
                  <thead>
                    <tr>
                      <th>Trip</th>
                      <th>Route</th>
                      <th>People</th>
                      <th>Fare</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.recentTrips || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-muted">
                          No trips yet
                        </td>
                      </tr>
                    ) : (
                      (data?.recentTrips || []).map((trip) => (
                        <tr key={trip.id}>
                          <td>
                            <Link
                              to={`/trips/${trip.id}`}
                              className="font-extrabold text-trigo hover:underline"
                            >
                              #{trip.id}
                            </Link>
                            <div className="text-xs font-medium text-muted">
                              {rideTypeLabel(trip.rideType)}
                            </div>
                          </td>
                          <td>
                            <div className="max-w-[220px] truncate font-medium">
                              {trip.pickup?.name} → {trip.destination?.name}
                            </div>
                          </td>
                          <td>
                            <div className="text-xs font-semibold">
                              {trip.passenger?.name ||
                                trip.passenger?.email ||
                                'Passenger'}
                            </div>
                            <div className="text-xs font-medium text-muted">
                              {trip.driver?.name || 'No rider'}
                            </div>
                          </td>
                          <td className="font-extrabold">
                            {naira(Number(trip.fare?.total || 0))}
                          </td>
                          <td>
                            <StatusBadge status={trip.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="ui-table-wrap">
            <div className="flex items-center justify-between gap-2 border-b border-line/80 px-4 py-3.5">
              <div>
                <h3 className="text-sm font-extrabold">Live trips</h3>
                <p className="text-xs font-medium text-muted">
                  Active rides right now · refreshes every 30s
                </p>
              </div>
              <Link
                to="/trips?status=searching"
                className="text-xs font-bold text-trigo hover:underline"
              >
                Filter active
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="ui-table min-w-[720px]">
                <thead>
                  <tr>
                    <th>Trip</th>
                    <th>Route</th>
                    <th>People</th>
                    <th>Fare</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {liveTrips.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-muted">
                        No active trips
                      </td>
                    </tr>
                  ) : (
                    liveTrips.map((trip) => (
                      <tr key={trip.id}>
                        <td>
                          <Link
                            to={`/trips/${trip.id}`}
                            className="font-extrabold text-trigo hover:underline"
                          >
                            #{trip.id}
                          </Link>
                          <div className="text-xs font-medium text-muted">
                            {rideTypeLabel(trip.rideType)}
                          </div>
                        </td>
                        <td>
                          <div className="max-w-[220px] truncate font-medium">
                            {trip.pickup?.name} → {trip.destination?.name}
                          </div>
                        </td>
                        <td>
                          <div className="text-xs font-semibold">
                            {trip.passenger?.name ||
                              trip.passenger?.email ||
                              'Passenger'}
                          </div>
                          <div className="text-xs font-medium text-muted">
                            {trip.driver?.name || 'No rider'}
                          </div>
                        </td>
                        <td className="font-extrabold">
                          {naira(Number(trip.fare?.total || 0))}
                        </td>
                        <td>
                          <StatusBadge status={trip.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

