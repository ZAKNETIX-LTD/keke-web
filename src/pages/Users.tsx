import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { ROLE } from '../lib/types';

const emptyForm = {
  firstname: '',
  lastname: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  status: 'active',
};

export function UsersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [message, setMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const params = useMemo(
    () => ({
      kind: 'passenger' as const,
      q: q || undefined,
      status: status === 'all' ? undefined : status,
    }),
    [q, status],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminApi.listUsers(params),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => adminApi.updateUser(id, payload),
    onSuccess: () => {
      setMessage('User updated');
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const createMut = useMutation({
    mutationFn: () =>
      adminApi.createUser({
        ...form,
        role: ROLE.passenger,
        status: form.status,
      }),
    onSuccess: (user) => {
      setMessage('Passenger created');
      setShowCreate(false);
      setForm(emptyForm);
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      navigate(`/users/${user.id}`);
    },
    onError: (err: Error) => setMessage(err.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Passenger accounts only. Open a user for full profile details."
        actions={
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="ui-btn ui-btn-primary"
          >
            {showCreate ? 'Close form' : 'Create user'}
          </button>
        }
      />

      {message ? <Flash>{message}</Flash> : null}

      {showCreate ? (
        <form
          className="animate-rise ui-panel grid gap-3 p-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
        >
          <div className="sm:col-span-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              New passenger
            </div>
            <h2 className="mt-1 text-lg font-extrabold tracking-[-0.03em]">
              Create a user account
            </h2>
          </div>
          {(
            [
              ['firstname', 'First name'],
              ['lastname', 'Last name'],
              ['username', 'Username'],
              ['email', 'Email'],
              ['phone', 'Phone'],
              ['password', 'Password'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm font-bold">
              {label}
              <input
                className="ui-input mt-1.5"
                type={
                  key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'
                }
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required={key !== 'phone'}
              />
            </label>
          ))}
          <label className="text-sm font-bold">
            Status
            <select
              className="ui-input mt-1.5"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={createMut.isPending}
              className="ui-btn ui-btn-primary disabled:opacity-60"
            >
              {createMut.isPending ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="ui-panel flex flex-wrap gap-3 p-3">
        <input
          className="ui-input min-w-[220px] flex-1"
          placeholder="Search name, email, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="ui-input w-auto min-w-[140px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error ? <Flash tone="error">{(error as Error).message}</Flash> : null}

      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="text-muted" colSpan={4}>
                  Loading users…
                </td>
              </tr>
            ) : (data || []).length === 0 ? (
              <tr>
                <td className="text-muted" colSpan={4}>
                  No passengers found
                </td>
              </tr>
            ) : (
              (data || []).map((user) => (
                <tr key={user.id}>
                  <td>
                    <Link
                      to={`/users/${user.id}`}
                      className="font-bold text-trigo hover:underline"
                    >
                      {[user.firstname, user.lastname]
                        .filter(Boolean)
                        .join(' ') || user.username}
                    </Link>
                    <div className="text-xs font-medium text-muted">
                      {user.email} · #{user.id}
                    </div>
                  </td>
                  <td className="text-sm font-medium text-muted">
                    {user.phone || '—'}
                  </td>
                  <td>
                    <StatusBadge status={user.status || 'active'} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <Link
                        to={`/users/${user.id}`}
                        className="ui-btn ui-btn-ghost !px-2.5 !py-1.5 text-xs"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        className="ui-btn ui-btn-ghost !px-2.5 !py-1.5 text-xs"
                        onClick={() =>
                          updateMut.mutate({
                            id: user.id,
                            payload: {
                              status:
                                user.status === 'suspended'
                                  ? 'active'
                                  : 'suspended',
                            },
                          })
                        }
                      >
                        {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
