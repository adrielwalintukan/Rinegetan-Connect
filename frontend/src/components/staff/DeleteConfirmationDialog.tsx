"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const panel = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => panel.current?.querySelector<HTMLButtonElement>("button")?.focus(), 0);
    return () => { window.clearTimeout(timer); previous?.focus(); };
  }, [isOpen]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (isDeleting) panel.current?.focus(); }, [isDeleting]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (pending.current || isDeleting) return;
    pending.current = true;
    setError(null);
    try {
      await onConfirm(`Penghapusan permanen ${entityName} oleh Admin`);
      onClose();
    } catch (err) {
      setError(clientErrorMessage(err, "Gagal menghapus konten"));
    } finally { pending.current = false; }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!isDeleting && !pending.current) onClose(); }} className={MODAL_BACKDROP} label={`Konfirmasi hapus ${entityName}`}>
      <div ref={panel} tabIndex={-1} onKeyDown={event => {
        if (event.key !== "Tab") return;
        const controls = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }} className="relative w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          aria-label="Tutup konfirmasi hapus"
          className="absolute right-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-navy"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 pr-9 text-red-600">
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
          Konten <strong className="break-words text-navy">&quot;{itemTitle}&quot;</strong> akan dihapus
          secara fisik dari database. Tindakan ini akan dicatat dalam audit log gereja.
        </p>

        {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="min-h-11 min-w-11 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="min-h-11 min-w-11 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Menghapus..." : "Konfirmasi Hapus Permanen"}
          </button>
        </div>
      </div>
    </Modal>
  );
};
