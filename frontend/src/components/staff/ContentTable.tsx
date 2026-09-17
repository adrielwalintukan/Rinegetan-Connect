"use client";

import React from "react";
import { Edit, Trash2, CheckCircle2, Archive, RefreshCw } from "lucide-react";
import { ContentStatusBadge } from "./ContentStatusBadge";
import type { ContentStatus } from "@/types/content";

export interface ContentItem {
  id: string;
  title?: string;
  name?: string;
  slug: string;
  status: ContentStatus;
  category?: string;
  summary?: string;
  description?: string;
  start_time?: string;
  end_time?: string | null;
  day_of_week?: number;
  starts_at?: string;
  ends_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface ContentTableProps {
  items: ContentItem[];
  role: "admin" | "editor";
  entityType: "announcements" | "events" | "schedules" | "departments";
  onStatusChange: (id: string, newStatus: ContentStatus) => void;
  onEdit: (item: ContentItem) => void;
  onDeletePrompt: (item: ContentItem) => void;
  isLoading?: boolean;
}

export const ContentTable: React.FC<ContentTableProps> = ({
  items,
  role,
  entityType,
  onStatusChange,
  onEdit,
  onDeletePrompt,
  isLoading,
}) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
        <p className="text-sm font-semibold text-navy">Belum ada konten pada tampilan ini</p>
        <p className="mt-1 text-xs text-slate-500">
          Klik tombol tambah di atas untuk membuat konten baru.
        </p>
      </div>
    );
  }

  const getDisplayName = (item: ContentItem) => item.title || item.name || "Tanpa Judul";

  const getSubMeta = (item: ContentItem) => {
    if (entityType === "schedules") {
      const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabat"];
      const dayName = item.day_of_week !== undefined ? days[item.day_of_week] : "";
      return `${dayName} · ${item.start_time?.slice(0, 5) || ""} WITA`;
    }
    if (entityType === "events" && item.starts_at) {
      return `${item.starts_at.slice(0, 10)} · ${item.category || "Ibadah"}`;
    }
    return item.category || item.slug;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-6 py-3.5">Konten</th>
              <th className="px-6 py-3.5">Detail</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-900">{getDisplayName(item)}</p>
                  <p className="font-mono text-[0.6875rem] text-slate-400">/{item.slug}</p>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  <span>{getSubMeta(item)}</span>
                </td>
                <td className="px-6 py-4">
                  <ContentStatusBadge status={item.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Status lifecycle actions */}
                    {item.status === "draft" && (
                      <button
                        type="button"
                        onClick={() => onStatusChange(item.id, "published")}
                        disabled={isLoading}
                        title="Terbitkan ke Publik"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Terbitkan</span>
                      </button>
                    )}

                    {item.status === "published" && (
                      <button
                        type="button"
                        onClick={() => onStatusChange(item.id, "archived")}
                        disabled={isLoading}
                        title="Arsipkan Konten"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Arsipkan</span>
                      </button>
                    )}

                    {item.status === "archived" && (
                      <button
                        type="button"
                        onClick={() => onStatusChange(item.id, "draft")}
                        disabled={isLoading}
                        title="Kembalikan ke Draft"
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Jadikan Draft</span>
                      </button>
                    )}

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      disabled={isLoading}
                      title="Edit Konten"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-navy"
                    >
                      <Edit className="h-4 w-4" aria-hidden="true" />
                    </button>

                    {/* Admin only permanent delete button */}
                    {role === "admin" && (
                      <button
                        type="button"
                        onClick={() => onDeletePrompt(item)}
                        disabled={isLoading}
                        title="Hapus Permanen (Khusus Admin)"
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
