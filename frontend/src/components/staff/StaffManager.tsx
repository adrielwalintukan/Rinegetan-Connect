"use client";

import React, { useState } from "react";
import { MailPlus, Trash2, UserCheck, UserMinus, UserRound, X } from "lucide-react";
import { Modal, MODAL_BACKDROP } from "@/components/ui/modal";
import { clientErrorMessage } from "@/lib/api/errors";

export interface StaffMember {
  id: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  role: "admin" | "editor" | null;
}

interface StaffManagerProps {
  initialStaff: StaffMember[];
  currentUserId: string;
  onNotification: (type: "success" | "error", message: string) => void;
}

// The staff API answers with codes (P2-203 contract); these are the staff-facing texts.
const STAFF_ERRORS: Record<string, string> = {
  validation_error: "Periksa kembali isian Anda. Alasan penghapusan minimal 5 karakter.",
  staff_conflict: "Email ini sudah terdaftar sebagai staf.",
  email_registered:
    "Email ini sudah terdaftar. Jika akunnya nonaktif, aktifkan kembali dari daftar staf di bawah, atau hapus akunnya terlebih dahulu.",
  rate_limited: "Batas pengiriman email tercapai. Silakan coba lagi sekitar satu jam lagi.",
  invite_failed: "Undangan belum terkirim. Pastikan alamat email benar, lalu coba lagi.",
  provision_failed: "Akun dibuat tetapi peran Editor gagal diberikan. Silakan coba lagi.",
  not_found: "Staf tidak ditemukan atau bukan Editor.",
  not_inactive: "Editor ini sudah aktif.",
  cannot_delete_self: "Anda tidak dapat menghapus akun Anda sendiri.",
  deactivation_failed: "Gagal menonaktifkan staf. Silakan coba lagi.",
  reactivation_failed: "Gagal mengaktifkan kembali staf. Silakan coba lagi.",
  deletion_failed: "Gagal menghapus staf. Silakan coba lagi.",
  unauthenticated: "Sesi Anda berakhir. Silakan masuk kembali.",
  forbidden: "Hanya Admin yang dapat mengelola staf.",
};

const staffError = (code: unknown, fallback: string) =>
  (typeof code === "string" && STAFF_ERRORS[code]) || fallback;

type StaffAction = "deactivate" | "reactivate" | "delete";

const ACTIONS: Record<
  StaffAction,
  { endpoint: string; title: string; impact: string; confirm: string; success: string; danger: boolean }
> = {
  deactivate: {
    endpoint: "/api/staff/deactivate",
    title: "Nonaktifkan",
    impact: "Editor ini tidak dapat masuk sampai diaktifkan kembali. Konten yang sudah dibuat tetap tersimpan.",
    confirm: "Nonaktifkan",
    success: "dinonaktifkan dan tidak dapat masuk.",
    danger: true,
  },
  reactivate: {
    endpoint: "/api/staff/reactivate",
    title: "Aktifkan kembali",
    impact: "Editor ini dapat masuk lagi dengan email dan password sebelumnya.",
    confirm: "Aktifkan",
    success: "aktif kembali dan dapat masuk.",
    danger: false,
  },
  delete: {
    endpoint: "/api/staff/delete",
    title: "Hapus permanen",
    impact:
      "Akun dan aksesnya dihapus permanen dan tidak dapat dikembalikan. Konten yang pernah dibuat tetap tersimpan. Email ini dapat diundang ulang setelahnya.",
    confirm: "Hapus permanen",
    success: "dihapus. Email ini sekarang dapat diundang ulang.",
    danger: true,
  },
};

export const StaffManager: React.FC<StaffManagerProps> = ({ initialStaff, currentUserId, onNotification }) => {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [pending, setPending] = useState<{ member: StaffMember; action: StaffAction } | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAction = (member: StaffMember, action: StaffAction) => {
    setReason("");
    setPending({ member, action });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      const res = await fetch("/api/staff/invite-editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), displayName: displayName.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.userId) {
        throw new Error(staffError(json.error, "Undangan belum terkirim. Silakan coba lagi."));
      }
      setStaff((prev) => [
        ...prev,
        {
          id: json.userId,
          display_name: displayName.trim(),
          is_active: true,
          created_at: new Date().toISOString(),
          role: "editor",
        },
      ]);
      onNotification("success", `Undangan terkirim ke ${email.trim()}. Editor perlu membuka email lalu membuat password.`);
      setDisplayName("");
      setEmail("");
    } catch (err) {
      onNotification("error", clientErrorMessage(err, "Undangan belum terkirim."));
    } finally {
      setIsInviting(false);
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    const { member, action } = pending;
    const config = ACTIONS[action];
    setIsSubmitting(true);
    try {
      const res = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id, reason: reason.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(staffError(json.error, `Gagal: ${config.title.toLowerCase()}.`));
      }
      setStaff((prev) =>
        action === "delete"
          ? prev.filter((s) => s.id !== member.id)
          : prev.map((s) => (s.id === member.id ? { ...s, is_active: action === "reactivate" } : s))
      );
      onNotification("success", `${member.display_name} ${config.success}`);
      setPending(null);
    } catch (err) {
      onNotification("error", clientErrorMessage(err, `Gagal: ${config.title.toLowerCase()}.`));
    } finally {
      setIsSubmitting(false);
    }
  };

  const iconButton = "flex min-h-11 min-w-11 items-center justify-center rounded-xl transition";
  const config = pending ? ACTIONS[pending.action] : null;

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleInvite}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <h2 className="text-sm font-bold text-navy">Undang Editor</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Editor dapat mengelola konten dan foto, tetapi tidak dapat mengelola staf atau menghapus permanen.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-xs font-semibold text-slate-700">
            Nama
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={120}
              autoComplete="name"
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
              autoComplete="email"
              inputMode="email"
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </label>
          <button
            type="submit"
            disabled={isInviting}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-700 disabled:opacity-60"
          >
            <MailPlus className="h-4 w-4" aria-hidden="true" />
            {isInviting ? "Mengirim…" : "Kirim undangan"}
          </button>
        </div>
      </form>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((member) => {
          const manageable = member.role === "editor" && member.id !== currentUserId;
          return (
            <li
              key={member.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy">
                  {member.display_name}
                  {member.id === currentUserId && <span className="font-normal text-slate-500"> (Anda)</span>}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold ${
                      member.role === "admin" ? "bg-sabbath-100 text-sabbath-700" : "bg-navy-50 text-navy"
                    }`}
                  >
                    {member.role === "admin" ? "Admin" : "Editor"}
                  </span>
                  <span className={member.is_active ? "text-emerald-700" : "text-slate-400"}>
                    {member.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </p>
              </div>
              {manageable && (
                <div className="flex shrink-0 items-center">
                  {member.is_active ? (
                    <button
                      type="button"
                      onClick={() => openAction(member, "deactivate")}
                      aria-label={`Nonaktifkan ${member.display_name}`}
                      title="Nonaktifkan"
                      className={`${iconButton} text-amber-700 hover:bg-amber-50`}
                    >
                      <UserMinus className="h-5 w-5" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAction(member, "reactivate")}
                      aria-label={`Aktifkan kembali ${member.display_name}`}
                      title="Aktifkan kembali"
                      className={`${iconButton} text-emerald-700 hover:bg-emerald-50`}
                    >
                      <UserCheck className="h-5 w-5" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openAction(member, "delete")}
                    aria-label={`Hapus ${member.display_name}`}
                    title="Hapus permanen"
                    className={`${iconButton} text-red-600 hover:bg-red-50`}
                  >
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Modal
        isOpen={Boolean(pending && config)}
        onClose={() => setPending(null)}
        className={MODAL_BACKDROP}
        labelledBy="staff-action-title"
      >
        {pending && config && (
          <form onSubmit={handleAction} className="relative w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 pb-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setPending(null)}
              disabled={isSubmitting}
              aria-label="Tutup"
              className="absolute right-3 top-3 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <h3 id="staff-action-title" className="pr-10 text-lg font-bold text-navy">
              {config.title} {pending.member.display_name}?
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{config.impact} Tindakan ini tercatat di Log Audit.</p>
            <label className="mt-4 block text-xs font-semibold text-slate-700">
              Alasan
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={pending.action === "delete" ? 5 : 1}
                maxLength={240}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </label>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={isSubmitting}
                className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`min-h-11 rounded-xl px-5 text-sm font-semibold text-white transition disabled:opacity-60 ${
                  config.danger ? "bg-red-600 hover:bg-red-700" : "bg-navy hover:bg-navy-700"
                }`}
              >
                {isSubmitting ? "Memproses…" : config.confirm}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
