import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Percent, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { adminApi, type AdminPromo } from '../api/admin';
import { Flash } from '../components/Flash';
import { PageHeader } from '../components/PageHeader';

function emptyForm(): Partial<AdminPromo> & {
  code: string;
  discountValue: number;
} {
  return {
    code: '',
    title: '',
    description: '',
    discountType: 'percent',
    discountValue: 10,
    maxDiscount: null,
    isActive: true,
    expiresAt: '',
  };
}

function formatExpiry(value?: string | null) {
  if (!value) return 'No expiry';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export function PromosPage() {
  const qc = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: promos = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'promos'],
    queryFn: () => adminApi.listPromos(),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.trim().toUpperCase(),
        title: (form.title || form.code).trim(),
        description: form.description || '',
        discountType: form.discountType === 'flat' ? 'flat' : 'percent',
        discountValue: Number(form.discountValue),
        maxDiscount:
          form.maxDiscount === null ||
          form.maxDiscount === undefined ||
          form.maxDiscount === ('' as unknown as number)
            ? null
            : Number(form.maxDiscount),
        isActive: form.isActive !== false,
        expiresAt: form.expiresAt ? form.expiresAt : null,
      };
      if (editingId) {
        return adminApi.updatePromo(editingId, payload);
      }
      return adminApi.createPromo(payload);
    },
    onSuccess: () => {
      setMessage(editingId ? 'Promo updated' : 'Promo created');
      setForm(emptyForm());
      setEditingId(null);
      void qc.invalidateQueries({ queryKey: ['admin', 'promos'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deletePromo(id),
    onSuccess: () => {
      setMessage('Promo deleted');
      void qc.invalidateQueries({ queryKey: ['admin', 'promos'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const toggleMut = useMutation({
    mutationFn: (promo: AdminPromo) =>
      adminApi.updatePromo(promo.id, { isActive: !promo.isActive }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'promos'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const startEdit = (promo: AdminPromo) => {
    setEditingId(promo.id);
    setForm({
      code: promo.code,
      title: promo.title || '',
      description: promo.description || '',
      discountType: promo.discountType || 'percent',
      discountValue: promo.discountValue,
      maxDiscount: promo.maxDiscount ?? null,
      isActive: promo.isActive,
      expiresAt: promo.expiresAt
        ? new Date(promo.expiresAt).toISOString().slice(0, 10)
        : '',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promo codes"
        description="Create and manage fare discounts for passengers."
      />

      {message ? <Flash>{message}</Flash> : null}
      {error ? <Flash tone="error">{(error as Error).message}</Flash> : null}

      <section className="ui-panel p-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-trigo/10 text-trigo">
            {editingId ? <Percent size={18} /> : <Plus size={18} />}
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
              {editingId ? 'Edit promo' : 'New promo'}
            </div>
            <h2 className="text-lg font-extrabold tracking-[-0.03em]">
              {editingId ? `Editing #${editingId}` : 'Add discount code'}
            </h2>
          </div>
        </div>

        <form
          className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            saveMut.mutate();
          }}
        >
          <label className="text-sm font-bold">
            Code
            <input
              className="ui-input mt-1.5 uppercase"
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="SAVE10"
            />
          </label>
          <label className="text-sm font-bold">
            Title
            <input
              className="ui-input mt-1.5"
              value={form.title || ''}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="10% off"
            />
          </label>
          <label className="text-sm font-bold">
            Type
            <select
              className="ui-input mt-1.5"
              value={form.discountType || 'percent'}
              onChange={(e) =>
                setForm((f) => ({ ...f, discountType: e.target.value }))
              }
            >
              <option value="percent">Percent</option>
              <option value="flat">Flat (₦)</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            Discount value
            <input
              className="ui-input mt-1.5"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.discountValue}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  discountValue: Number(e.target.value),
                }))
              }
            />
          </label>
          <label className="text-sm font-bold">
            Max discount (₦)
            <input
              className="ui-input mt-1.5"
              type="number"
              min={0}
              step="1"
              value={form.maxDiscount ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  maxDiscount: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              placeholder="Optional"
            />
          </label>
          <label className="text-sm font-bold">
            Expires
            <input
              className="ui-input mt-1.5"
              type="date"
              value={
                typeof form.expiresAt === 'string' ? form.expiresAt : ''
              }
              onChange={(e) =>
                setForm((f) => ({ ...f, expiresAt: e.target.value }))
              }
            />
          </label>
          <label className="sm:col-span-2 lg:col-span-3 text-sm font-bold">
            Description
            <input
              className="ui-input mt-1.5"
              value={form.description || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={form.isActive !== false}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.checked }))
              }
            />
            Active
          </label>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-2">
            <button
              type="submit"
              disabled={saveMut.isPending}
              className="ui-btn ui-btn-primary disabled:opacity-50"
            >
              {editingId ? 'Save changes' : 'Create promo'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="ui-btn ui-btn-ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm());
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="ui-panel overflow-hidden">
        <div className="border-b border-line/70 px-5 py-4">
          <h2 className="text-lg font-extrabold tracking-[-0.03em]">
            All promos
          </h2>
          <p className="mt-0.5 text-xs font-medium text-muted">
            {promos.length} code{promos.length === 1 ? '' : 's'}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            <div className="skeleton h-12" />
            <div className="skeleton h-12" />
          </div>
        ) : promos.length === 0 ? (
          <p className="p-5 text-sm font-medium text-muted">
            No promo codes yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-canvas/80 text-[11px] font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-3 py-3">Discount</th>
                  <th className="px-3 py-3">Expires</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((promo) => (
                  <tr key={promo.id} className="border-t border-line/60">
                    <td className="px-5 py-3">
                      <div className="font-extrabold tracking-wide">
                        {promo.code}
                      </div>
                      <div className="text-xs font-medium text-muted">
                        {promo.title}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      {promo.discountType === 'flat'
                        ? `₦${Number(promo.discountValue).toLocaleString()}`
                        : `${promo.discountValue}%`}
                      {promo.maxDiscount != null
                        ? ` · max ₦${Number(promo.maxDiscount).toLocaleString()}`
                        : ''}
                    </td>
                    <td className="px-3 py-3 font-medium text-muted">
                      {formatExpiry(promo.expiresAt)}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleMut.mutate(promo)}
                        className={[
                          'rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
                          promo.isActive
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : 'bg-slate-500/10 text-slate-600',
                        ].join(' ')}
                      >
                        {promo.isActive ? 'Active' : 'Off'}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="ui-btn ui-btn-ghost !px-3 !py-1.5 text-xs"
                          onClick={() => startEdit(promo)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ui-btn ui-btn-danger !px-3 !py-1.5 text-xs"
                          disabled={deleteMut.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete promo ${promo.code}? This cannot be undone.`,
                              )
                            ) {
                              deleteMut.mutate(promo.id);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
