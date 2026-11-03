"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clientErrorMessage } from "@/lib/api/errors";
import type { PrayerRequest, PrayerRequestStatus, VisitStatus, VisitSubmission } from "@/types/forms";

const dateFormat = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const visitDateFormat = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const DAY_MS = 24 * 60 * 60 * 1000;

// Age helps Admins spot entries nearing the 24-month retention promise.
function age(createdAt: string, now: number) {
  const days = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / DAY_MS));
  return days === 0 ? "hari ini" : `${days} hari`;
}

type Row = { id: string; name: string; contact: string; status: string; created_at: string };
type ManagerProps<T extends Row> = {
  title: string; headingId: string; empty: string; endpoint: string;
  statusLabels: Record<string, string>; rows: T[]; error?: string | null; details: (row: T) => ReactNode;
};

function PastoralManager<T extends Row>({ title, headingId, empty, endpoint, statusLabels, rows, error, details }: ManagerProps<T>) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [now] = useState(() => Date.now());

  async function changeStatus(id: string, status: string) {
    setBusyId(id); setActionError("");
    try {
      const response = await fetch(`${endpoint}${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error || "Status belum dapat diubah.");
      router.refresh();
    } catch (err) {
      setActionError(clientErrorMessage(err, "Status belum dapat diubah."));
    } finally { setBusyId(null); }
  }

  return <section aria-labelledby={headingId} className="min-w-0 [overflow-wrap:anywhere]">
    <h2 id={headingId} className="text-lg font-bold text-navy">{title}</h2>
    <p className="mt-1 text-sm text-slate-600">Hanya Admin yang dapat melihat data ini. Jangan menyalin isinya ke dokumen atau chat lain.</p>
    {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {actionError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{actionError}</p>}
    {!error && rows.length === 0 ? <p className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">{empty}</p> : <ul className="mt-6 grid gap-4">
      {rows.map((row) => <li key={row.id} className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-navy">{row.name || "Tanpa nama"}</p>
            <p className="mt-1 text-sm text-slate-700">{row.contact || "Tanpa kontak"}</p>
            <p className="mt-1 text-xs text-slate-500">Masuk {dateFormat.format(new Date(row.created_at))} WITA · {age(row.created_at, now)}</p>
          </div>
          <div>
            <label htmlFor={`${headingId}-status-${row.id}`} className="text-xs font-semibold text-slate-600">Status</label>
            <select id={`${headingId}-status-${row.id}`} value={row.status} disabled={busyId === row.id} onChange={(e) => changeStatus(row.id, e.target.value)}
              className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-navy sm:w-48">
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
        {details(row)}
      </li>)}
    </ul>}
  </section>;
}

const PRAYER_LABELS: Record<PrayerRequestStatus, string> = { new: "Baru", prayed: "Sudah didoakan", closed: "Selesai" };
const VISIT_LABELS: Record<VisitStatus, string> = { new: "Baru", contacted: "Sudah dihubungi", closed: "Selesai" };

export function PrayerRequestManager({ rows, error }: { rows: PrayerRequest[]; error?: string | null }) {
  return <PastoralManager title="Permohonan doa" headingId="prayer-heading" empty="Belum ada permohonan doa." endpoint="/api/staff/prayer-requests/"
    statusLabels={PRAYER_LABELS} rows={rows} error={error} details={(row) => <>
      {row.wants_contact && <p className="mt-3 text-xs font-semibold text-sabbath-700">Ingin dihubungi</p>}
      <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{row.request}</p>
    </>} />;
}

export function VisitManager({ rows, error }: { rows: VisitSubmission[]; error?: string | null }) {
  return <PastoralManager title="Kunjungan" headingId="visit-heading" empty="Belum ada data kunjungan." endpoint="/api/staff/visits/"
    statusLabels={VISIT_LABELS} rows={rows} error={error} details={(row) => <>
      <p className="mt-3 text-sm text-slate-700">
        {row.visit_date ? `Rencana ${visitDateFormat.format(new Date(`${row.visit_date}T00:00:00Z`))}` : "Tanggal belum ditentukan"}
        {row.party_size ? ` · ${row.party_size} orang` : ""}
      </p>
      {row.message && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{row.message}</p>}
    </>} />;
}
