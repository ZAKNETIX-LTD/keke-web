import { Bike, CircleDollarSign, Coins, MapPinned, RefreshCw, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';

const TEAL = '#10A090';
const SLATE = '#94a3b8';

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

export function RevenuePage() {
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
  const platformRevenue = Number(summary?.platformRevenue || 0);
  const gmv = Number(summary?.gmv || 0);
  const netFare = Number(summary?.netFare || 0);
  const tax = Number(summary?.tax || 0);
  const driverShare = Number(summary?.driverShare || 0);
  const takeRate = Number(summary?.takeRate || 0);
  const commissionPercent = Number(summary?.commissionPercent || 15);
  const completed = Number(summary?.completed || 0);
  const avgCommission = completed > 0 ? Math.round(platformRevenue / completed) : 0;
  const revenueSeries = data?.series.revenue || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform revenue"
        description="Fastigo’s take from completed rides only — ride commission, not passenger GMV or VAT."
        actions={
          <button
            type="button"
            className="ui-btn ui-btn-ghost"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
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
          <section className="ui-panel relative overflow-hidden p-6">
            <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-trigo/15 blur-3xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
                  <Coins size={14} />
                  Ride commission
                </div>
                <div className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-ink sm:text-5xl">
                  {naira(platformRevenue)}
                </div>
                <p className="mt-2 max-w-xl text-sm font-medium text-muted">
                  {commissionPercent}% of net fare on {completed} completed trip
                  {completed === 1 ? '' : 's'}. VAT is collected for tax, not
                  kept as platform income.
                </p>
              </div>
              <div className="grid min-w-[16rem] gap-2 text-sm">
                <div className="flex items-center justify-between gap-6 font-semibold">
                  <span className="text-muted">Avg commission / trip</span>
                  <span>{naira(avgCommission)}</span>
                </div>
                <div className="flex items-center justify-between gap-6 font-semibold">
                  <span className="text-muted">Effective take rate</span>
                  <span>{takeRate}%</span>
                </div>
                <Link
                  to="/settings"
                  className="text-xs font-bold text-trigo underline-offset-2 hover:underline"
                >
                  Change commission in Settings
                </Link>
              </div>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="ui-panel p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-500/10 text-slate-600">
                <Wallet size={18} strokeWidth={2.2} />
              </div>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                Passenger GMV
              </div>
              <div className="mt-1.5 text-2xl font-extrabold tracking-[-0.045em]">
                {naira(gmv)}
              </div>
              <div className="mt-2 text-xs font-medium text-muted">
                What passengers paid, including VAT
              </div>
            </div>
            <div className="ui-panel p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-trigo/10 text-trigo">
                <CircleDollarSign size={18} strokeWidth={2.2} />
              </div>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                Net fare
              </div>
              <div className="mt-1.5 text-2xl font-extrabold tracking-[-0.045em]">
                {naira(netFare)}
              </div>
              <div className="mt-2 text-xs font-medium text-muted">
                GMV minus VAT — the amount that is split
              </div>
            </div>
            <div className="ui-panel p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber/15 text-amber">
                <Bike size={18} strokeWidth={2.2} />
              </div>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                Rider share
              </div>
              <div className="mt-1.5 text-2xl font-extrabold tracking-[-0.045em]">
                {naira(driverShare)}
              </div>
              <div className="mt-2 text-xs font-medium text-muted">
                Net fare minus platform commission
              </div>
            </div>
            <div className="ui-panel p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 text-rose-600">
                <MapPinned size={18} strokeWidth={2.2} />
              </div>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                VAT collected
              </div>
              <div className="mt-1.5 text-2xl font-extrabold tracking-[-0.045em]">
                {naira(tax)}
              </div>
              <div className="mt-2 text-xs font-medium text-muted">
                Not platform revenue
              </div>
            </div>
          </div>

          <section className="ui-panel p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="text-sm font-extrabold tracking-[-0.02em] text-ink">
                Commission vs GMV
              </h3>
              <p className="mt-0.5 text-xs font-medium text-muted">
                {applied.from} → {applied.to} · completed trips only
              </p>
            </div>
            {revenueSeries.every(
              (d) => !d.revenue && !d.platformRevenue,
            ) ? (
              <div className="grid h-[240px] place-items-center text-sm font-semibold text-muted">
                No completed rides in this range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueSeries}>
                  <defs>
                    <linearGradient id="gmvFill" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#gmvFill)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="platformRevenue"
                    name="Platform commission"
                    stroke={TEAL}
                    fill="url(#commFill)"
                    strokeWidth={2.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </section>

          <p className="text-xs font-medium text-muted">
            Older trips stored without a commission amount are estimated at the
            current {commissionPercent}% rate. Commission is a split of the
            fare, not an extra charge on the passenger.
          </p>
        </>
      )}
    </div>
  );
}
