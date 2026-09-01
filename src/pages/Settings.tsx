import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { adminApi, type PlatformSettings, type RideRate } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../auth/AuthContext';
import { RIDE_RATE_LABELS } from '../lib/vehicle';

const RATE_TYPES = ['standard', 'shared', 'express', 'car'] as const;

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    firstname: user?.firstname || '',
    lastname: user?.lastname || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
  });
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminApi.getSettings(),
  });

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  useEffect(() => {
    if (!user) return;
    setProfile((p) => ({
      ...p,
      firstname: user.firstname || '',
      lastname: user.lastname || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
    }));
  }, [user]);

  const profileMut = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        firstname: profile.firstname,
        lastname: profile.lastname,
        username: profile.username,
        email: profile.email,
        phone: profile.phone,
      };
      if (profile.password.trim()) payload.password = profile.password;
      return adminApi.updateProfile(payload);
    },
    onSuccess: (next) => {
      setUser(next);
      setProfile((p) => ({ ...p, password: '' }));
      setMessage('Profile saved');
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const settingsMut = useMutation({
    mutationFn: () => adminApi.updateSettings(settings || {}),
    onSuccess: (next) => {
      setSettings(next);
      setMessage('Platform settings saved');
      void qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const updateRate = (
    type: (typeof RATE_TYPES)[number],
    field: keyof RideRate,
    value: string,
  ) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rideRates: {
          ...prev.rideRates,
          [type]: {
            ...(prev.rideRates[type] || {
              base: 0,
              perKm: 0,
              perMin: 0,
              multiplier: 1,
            }),
            [field]: Number(value),
          },
        },
      };
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Your admin profile and Fastigo platform configuration."
      />

      {message ? <Flash>{message}</Flash> : null}

      <section className="ui-panel p-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
          Account
        </div>
        <h2 className="mt-1 text-lg font-extrabold tracking-[-0.03em]">
          Your profile
        </h2>
        <form
          className="mt-5 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            profileMut.mutate();
          }}
        >
          {(
            [
              ['firstname', 'First name'],
              ['lastname', 'Last name'],
              ['username', 'Username'],
              ['email', 'Email'],
              ['phone', 'Phone'],
              ['password', 'New password (optional)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm font-bold">
              {label}
              <input
                className="ui-input mt-1.5"
                type={
                  key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'
                }
                value={profile[key]}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, [key]: e.target.value }))
                }
                required={key !== 'password' && key !== 'phone'}
              />
            </label>
          ))}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={profileMut.isPending}
              className="ui-btn ui-btn-primary disabled:opacity-60"
            >
              {profileMut.isPending ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </section>

      <section className="ui-panel relative overflow-hidden p-6">
        <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-trigo/10 blur-3xl" />
        <div className="relative">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
            Marketplace
          </div>
          <h2 className="mt-1 text-lg font-extrabold tracking-[-0.03em]">
            Platform settings
          </h2>
          {error ? (
            <div className="mt-3">
              <Flash tone="error">{(error as Error).message}</Flash>
            </div>
          ) : null}
          {isLoading || !settings ? (
            <div className="mt-4 space-y-3">
              <div className="skeleton h-12" />
              <div className="skeleton h-12" />
              <div className="skeleton h-40" />
            </div>
          ) : (
            <form
              className="mt-5 space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                settingsMut.mutate();
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  Company name
                  <input
                    className="ui-input mt-1.5"
                    value={settings.companyName}
                    onChange={(e) =>
                      setSettings({ ...settings, companyName: e.target.value })
                    }
                  />
                </label>
                <label className="text-sm font-bold">
                  Support email
                  <input
                    className="ui-input mt-1.5"
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) =>
                      setSettings({ ...settings, supportEmail: e.target.value })
                    }
                  />
                </label>
                <label className="text-sm font-bold">
                  Match radius (km)
                  <input
                    className="ui-input mt-1.5"
                    type="number"
                    min="1"
                    value={settings.matchRadiusKm}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        matchRadiusKm: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="text-sm font-bold">
                  Offer TTL (seconds)
                  <input
                    className="ui-input mt-1.5"
                    type="number"
                    min="5"
                    value={settings.offerTtlSec}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        offerTtlSec: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="text-sm font-bold">
                  Tax percent
                  <input
                    className="ui-input mt-1.5"
                    type="number"
                    min="0"
                    step="0.1"
                    value={settings.taxPercent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        taxPercent: Number(e.target.value),
                      })
                    }
                  />
                  <span className="mt-1 block text-xs font-medium text-muted">
                    VAT added on top of the fare. Not platform revenue.
                  </span>
                </label>
                <label className="text-sm font-bold">
                  Commission percent
                  <input
                    className="ui-input mt-1.5"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.commissionPercent ?? 15}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        commissionPercent: Number(e.target.value),
                      })
                    }
                  />
                  <span className="mt-1 block text-xs font-medium text-muted">
                    Platform take from net fare. Riders keep the rest.
                  </span>
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-line bg-canvas/70 px-4 py-3 text-sm font-bold sm:mt-7">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-trigo"
                    checked={Boolean(settings.maintenanceMode)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maintenanceMode: e.target.checked,
                      })
                    }
                  />
                  Maintenance mode
                </label>
                {settings.maintenanceMode ? (
                  <label className="text-sm font-bold sm:col-span-2">
                    Maintenance message (shown in apps)
                    <textarea
                      className="ui-input mt-1.5 min-h-[96px] resize-y"
                      value={settings.maintenanceMessage || ''}
                      placeholder="Fastigo is temporarily unavailable for scheduled maintenance. Please try again shortly."
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          maintenanceMessage: e.target.value,
                        })
                      }
                    />
                  </label>
                ) : null}
                <label className="text-sm font-bold">
                  Cash notify at (₦)
                  <input
                    className="ui-input mt-1.5"
                    type="number"
                    min="0"
                    value={settings.cashThreshold ?? 5000}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cashThreshold: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="text-sm font-bold">
                  Cash hard flag (₦)
                  <input
                    className="ui-input mt-1.5"
                    type="number"
                    min="0"
                    value={settings.cashHardCap ?? 15000}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cashHardCap: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>

              <p className="text-xs font-medium text-muted">
                cashHeld tracks unpaid platform commission from cash trips (Uber /
                Bolt style), not the full passenger fare. Busy riders (12+ trips in
                7 days or 5+ today) can keep working after ₦5,000 — admin is
                notified. Quiet or idle riders get taken offline at ₦5,000 until
                paid. Everyone is flagged at the hard cap. Wallet trip earnings
                auto-offset this debt.
              </p>

              <div>
                <h3 className="font-extrabold tracking-[-0.02em]">
                  Fare rates (₦)
                </h3>
                <div className="mt-3 space-y-3">
                  {RATE_TYPES.map((type) => (
                    <div
                      key={type}
                      className="rounded-2xl border border-line/80 bg-canvas/60 p-4"
                    >
                      <div className="mb-3 text-sm font-extrabold tracking-wide">
                        {RIDE_RATE_LABELS[type] || type}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-4">
                        {(
                          [
                            ['base', 'Base'],
                            ['perKm', 'Per km'],
                            ['perMin', 'Per min'],
                            ['multiplier', 'Multiplier'],
                          ] as const
                        ).map(([field, label]) => (
                          <label key={field} className="text-xs font-bold">
                            {label}
                            <input
                              className="ui-input mt-1 !rounded-xl !px-2.5 !py-2"
                              type="number"
                              step={field === 'multiplier' ? '0.05' : '1'}
                              value={settings.rideRates[type]?.[field] ?? ''}
                              onChange={(e) =>
                                updateRate(type, field, e.target.value)
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={settingsMut.isPending}
                className="ui-btn ui-btn-primary disabled:opacity-60"
              >
                {settingsMut.isPending ? 'Saving…' : 'Save platform settings'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
