import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';

import { adminApi } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { ROLE, roleLabel } from '../lib/types';
import { useAuth } from '../auth/AuthContext';

const emptyForm = {
  firstname: '',
  lastname: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  role: String(ROLE.admin),
  status: 'active',
};

export function StaffPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [message, setMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const isSuper = Boolean(Number(me?.role || 0) & ROLE.superAdmin);

  const params = useMemo(
    () => ({
      kind: 'staff' as const,
      q: q || undefined,
      status: status === 'all' ? undefined : status,
    }),
    [q, status],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', 'staff', params],
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
      setMessage('Staff updated');
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const createMut = useMutation({
    mutationFn: () => {
      const role = Number(form.role);
      if (role === ROLE.superAdmin && !isSuper) {
        throw new Error('Only a Super Admin can create Super Admins');
      }
      return adminApi.createUser({
        firstname: form.firstname,
        lastname: form.lastname,
        username: form.username,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        role,
        status: form.status,
      });
    },
    onSuccess: () => {
      setMessage('Staff account created');
      setShowCreate(false);
      setForm(emptyForm);
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Admin, Super Admin, and KYC Officer accounts for the ops console."
        actions={
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? 'Close form' : 'Add staff'}
          </button>
        }
      />

      {message ? <Flash>{message}</Flash> : null}
      {error ? <Flash tone="error">{(error as Error).message}</Flash> : null}

      {showCreate ? (
        <form
          className="ui-panel grid gap-3 p-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
        >
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
                  key === 'password'
                    ? 'password'
                    : key === 'email'
                      ? 'email'
                      : 'text'
                }
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
                required={key !== 'phone'}
              />
            </label>
          ))}
          <label className="text-sm font-bold">
            Role
            <select
              className="ui-input mt-1.5"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              <option value={ROLE.admin}>Admin</option>
              <option value={ROLE.kycOfficer}>KYC Officer</option>
              {isSuper ? (
                <option value={ROLE.superAdmin}>Super Admin</option>
              ) : null}
            </select>
          </label>
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
              className="ui-btn ui-btn-primary disabled:opacity-50"
              disabled={createMut.isPending}
            >
              {createMut.isPending ? 'Creating…' : 'Create staff'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="ui-panel flex flex-wrap gap-3 p-3">
        <input
          className="ui-input min-w-[220px] flex-1"
          placeholder="Search staff…"
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

      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="text-muted" colSpan={4}>
                  Loading staff…
                </td>
              </tr>
            ) : (data || []).length === 0 ? (
              <tr>
                <td className="text-muted" colSpan={4}>
                  No staff accounts found
                </td>
              </tr>
            ) : (
              (data || []).map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="font-bold">
                      {[user.firstname, user.lastname]
                        .filter(Boolean)
                        .join(' ') || user.username}
                    </div>
                    <div className="text-xs font-medium text-muted">
                      {user.email} · #{user.id}
                    </div>
                  </td>
                  <td className="text-sm font-semibold">
                    {roleLabel(Number(user.role || 0))}
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
                      {String(user.id) !== String(me?.id) ? (
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
                      ) : null}
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
