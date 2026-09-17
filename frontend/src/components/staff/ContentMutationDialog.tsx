"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface ContentMutationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  entityType: "announcements" | "events" | "schedules" | "departments";
  initialData?: Record<string, unknown> | null;
  isSaving: boolean;
}

function getInitialFormData(
  initialData?: Record<string, unknown> | null,
  entityType?: "announcements" | "events" | "schedules" | "departments"
): Record<string, unknown> {
  if (initialData) {
    return initialData;
  }
  if (entityType === "announcements") {
    return {
      title: "",
      slug: "",
      summary: "",
      body: "",
      status: "draft",
    };
  }
  if (entityType === "events") {
    return {
      title: "",
      slug: "",
      summary: "",
      body: "",
      starts_at: "",
      ends_at: "",
      venue: "Gereja GMAHK Rinegetan",
      category: "Ibadah",
      status: "draft",
    };
  }
  if (entityType === "schedules") {
    return {
      name: "",
      slug: "",
      day_of_week: 6,
      start_time: "08:45:00",
      end_time: "10:00:00",
      location: "Gereja GMAHK Rinegetan",
      category: "Ibadah",
      status: "draft",
    };
  }
  return {
    name: "",
    slug: "",
    description: "",
    status: "draft",
  };
}

export const ContentMutationDialog: React.FC<ContentMutationDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  entityType,
  initialData,
  isSaving,
}) => {
  const [formData, setFormData] = useState<Record<string, unknown>>(() =>
    getInitialFormData(initialData, entityType)
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSlugify = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan konten");
    }
  };

  const entityLabels: Record<string, string> = {
    announcements: "Pengumuman",
    events: "Kegiatan",
    schedules: "Jadwal Rutin",
    departments: "Departemen",
  };

  const isEditing = Boolean(initialData?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-navy"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <h3 className="text-lg font-bold text-navy">
          {isEditing ? "Edit" : "Tambah"} {entityLabels[entityType]}
        </h3>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title or Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              {entityType === "departments" || entityType === "schedules"
                ? "Nama"
                : "Judul"}
            </label>
            <input
              type="text"
              name={entityType === "departments" || entityType === "schedules" ? "name" : "title"}
              value={String(formData.name || formData.title || "")}
              onChange={(e) => {
                handleChange(e);
                if (!isEditing && !formData.slug) {
                  setFormData((prev) => ({
                    ...prev,
                    slug: handleSlugify(e.target.value),
                  }));
                }
              }}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Slug (URL-friendly)
            </label>
            <input
              type="text"
              name="slug"
              value={String(formData.slug || "")}
              onChange={handleChange}
              required
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              title="Gunakan huruf kecil, angka, dan tanda hubung (-)"
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

          {/* Schedule specific: day_of_week and times */}
          {entityType === "schedules" && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Hari</label>
                <select
                  name="day_of_week"
                  value={Number(formData.day_of_week ?? 6)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      day_of_week: Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                >
                  <option value={6}>Sabat (Sabtu)</option>
                  <option value={5}>Jumat</option>
                  <option value={3}>Rabu</option>
                  <option value={0}>Minggu</option>
                  <option value={1}>Senin</option>
                  <option value={2}>Selasa</option>
                  <option value={4}>Kamis</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Mulai (WITA)</label>
                <input
                  type="time"
                  name="start_time"
                  value={String(formData.start_time || "08:45")}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Selesai (WITA)</label>
                <input
                  type="time"
                  name="end_time"
                  value={String(formData.end_time || "")}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>
            </div>
          )}

          {/* Event specific: dates */}
          {entityType === "events" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Waktu Mulai (WITA)</label>
                <input
                  type="datetime-local"
                  name="starts_at"
                  value={String(formData.starts_at || "")}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Waktu Selesai (WITA)</label>
                <input
                  type="datetime-local"
                  name="ends_at"
                  value={String(formData.ends_at || "")}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>
            </div>
          )}

          {/* Summary / Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              {entityType === "departments" ? "Deskripsi" : "Ringkasan Singkat"}
            </label>
            <textarea
              name={entityType === "departments" ? "description" : "summary"}
              value={String(formData.description || formData.summary || "")}
              onChange={handleChange}
              rows={2}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

          {/* Body for announcements / events */}
          {(entityType === "announcements" || entityType === "events") && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">Isi Lengkap</label>
              <textarea
                name="body"
                value={String(formData.body || "")}
                onChange={handleChange}
                rows={4}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
          )}

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">Status Awal</label>
            <select
              name="status"
              value={String(formData.status || "draft")}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            >
              <option value="draft">Draft (Hanya Staf)</option>
              <option value="published">Terbit (Publik)</option>
              <option value="archived">Arsip</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-navy/90 disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Simpan Konten"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
