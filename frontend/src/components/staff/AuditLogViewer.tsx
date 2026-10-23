"use client";

import React from "react";
import { History } from "lucide-react";
import { formatAuditTimestamp, type AuditEntry } from "@/lib/staff/audit";

export type { AuditEntry } from "@/lib/staff/audit";

interface AuditLogViewerProps {
  logs: AuditEntry[];
  error?: string | null;
  className?: string;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs, error, className }) => {
  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-navy">
        {error}
      </div>
    );
  }
  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center sm:p-12">
        <History className="h-8 w-8 text-slate-300" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-navy">Belum ada riwayat audit</p>
        <p className="mt-1 text-xs text-slate-500">
          Setiap aktivitas mutasi konten akan dicatat secara otomatis di sini.
        </p>
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    if (action.includes("created")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (action.includes("deleted")) return "bg-red-50 text-red-700 border-red-200";
    if (action.includes("status_changed")) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-navy border-slate-200";
  };
  const actionBadge = (action: string) => (
    <span className={`inline-block max-w-full break-words rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold ${getActionBadge(action)}`}>
      {action}
    </span>
  );
  const details = (log: AuditEntry) => (
    <pre className="whitespace-pre-wrap break-words rounded bg-slate-50 p-2 font-mono text-[0.6875rem] text-slate-700 [overflow-wrap:anywhere]">
      {JSON.stringify(log.changes || {}, null, 1)}
    </pre>
  );
  const actor = (log: AuditEntry) => log.actor_id ? log.actor_id.slice(0, 8) + "..." : "Sistem";

  return (
    <div className={`min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className || ""}`}>
      <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3.5 sm:px-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Linimasa Mutasi Konten (Audit Trail)
        </h3>
      </div>
      <div className="divide-y divide-slate-100 md:hidden">
        {logs.map((log) => (
          <article key={log.id} className="min-w-0 space-y-3 p-4 text-xs">
            <p className="font-semibold text-navy">{formatAuditTimestamp(log.occurred_at)}</p>
            {actionBadge(log.action)}
            <dl className="space-y-2 text-slate-600">
              <div><dt className="font-semibold">Entitas</dt><dd className="break-words">{log.entity_type}</dd></div>
              <div><dt className="font-semibold">Aktor (ID)</dt><dd className="font-mono">{actor(log)}</dd></div>
              <div className="min-w-0"><dt className="mb-1 font-semibold">Rincian Perubahan</dt><dd>{details(log)}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-[0.6875rem] font-bold uppercase text-slate-400">
            <tr>
              <th className="px-6 py-3">Waktu (WITA)</th>
              <th className="px-6 py-3">Aksi</th>
              <th className="px-6 py-3">Entitas</th>
              <th className="px-6 py-3">Aktor (ID)</th>
              <th className="px-6 py-3">Rincian Perubahan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/60">
                <td className="px-6 py-3.5 font-semibold text-navy">{formatAuditTimestamp(log.occurred_at)}</td>
                <td className="px-6 py-3.5">{actionBadge(log.action)}</td>
                <td className="px-6 py-3.5 font-medium text-slate-700">{log.entity_type}</td>
                <td className="px-6 py-3.5 font-mono text-[0.6875rem] text-slate-500">{actor(log)}</td>
                <td className="max-w-xs px-6 py-3.5 text-slate-600">{details(log)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
