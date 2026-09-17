"use client";

import React from "react";
import { History } from "lucide-react";
import { formatWitaDate } from "@/lib/schedule-wita";

export interface AuditEntry {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes?: Record<string, unknown> | null;
  created_at: string;
}

interface AuditLogViewerProps {
  logs: AuditEntry[];
  className?: string;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs, className }) => {
  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
        <History className="h-8 w-8 text-slate-300" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-navy">Belum ada riwayat audit</p>
        <p className="mt-1 text-xs text-slate-500">
          Setiap aktivitas mutasi konten akan dicatat secara otomatis di sini.
        </p>
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    if (action.includes("created")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (action.includes("deleted")) {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (action.includes("status_changed")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className || ""}`}>
      <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Linimasa Mutasi Konten (Audit Trail)
        </h3>
      </div>
      <div className="divide-y divide-slate-100 overflow-x-auto">
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
            {logs.map((log) => {
              const dateStr = log.created_at ? log.created_at.slice(0, 10) : "";
              const timeStr = log.created_at ? log.created_at.slice(11, 16) : "";
              return (
                <tr key={log.id} className="hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-6 py-3.5 text-slate-600">
                    <span className="font-semibold text-navy">{formatWitaDate(dateStr)}</span>{" "}
                    <span className="text-slate-400">{timeStr} WITA</span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold ${getActionBadge(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 font-medium text-slate-700">
                    {log.entity_type}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 font-mono text-[0.6875rem] text-slate-500">
                    {log.actor_id ? log.actor_id.slice(0, 8) + "..." : "Sistem"}
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">
                    <pre className="max-w-xs overflow-x-auto rounded bg-slate-50 p-1 font-mono text-[0.6875rem] text-slate-700">
                      {JSON.stringify(log.changes || {}, null, 1)}
                    </pre>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
