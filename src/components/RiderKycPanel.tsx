import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { adminApi } from '../api/admin';
import { API_URL, type RiderKycPayload } from '../lib/types';
import {
  toAdminVehicleCategory,
  toApiVehicleType,
  type AdminVehicleCategory,
} from '../lib/vehicle';
import { Flash } from './Flash';
import { StatusBadge } from './StatusBadge';

const DOC_TYPES = [
  { type: 'application_selfie', label: 'Application selfie (driver)' },
  { type: 'id_front', label: 'ID / license front' },
  { type: 'id_back', label: 'ID / license back' },
  { type: 'selfie', label: 'Official selfie (officer)' },
  { type: 'ownership_doc', label: 'Ownership / papers' },
  { type: 'inspection_doc', label: 'Inspection papers' },
  { type: 'vehicle_exterior', label: 'Vehicle exterior' },
  { type: 'vehicle_interior', label: 'Vehicle interior' },
  { type: 'phone_doc', label: 'Phone doc' },
  { type: 'other', label: 'Other' },
] as const;

function mediaUrl(url?: string | null) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function RiderKycPanel({
  riderId,
  kyc,
}: {
  riderId: string;
  kyc?: RiderKycPayload | null;
}) {
  const qc = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    idNumber: '',
    kycAddress: '',
    kinName: '',
    kinPhone: '',
    kinRelationship: '',
    phoneOwnership: 'own',
    phoneImei: '',
    ownershipType: 'own',
    companyName: '',
    companyAssetTag: '',
    vehicleType: 'keke' as AdminVehicleCategory,
    plateNumber: '',
    vehicleModel: '',
    vehicleColor: '',
  });

  useEffect(() => {
    if (!kyc) return;
    setForm({
      idNumber: kyc.idNumber || '',
      kycAddress: kyc.address?.value || '',
      kinName: kyc.kin?.name || '',
      kinPhone: kyc.kin?.phone || '',
      kinRelationship: kyc.kin?.relationship || '',
      phoneOwnership: kyc.phone?.ownership || 'own',
      phoneImei: kyc.phone?.imei || '',
      ownershipType: kyc.vehicle?.ownershipType || 'own',
      companyName: kyc.vehicle?.companyName || '',
      companyAssetTag: kyc.vehicle?.companyAssetTag || '',
      vehicleType: toAdminVehicleCategory(kyc.vehicle?.type),
      plateNumber: kyc.vehicle?.plateNumber || '',
      vehicleModel: kyc.vehicle?.model || '',
      vehicleColor: kyc.vehicle?.color || '',
    });
    setRejectReason(kyc.rejectReason || '');
  }, [kyc]);

  const saveMut = useMutation({
    mutationFn: () =>
      adminApi.updateRiderKyc(riderId, {
        idNumber: form.idNumber,
        kycAddress: form.kycAddress,
        kinName: form.kinName,
        kinPhone: form.kinPhone,
        kinRelationship: form.kinRelationship,
        phoneOwnership: form.phoneOwnership,
        phoneImei: form.phoneImei,
        ownershipType: form.ownershipType,
        companyName: form.companyName,
        companyAssetTag: form.companyAssetTag,
        vehicleType: toApiVehicleType(form.vehicleType),
        plateNumber: form.plateNumber,
        vehicleModel: form.vehicleModel,
        vehicleColor: form.vehicleColor,
      }),
    onSuccess: () => {
      setMessage('KYC fields saved');
      void qc.invalidateQueries({ queryKey: ['admin', 'rider', riderId] });
      void qc.invalidateQueries({ queryKey: ['admin', 'riders'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const verifyAddressMut = useMutation({
    mutationFn: () =>
      adminApi.updateRiderKyc(riderId, {
        kycAddress: form.kycAddress,
        addressVerified: true,
      }),
    onSuccess: () => {
      setMessage('Address marked as physically verified');
      void qc.invalidateQueries({ queryKey: ['admin', 'rider', riderId] });
      void qc.invalidateQueries({ queryKey: ['admin', 'riders'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const reviewMut = useMutation({
    mutationFn: (status: 'approved' | 'rejected') =>
      adminApi.reviewRiderKyc(riderId, {
        status,
        reason: status === 'rejected' ? rejectReason : undefined,
      }),
    onSuccess: (_, status) => {
      setMessage(status === 'approved' ? 'KYC approved' : 'KYC rejected');
      void qc.invalidateQueries({ queryKey: ['admin', 'rider', riderId] });
      void qc.invalidateQueries({ queryKey: ['admin', 'riders'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const uploadMut = useMutation({
    mutationFn: async ({ type, file }: { type: string; file: File }) => {
      const uploaded = await adminApi.uploadFile(file);
      return adminApi.updateRiderKyc(riderId, {
        document: {
          type,
          url: uploaded.url,
          originalName: uploaded.originalName,
          mimeType: uploaded.mimeType,
        },
      });
    },
    onSuccess: (_, vars) => {
      setMessage(
        vars.type === 'selfie'
          ? 'Officer selfie captured and locked'
          : 'Document uploaded',
      );
      void qc.invalidateQueries({ queryKey: ['admin', 'rider', riderId] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  if (!kyc) {
    return <Flash tone="error">KYC payload missing</Flash>;
  }

  const missing = kyc.checklist?.missing || [];
  const approvalMissing = kyc.approvalChecklist?.missing || [];
  const selfieLocked = Boolean(kyc.selfieLocked);
  const addressVerified = Boolean(kyc.address?.verified);

  return (
    <div className="space-y-5">
      {message ? <Flash>{message}</Flash> : null}

      <div className="ui-panel flex flex-wrap items-center gap-3 p-4">
        <StatusBadge status={kyc.status || 'not_started'} />
        <div className="text-sm font-semibold text-muted">
          {kyc.checklist?.complete
            ? 'Driver checklist complete'
            : `Driver missing: ${missing.join(', ') || '—'}`}
        </div>
        <div className="w-full text-sm font-semibold text-muted">
          {kyc.approvalChecklist?.complete
            ? 'Physical verification complete — ready to approve'
            : `Officer still needs: ${approvalMissing.join(', ') || '—'}`}
        </div>
        {kyc.rejectReason ? (
          <div className="w-full text-sm font-medium text-rose-700">
            Reject reason: {kyc.rejectReason}
          </div>
        ) : null}
      </div>

      <section className="ui-panel space-y-3 p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber">
          Physical verification
        </div>
        <p className="text-sm font-medium text-muted">
          Visit the declared address and snap the rider&apos;s selfie in person.
          Officer selfies cannot be changed after capture.
        </p>
        <label className="block text-sm font-bold">
          Residential address
          <textarea
            className="ui-input mt-1.5 min-h-[72px]"
            value={form.kycAddress}
            onChange={(e) =>
              setForm((f) => ({ ...f, kycAddress: e.target.value }))
            }
            placeholder="Street, area, landmark"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {addressVerified ? (
            <span className="inline-flex rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-800">
              Address verified
              {kyc.address?.verifiedAt
                ? ` · ${new Date(kyc.address.verifiedAt).toLocaleString()}`
                : ''}
            </span>
          ) : (
            <span className="inline-flex rounded-lg bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900">
              Address not verified
            </span>
          )}
          <button
            type="button"
            className="ui-btn ui-btn-primary disabled:opacity-60"
            disabled={
              verifyAddressMut.isPending ||
              !form.kycAddress.trim() ||
              addressVerified
            }
            onClick={() => verifyAddressMut.mutate()}
          >
            {addressVerified
              ? 'Verified'
              : verifyAddressMut.isPending
                ? 'Saving…'
                : 'Mark address verified'}
          </button>
        </div>

        <div className="rounded-xl border border-line p-3">
          <div className="text-sm font-bold">Officer selfie (locked after snap)</div>
          {kyc.latestDocuments?.selfie?.url ? (
            <button
              type="button"
              className="mt-2 block w-full overflow-hidden rounded-lg bg-slate-100"
              onClick={() =>
                setPreview(mediaUrl(kyc.latestDocuments?.selfie?.url))
              }
            >
              <img
                src={mediaUrl(kyc.latestDocuments.selfie.url)}
                alt="Officer selfie"
                className="h-44 w-full object-cover"
              />
            </button>
          ) : (
            <div className="mt-2 flex h-44 items-center justify-center rounded-lg bg-slate-50 text-xs font-semibold text-muted">
              No officer selfie yet
            </div>
          )}
          {selfieLocked ? (
            <div className="mt-2 text-xs font-semibold text-emerald-800">
              Locked — captured by officer
              {kyc.latestDocuments?.selfie?.uploadedBy
                ? ` (${kyc.latestDocuments.selfie.uploadedBy})`
                : ''}
            </div>
          ) : (
            <label className="mt-2 block text-xs font-bold text-trigo">
              Snap with camera
              <input
                type="file"
                accept="image/*"
                capture="user"
                className="mt-1 block w-full text-xs"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadMut.mutate({ type: 'selfie', file });
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      </section>

      <form
        className="ui-panel grid gap-3 p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          saveMut.mutate();
        }}
      >
        <div className="sm:col-span-2 text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
          Profile fields
        </div>

        <label className="text-sm font-bold">
          ID / NIN / license #
          <input
            className="ui-input mt-1.5"
            value={form.idNumber}
            onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))}
          />
        </label>
        <label className="text-sm font-bold sm:col-span-2">
          Residential address
          <textarea
            className="ui-input mt-1.5 min-h-[72px]"
            value={form.kycAddress}
            onChange={(e) =>
              setForm((f) => ({ ...f, kycAddress: e.target.value }))
            }
          />
        </label>
        <label className="text-sm font-bold">
          Ownership type
          <select
            className="ui-input mt-1.5"
            value={form.ownershipType}
            onChange={(e) =>
              setForm((f) => ({ ...f, ownershipType: e.target.value }))
            }
          >
            <option value="own">Own vehicle</option>
            <option value="company">Company-issued</option>
          </select>
        </label>

        {form.ownershipType === 'company' ? (
          <>
            <label className="text-sm font-bold">
              Company name
              <input
                className="ui-input mt-1.5"
                value={form.companyName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, companyName: e.target.value }))
                }
              />
            </label>
            <label className="text-sm font-bold">
              Asset tag
              <input
                className="ui-input mt-1.5"
                value={form.companyAssetTag}
                onChange={(e) =>
                  setForm((f) => ({ ...f, companyAssetTag: e.target.value }))
                }
              />
            </label>
          </>
        ) : null}

        <label className="text-sm font-bold">
          Vehicle type
          <select
            className="ui-input mt-1.5"
            value={form.vehicleType}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                vehicleType: e.target.value as AdminVehicleCategory,
              }))
            }
          >
            <option value="keke">Keke</option>
            <option value="car">Car</option>
          </select>
        </label>
        <label className="text-sm font-bold">
          Plate number
          <input
            className="ui-input mt-1.5"
            value={form.plateNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, plateNumber: e.target.value }))
            }
          />
        </label>
        <label className="text-sm font-bold">
          Vehicle model
          <input
            className="ui-input mt-1.5"
            value={form.vehicleModel}
            onChange={(e) =>
              setForm((f) => ({ ...f, vehicleModel: e.target.value }))
            }
          />
        </label>
        <label className="text-sm font-bold">
          Vehicle color
          <input
            className="ui-input mt-1.5"
            value={form.vehicleColor}
            onChange={(e) =>
              setForm((f) => ({ ...f, vehicleColor: e.target.value }))
            }
          />
        </label>

        <label className="text-sm font-bold">
          Phone ownership
          <select
            className="ui-input mt-1.5"
            value={form.phoneOwnership}
            onChange={(e) =>
              setForm((f) => ({ ...f, phoneOwnership: e.target.value }))
            }
          >
            <option value="own">Own phone</option>
            <option value="company">Company phone</option>
          </select>
        </label>
        <label className="text-sm font-bold">
          Phone IMEI
          <input
            className="ui-input mt-1.5"
            value={form.phoneImei}
            onChange={(e) => setForm((f) => ({ ...f, phoneImei: e.target.value }))}
          />
        </label>

        <label className="text-sm font-bold">
          Next of kin name
          <input
            className="ui-input mt-1.5"
            value={form.kinName}
            onChange={(e) => setForm((f) => ({ ...f, kinName: e.target.value }))}
          />
        </label>
        <label className="text-sm font-bold">
          Next of kin phone
          <input
            className="ui-input mt-1.5"
            value={form.kinPhone}
            onChange={(e) => setForm((f) => ({ ...f, kinPhone: e.target.value }))}
          />
        </label>
        <label className="text-sm font-bold sm:col-span-2">
          Relationship
          <input
            className="ui-input mt-1.5"
            value={form.kinRelationship}
            onChange={(e) =>
              setForm((f) => ({ ...f, kinRelationship: e.target.value }))
            }
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saveMut.isPending}
            className="ui-btn ui-btn-primary disabled:opacity-60"
          >
            {saveMut.isPending ? 'Saving…' : 'Save KYC fields'}
          </button>
        </div>
      </form>

      <div className="ui-panel p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-trigo">
          Documents
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {DOC_TYPES.filter((d) => d.type !== 'selfie').map(({ type, label }) => {
            const doc = kyc.latestDocuments?.[type];
            return (
              <div key={type} className="rounded-xl border border-line p-3">
                <div className="text-sm font-bold">{label}</div>
                {doc?.url ? (
                  <button
                    type="button"
                    className="mt-2 block w-full overflow-hidden rounded-lg bg-slate-100"
                    onClick={() => setPreview(mediaUrl(doc.url))}
                  >
                    <img
                      src={mediaUrl(doc.url)}
                      alt={label}
                      className="h-36 w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="mt-2 flex h-36 items-center justify-center rounded-lg bg-slate-50 text-xs font-semibold text-muted">
                    No file
                  </div>
                )}
                <label className="mt-2 block text-xs font-bold text-trigo">
                  Upload
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="mt-1 block w-full text-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadMut.mutate({ type, file });
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ui-panel space-y-3 p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber">
          Review
        </div>
        {!kyc.approvalChecklist?.complete ? (
          <p className="text-sm font-medium text-amber-900">
            Approve stays blocked until officer selfie and address verification
            are done.
          </p>
        ) : null}
        <label className="block text-sm font-bold">
          Reject reason
          <textarea
            className="ui-input mt-1.5 min-h-[80px]"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Required when rejecting"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ui-btn ui-btn-primary disabled:opacity-60"
            disabled={
              reviewMut.isPending || !kyc.approvalChecklist?.complete
            }
            onClick={() => reviewMut.mutate('approved')}
          >
            Approve KYC
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-ghost"
            disabled={reviewMut.isPending || !rejectReason.trim()}
            onClick={() => reviewMut.mutate('rejected')}
          >
            Reject KYC
          </button>
        </div>
      </div>

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
          role="presentation"
        >
          <img
            src={preview}
            alt="Document preview"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
