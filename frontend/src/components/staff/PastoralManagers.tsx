"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clientErrorMessage } from "@/lib/api/errors";
import { formatAuditTimestamp, type AuditEntry } from "@/lib/staff/audit";
import type { PastoralCounts, PrayerRequest, PrayerRequestStatus, VisitStatus, VisitSubmission } from "@/types/forms";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

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

const RETENTION_LABELS: [keyof PastoralCounts, string][] = [["study_interest_leads", "Minat belajar"], ["prayer_requests", "Doa"], ["visitor_submissions", "Kunjungan"]];

// Weekly purge of rows past the cut-off (24 months minus 120 days) plus the count-only access audit.
export function PastoralRetentionPanel({ counts, error, accessLogs = [] }: { counts?: PastoralCounts | null; error?: string | null; accessLogs?: AuditEntry[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState("");
  const total = counts ? RETENTION_LABELS.reduce((sum, [key]) => sum + Number(counts[key] || 0), 0) : 0;

  async function purge() {
    setDeleting(true); setDone("");
    try {
      const response = await fetch("/api/staff/pastoral-retention", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = await response.json() as { error?: string; data?: PastoralCounts };
      if (!response.ok) throw new Error(json.error || "Data kedaluwarsa belum dapat dihapus.");
      const deleted = json.data ? RETENTION_LABELS.reduce((sum, [key]) => sum + Number(json.data?.[key] || 0), 0) : 0;
      setDone(`${deleted} data kedaluwarsa dihapus.`);
      router.refresh();
    } finally { setDeleting(false); }
  }

  return <section aria-labelledby="retention-heading" className="mb-6 min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 [overflow-wrap:anywhere]">
    <h2 id="retention-heading" className="text-lg font-bold text-navy">Retensi data pastoral</h2>
    <p className="text-sm text-slate-600">Data minat belajar, doa, dan kunjungan dihapus sebelum genap 24 bulan (batas 24 bulan dikurangi 120 hari) dan tidak dapat diperpanjang. Jalankan setiap minggu.</p>
    {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
      {RETENTION_LABELS.map(([key, label]) => <li key={key} className="rounded-lg border border-slate-200 p-3"><span className="font-semibold text-navy">{label}</span>: {Number(counts?.[key] || 0)} kedaluwarsa</li>)}
    </ul>}
    {done && <p role="status" className="text-sm font-semibold text-emerald-700">{done}</p>}
    <button type="button" disabled={!!error || total === 0 || deleting} onClick={() => setOpen(true)}
      className="min-h-11 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50">Hapus data kedaluwarsa</button>
    <DeleteConfirmationDialog isOpen={open} onClose={() => setOpen(false)} onConfirm={purge} isDeleting={deleting}
      itemTitle={`${total} data pastoral yang melewati batas retensi`} entityName="data pastoral" />
    <h3 className="pt-2 text-xs font-bold uppercase tracking-wider text-slate-500">Akses data pastoral (20 terbaru)</h3>
    {accessLogs.length === 0 ? <p className="text-sm text-slate-600">Belum ada akses tercatat.</p> : <ul className="divide-y divide-slate-100 text-xs text-slate-700">
      {accessLogs.map((log) => <li key={log.id} className="py-2">
        <span className="font-semibold text-navy">{formatAuditTimestamp(log.occurred_at)}</span>
        {" · "}<span className="font-mono">{log.actor_id ? log.actor_id.slice(0, 8) + "..." : "Sistem"}</span>
        {" · "}{RETENTION_LABELS.map(([key, label]) => `${label} ${Number(log.changes?.[key] ?? 0)}`).join(", ")}
      </li>)}
    </ul>}
  </section>;
}
