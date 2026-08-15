import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@trigo.app');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(155deg,#0f766e_0%,#0d9488_38%,#115e59_72%,#0b3f3a_100%)]" />
        <div className="absolute -left-24 top-24 h-80 w-80 rounded-full bg-amber/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-trigo-glow/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-trigo-glow">
              TriGo
            </div>
            <h1 className="mt-8 max-w-md text-5xl font-extrabold leading-[1.05] tracking-[-0.05em]">
              Run the city
              <span className="block text-amber">from one desk.</span>
            </h1>
            <p className="mt-5 max-w-sm text-base font-medium text-white/70">
              Trips, safety, wallets, and people — live ops for Abuja keke
              marketplace.
            </p>
          </div>
          <div className="grid max-w-md grid-cols-3 gap-3">
            {['Live matching', 'SOS queue', 'Wallet control'].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/15 bg-white/8 px-3 py-4 text-sm font-semibold backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative flex items-center justify-center px-6 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(700px_300px_at_70%_10%,rgba(13,148,136,0.1),transparent)]" />
        <form
          onSubmit={onSubmit}
          className="animate-rise ui-panel relative w-full max-w-md p-8 md:p-10"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-trigo lg:hidden">
            TriGo
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">
            Admin sign in
          </h2>
          <p className="mt-2 text-sm font-medium text-muted">
            Use your staff account to open Command.
          </p>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          <label className="mt-7 block text-sm font-bold">
            Email
            <input
              className="ui-input mt-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-bold">
            Password
            <input
              className="ui-input mt-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="ui-btn ui-btn-primary mt-7 w-full disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Enter Command'}
          </button>
        </form>
      </section>
    </div>
  );
}
