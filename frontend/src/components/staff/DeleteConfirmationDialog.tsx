"use client";

import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  itemTitle: string;
  entityName: string;
  isDeleting: boolean;
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemTitle,
  entityName,
  isDeleting,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError("Alasan penghapusan minimal 5 karakter");
      return;
    }

    setError(null);
    try {
      await onConfirm(trimmed);
      setReason("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus konten");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-navy"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 text-red-600">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Hapus Permanen {entityName}?
            </h3>
            <p className="text-xs text-red-600">Tindakan ini tidak dapat dibatalkan</p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          Konten <strong className="text-navy">&quot;{itemTitle}&quot;</strong> akan dihapus
          secara fisik dari database. Seluruh tindakan dan alasan akan dicatat dalam
          audit log gereja.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="delete-reason"
              className="block text-xs font-semibold text-slate-700"
            >
              Alasan Penghapusan (Wajib)
            </label>
            <textarea
              id="delete-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Contoh: Acara dibatalkan / konten duplikat..."
              rows={3}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-navy placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isDeleting || reason.trim().length < 5}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? "Menghapus..." : "Konfirmasi Hapus Permanen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
