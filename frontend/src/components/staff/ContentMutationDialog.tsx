"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { clientErrorMessage } from "@/lib/api/errors";
import { Modal, MODAL_BACKDROP } from "@/components/ui/modal";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { DateTimeInput, toDateTimeLocalValue } from "@/components/ui/DateTimeInput";
import type { MediaAsset } from "@/types/media";

interface ContentMutationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  entityType: "announcements" | "events" | "schedules" | "departments";
  initialData?: Record<string, unknown> | null;
  mediaAssets?: MediaAsset[];
  isSaving: boolean;
}

function getInitialFormData(
  initialData?: Record<string, unknown> | null,
  entityType?: "announcements" | "events" | "schedules" | "departments"
): Record<string, unknown> {
  if (initialData) {
    if (entityType === "events") {
      return {
        ...initialData,
        venue: (initialData.venue as string) || "Gereja GMAHK Rinegetan",
        cover_asset_id: (initialData.cover_asset_id as string) || "",
        starts_at: toDateTimeLocalValue(initialData.starts_at as string),
        ends_at: toDateTimeLocalValue(initialData.ends_at as string),
      };
    }
    if (entityType === "schedules") {
      return {
        ...initialData,
        location: (initialData.location as string) || "Gereja GMAHK Rinegetan",
      };
    }
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
      cover_asset_id: "",
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
  mediaAssets = [],
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
      // DB checks reject leading/trailing whitespace (btrim), so trim before saving.
      const trimmed = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
      );
      if (trimmed.cover_asset_id === "") {
        trimmed.cover_asset_id = null;
      }
      if (trimmed.department_id === "") {
        trimmed.department_id = null;
      }
      await onSave(trimmed);
      onClose();
    } catch (err) {
      setError(clientErrorMessage(err, "Gagal menyimpan konten"));
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
    <Modal isOpen={isOpen} onClose={onClose} className={MODAL_BACKDROP}>
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-2xl bg-white p-5 sm:p-6 pb-8 shadow-2xl">
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

          {/* Schedule specific: day_of_week, times, and location */}
          {entityType === "schedules" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SelectDropdown
                  label="Hari"
                  name="day_of_week"
                  value={Number(formData.day_of_week ?? 6)}
                  onChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      day_of_week: Number(val),
                    }))
                  }
                  options={[
                    { value: 6, label: "Sabat (Sabtu)" },
                    { value: 5, label: "Jumat" },
                    { value: 3, label: "Rabu" },
                    { value: 0, label: "Minggu" },
                    { value: 1, label: "Senin" },
                    { value: 2, label: "Selasa" },
                    { value: 4, label: "Kamis" },
                  ]}
                />
                <DateTimeInput
                  type="time"
                  name="start_time"
                  label="Mulai"
                  badge="WITA"
                  value={String(formData.start_time || "08:45")}
                  onChange={handleChange}
                  required
                />
                <DateTimeInput
                  type="time"
                  name="end_time"
                  label="Selesai"
                  badge="WITA"
                  value={String(formData.end_time || "")}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Lokasi
                </label>
                <input
                  type="text"
                  name="location"
                  value={String(formData.location || "")}
                  onChange={handleChange}
                  placeholder="Contoh: Gereja GMAHK Rinegetan"
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>
            </>
          )}

          {/* Event specific: dates, venue, and optional cover */}
          {entityType === "events" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <DateTimeInput
                  type="datetime-local"
                  name="starts_at"
                  label="Waktu Mulai"
                  badge="WITA"
                  value={String(formData.starts_at || "")}
                  onChange={handleChange}
                  required
                />
                <DateTimeInput
                  type="datetime-local"
                  name="ends_at"
                  label="Waktu Selesai"
                  badge="WITA"
                  value={String(formData.ends_at || "")}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Lokasi / Tempat Kegiatan
                </label>
                <input
                  type="text"
                  name="venue"
                  value={String(formData.venue || "")}
                  onChange={handleChange}
                  placeholder="Contoh: Gereja GMAHK Rinegetan / Rumah Keluarga Lengkong"
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>

              {mediaAssets && mediaAssets.length > 0 && (
                <SelectDropdown
                  label="Foto Sampul (Opsional)"
                  name="cover_asset_id"
                  value={String(formData.cover_asset_id || "")}
                  onChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      cover_asset_id: val ? String(val) : "",
                    }))
                  }
                  options={[
                    {
                      value: "",
                      label: "Tanpa Foto Sampul (Hanya Teks & Badge)",
                      description: "Kartu kegiatan akan tampil rapi tanpa gambar latar",
                    },
                    ...mediaAssets.map((asset) => ({
                      value: asset.id,
                      label: asset.alt_text || asset.caption || asset.storage_path.split("/").pop() || "Foto",
                      description: asset.caption || `Kategori: ${asset.category}`,
                    })),
                  ]}
                />
              )}
            </>
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
              required={entityType === "announcements" || entityType === "events"}
              maxLength={entityType === "departments" ? undefined : 500}
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
                required={entityType === "announcements"}
                rows={4}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>
          )}

          {/* Status Selection */}
          <SelectDropdown
            label="Status Awal"
            name="status"
            value={String(formData.status || "draft")}
            onChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
            options={[
              { value: "draft", label: "Draft (Hanya Staf)", description: "Belum tampak oleh jemaat/publik" },
              { value: "published", label: "Terbit (Publik)", description: "Dapat dilihat oleh semua pengunjung" },
              { value: "archived", label: "Arsip", description: "Disembunyikan dari rute publik aktif" },
            ]}
          />

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
    </Modal>
  );
};
