"use client";

import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { clientErrorMessage } from "@/lib/api/errors";
import { Modal, MODAL_BACKDROP } from "@/components/ui/modal";

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
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setError(null);
    try {
      await onConfirm(`Penghapusan permanen ${entityName} oleh Admin`);
      onClose();
    } catch (err) {
      setError(clientErrorMessage(err, "Gagal menghapus konten"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={MODAL_BACKDROP}>
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
          secara fisik dari database. Tindakan ini akan dicatat dalam audit log gereja.
        </p>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Menghapus..." : "Konfirmasi Hapus Permanen"}
          </button>
        </div>
      </div>
    </Modal>
  );
};
