import {
  Bike,
  Coins,
  MapPinned,
  RefreshCw,
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

const TEAL = '#0d9488';
const AMBER = '#f59e0b';
const ROSE = '#f43f5e';
const SLATE = '#94a3b8';
const CYAN = '#06b6d4';
const INDIGO = '#6366f1';
const PIE_COLORS = [TEAL, AMBER, ROSE, CYAN, INDIGO, SLATE];

function toInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
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

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'teal',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: 'teal' | 'amber' | 'rose' | 'slate';
}) {
  const tones = {
    teal: 'bg-trigo/10 text-trigo',
    amber: 'bg-amber/15 text-amber',
    rose: 'bg-rose-500/10 text-rose-600',
    slate: 'bg-slate-500/10 text-slate-600',
  };
  return (
    <div className="ui-panel flex h-full flex-col p-4 sm:p-5">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon size={18} strokeWidth={2.2} />
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
        <h3 className="text-sm font-extrabold tracking-[-0.02em] text-ink">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs font-medium text-muted">{subtitle}</p>
        ) : null}
      </div>
      <div className="min-h-[220px] flex-1">{children}</div>
    </section>
  );
}

export function ReportsPage() {
  const initial = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [applied, setApplied] = useState(initial);

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'reports', applied.from, applied.to],
    queryFn: () => adminApi.reports({ from: applied.from, to: applied.to }),
  });

  const applyPreset = (days: number) => {
    const nextTo = toInputDate(new Date());
    const nextFrom = shiftDays(nextTo, -(days - 1));
    setFrom(nextFrom);
    setTo(nextTo);
    setApplied({ from: nextFrom, to: nextTo });
  };

  const summary = data?.summary;
  const tripSeries = data?.series.trips || [];
  const revenueSeries = data?.series.revenue || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Platform commission, GMV, completion, and earnings over a date range."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/revenue" className="ui-btn ui-btn-ghost">
              Platform revenue
            </Link>
            <button
              type="button"
              className="ui-btn ui-btn-ghost"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        }
      />

      <section className="ui-panel flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              className="ui-btn ui-btn-ghost !px-3 !py-2 text-xs"
              onClick={() => applyPreset(days)}
            >
              Last {days}d
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold uppercase tracking-wide text-muted">
            From
            <input
              type="date"
              className="ui-input mt-1.5"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-muted">
            To
            <input
              type="date"
              className="ui-input mt-1.5"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={() => setApplied({ from, to })}
          >
            Apply
          </button>
        </div>
      </section>

      {error ? <Flash tone="error">{(error as Error).message}</Flash> : null}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-32" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Platform revenue"
              value={naira(summary?.platformRevenue || 0)}
              hint={`${summary?.commissionPercent ?? 15}% of net fare · ${summary?.completed || 0} completed`}
              icon={Coins}
              tone="teal"
            />
            <KpiCard
              label="Passenger GMV"
              value={naira(summary?.gmv || 0)}
              hint={`Avg fare ${naira(summary?.avgFare || 0)} · VAT ${naira(summary?.tax || 0)}`}
              icon={Wallet}
              tone="slate"
            />
            <KpiCard
              label="Cancel rate"
              value={`${summary?.cancelRate || 0}%`}
              hint={`${summary?.cancelled || 0} cancelled · ${summary?.created || 0} created`}
              icon={MapPinned}
              tone="rose"
            />
            <KpiCard
              label="Rider share"
              value={naira(summary?.driverShare || 0)}
              hint="Net fare minus platform commission"
              icon={Bike}
              tone="amber"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Trips by day"
              subtitle={`${applied.from} → ${applied.to}`}
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={tripSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="created" name="Created" fill={SLATE} radius={4} />
                  <Bar dataKey="completed" name="Completed" fill={TEAL} radius={4} />
                  <Bar dataKey="cancelled" name="Cancelled" fill={ROSE} radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue by day" subtitle="Passenger GMV vs platform commission">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={revenueSeries}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SLATE} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={SLATE} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="commFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={TEAL} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => naira(Number(v ?? 0))} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="GMV"
                    stroke={SLATE}
                    fill="url(#revFill)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="platformRevenue"
                    name="Commission"
                    stroke={TEAL}
                    fill="url(#commFill)"
                    strokeWidth={2.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Payment mix" subtitle="Trips created in range">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data?.breakdowns.paymentMethod || []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {(data?.breakdowns.paymentMethod || []).map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Ride types" subtitle="Trips created in range">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data?.breakdowns.rideType || []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {(data?.breakdowns.rideType || []).map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <section className="ui-panel p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber/15 text-amber">
                  <Bike size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">Top riders</h3>
                  <p className="text-xs font-medium text-muted">
                    By completed trips
                  </p>
                </div>
              </div>
              {(data?.topDrivers || []).length === 0 ? (
                <p className="text-sm font-medium text-muted">
                  No completed trips in this range.
                </p>
              ) : (
                <ul className="space-y-2">
                  {(data?.topDrivers || []).map((d, idx) => (
                    <li
                      key={d.driverId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line/70 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold">
                          {idx + 1}. {d.name}
                        </div>
                        <div className="text-[11px] font-semibold text-muted">
                          {d.trips} trips · {Number(d.rating || 0).toFixed(1)}★
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-trigo">
                          {naira(d.earnings)}
                        </div>
                        <Link
                          to={`/riders/${d.driverId}`}
                          className="text-[11px] font-bold text-muted hover:text-trigo"
                        >
                          View
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
