"use client";

import React, { useState } from "react";
import { MailPlus, UserMinus, UserRound, X } from "lucide-react";
import { MODAL_BACKDROP } from "@/components/ui/modal";
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
  validation_error: "Periksa kembali nama dan alamat email.",
  staff_conflict: "Email ini sudah terdaftar sebagai staf.",
  invite_failed:
    "Undangan belum terkirim. Pastikan email benar, lalu coba lagi beberapa saat lagi (pengiriman email dibatasi per jam).",
  provision_failed: "Akun dibuat tetapi peran Editor gagal diberikan. Silakan coba lagi.",
  not_found: "Staf tidak ditemukan atau bukan Editor aktif.",
  deactivation_failed: "Gagal menonaktifkan staf. Silakan coba lagi.",
  unauthenticated: "Sesi Anda berakhir. Silakan masuk kembali.",
  forbidden: "Hanya Admin yang dapat mengelola staf.",
};

const staffError = (code: unknown, fallback: string) =>
  (typeof code === "string" && STAFF_ERRORS[code]) || fallback;

export const StaffManager: React.FC<StaffManagerProps> = ({ initialStaff, currentUserId, onNotification }) => {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [target, setTarget] = useState<StaffMember | null>(null);
  const [reason, setReason] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);

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

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setIsDeactivating(true);
    try {
      const res = await fetch("/api/staff/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: target.id, reason: reason.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(staffError(json.error, "Gagal menonaktifkan staf."));
      }
      setStaff((prev) => prev.map((s) => (s.id === target.id ? { ...s, is_active: false } : s)));
      onNotification("success", `${target.display_name} dinonaktifkan dan tidak dapat masuk lagi.`);
      setTarget(null);
      setReason("");
    } catch (err) {
      onNotification("error", clientErrorMessage(err, "Gagal menonaktifkan staf."));
    } finally {
      setIsDeactivating(false);
    }
  };

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
          const canDeactivate = member.role === "editor" && member.is_active && member.id !== currentUserId;
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
              {canDeactivate && (
                <button
                  type="button"
                  onClick={() => setTarget(member)}
                  aria-label={`Nonaktifkan ${member.display_name}`}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50"
                >
                  <UserMinus className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {target && (
        <div className={MODAL_BACKDROP} role="dialog" aria-modal="true" aria-labelledby="deactivate-title">
          <form
            onSubmit={handleDeactivate}
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setTarget(null)}
              disabled={isDeactivating}
              aria-label="Tutup"
              className="absolute right-3 top-3 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <h3 id="deactivate-title" className="pr-10 text-lg font-bold text-navy">
              Nonaktifkan {target.display_name}?
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Editor ini tidak dapat masuk lagi. Konten yang sudah dibuat tetap tersimpan, dan tindakan ini tercatat di Log Audit.
            </p>
            <label className="mt-4 block text-xs font-semibold text-slate-700">
              Alasan
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                maxLength={240}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </label>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setTarget(null)}
                disabled={isDeactivating}
                className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isDeactivating}
                className="min-h-11 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {isDeactivating ? "Memproses…" : "Nonaktifkan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
