"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientErrorMessage } from "@/lib/api/errors";
import type { StudyInterestLead, StudyInterestStatus } from "@/types/forms";

const STATUS_LABELS: Record<StudyInterestStatus, string> = { new: "Baru", contacted: "Sudah dihubungi", closed: "Selesai" };
const dateFormat = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const DAY_MS = 24 * 60 * 60 * 1000;

// Lead age helps Admins spot entries nearing the 24-month retention promise.
function age(createdAt: string, now: number) {
  const days = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / DAY_MS));
  return days === 0 ? "hari ini" : `${days} hari`;
}

export function StudyInterestManager({ leads, error }: { leads: StudyInterestLead[]; error?: string | null }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [now] = useState(() => Date.now());

  async function changeStatus(id: string, status: StudyInterestStatus) {
    setBusyId(id); setActionError("");
    try {
      const response = await fetch(`/api/staff/study-interest/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const json = await response.json() as { error?: string };
      if (!response.ok) throw new Error(json.error || "Status belum dapat diubah.");
      router.refresh();
    } catch (err) {
      setActionError(clientErrorMessage(err, "Status belum dapat diubah."));
    } finally { setBusyId(null); }
  }

  return <section aria-labelledby="study-interest-heading" className="min-w-0 [overflow-wrap:anywhere]">
    <h2 id="study-interest-heading" className="text-lg font-bold text-navy">Minat belajar</h2>
    <p className="mt-1 text-sm text-slate-600">Hanya Admin yang dapat melihat data ini. Hubungi peminat lalu perbarui statusnya.</p>
    {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {actionError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{actionError}</p>}
    {!error && leads.length === 0 ? <p className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Belum ada minat belajar.</p> : <ul className="mt-6 grid gap-4">
      {leads.map((lead) => <li key={lead.id} className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-navy">{lead.name}</p>
            <p className="mt-1 text-sm text-slate-700">{lead.contact}</p>
            <p className="mt-1 text-xs text-slate-500">Masuk {dateFormat.format(new Date(lead.created_at))} WITA · {age(lead.created_at, now)}</p>
          </div>
          <div>
            <label htmlFor={`lead-status-${lead.id}`} className="text-xs font-semibold text-slate-600">Status</label>
            <select id={`lead-status-${lead.id}`} value={lead.status} disabled={busyId === lead.id}
              onChange={(e) => changeStatus(lead.id, e.target.value as StudyInterestStatus)}
              className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-navy sm:w-48">
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
        {lead.message && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{lead.message}</p>}
      </li>)}
    </ul>}
  </section>;
}
