/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { MediaAlbum, MediaAsset, MediaCategory, SubjectAgeGroup, ConsentStatus } from "@/types/media";

export interface MediaUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAsset: MediaAsset) => void;
  albums?: MediaAlbum[];
}

export const MediaUploadDialog: React.FC<MediaUploadDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  albums = [],
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<MediaCategory>("umum");
  const [subjectAgeGroup, setSubjectAgeGroup] = useState<SubjectAgeGroup>("general");
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>("pending");
  const [albumId, setAlbumId] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("Format file harus berupa JPEG, PNG, atau WebP.");
      return;
    }

    if (selected.size > 15 * 1024 * 1024) {
      setError("Ukuran file melebihi batas maksimal 15 MB.");
      return;
    }

    setError(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Silakan pilih file foto terlebih dahulu.");
      return;
    }

    if (altText.trim().length < 3) {
      setError("Teks alternatif (alt_text) wajib diisi minimal 3 karakter untuk aksesibilitas.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("alt_text", altText.trim());
      if (caption.trim()) formData.append("caption", caption.trim());
      formData.append("category", category);
      formData.append("subject_age_group", subjectAgeGroup);
      formData.append("consent_status", consentStatus);
      if (albumId) formData.append("album_id", albumId);

      const res = await fetch("/api/staff/media/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || "Gagal mengunggah foto.");
      }

      // Reset form
      setFile(null);
      setPreviewUrl(null);
      setAltText("");
      setCaption("");
      setCategory("umum");
      setSubjectAgeGroup("general");
      setConsentStatus("pending");
      setAlbumId("");

      onSuccess(json.asset);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="card-surface relative w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sabbath-50 text-sabbath-700 border border-sabbath-200/60">
              <UploadCloud className="h-5 w-5" />
            </span>
            <div>
              <h2 id="upload-dialog-title" className="text-base font-bold text-navy">
                Unggah Foto Dokumentasi
              </h2>
              <p className="text-xs text-slate-500">
                Pipeline derivatif JPEG & pembersihan EXIF otomatis
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200/80 p-3.5 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* File input / dropzone */}
          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5">
              Berkas Foto (JPEG, PNG, WebP — Maks 15 MB) <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={previewUrl}
                  alt="Pratinjau berkas"
                  className="h-full w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-navy-950/70 text-white hover:bg-navy-950 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-sabbath-500 hover:bg-sabbath-50/20 transition-all text-slate-500 hover:text-navy"
              >
                <UploadCloud className="h-8 w-8 mb-2 text-slate-400" />
                <span className="text-xs font-semibold">Klik untuk memilih foto</span>
                <span className="text-[0.6875rem] text-slate-400 mt-0.5">
                  Foto asli tidak disimpan di storage pilot; otomatis diubah ke derivatif web 1920px.
                </span>
              </button>
            )}
          </div>

          {/* Alt Text (Required) */}
          <div>
            <label htmlFor="alt-text-input" className="block text-xs font-semibold text-navy mb-1.5">
              Teks Alternatif (Alt Text) <span className="text-red-500">*</span>
            </label>
            <input
              id="alt-text-input"
              type="text"
              required
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Contoh: Suasana ibadah khotbah Sabat pagi di mimbar GMAHK Rinegetan"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-sabbath-500 focus:outline-none focus:ring-1 focus:ring-sabbath-500"
            />
            <p className="text-[0.6875rem] text-slate-500 mt-1">
              Wajib minimal 3 karakter untuk aksesibilitas pembaca layar dan SEO.
            </p>
          </div>

          {/* Caption (Optional) */}
          <div>
            <label htmlFor="caption-input" className="block text-xs font-semibold text-navy mb-1.5">
              Takarir / Keterangan (Opsional)
            </label>
            <textarea
              id="caption-input"
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Keterangan tambahan untuk ditampilkan di galeri..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-sabbath-500 focus:outline-none focus:ring-1 focus:ring-sabbath-500 resize-none"
            />
          </div>

          {/* Category & Album Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="category-select" className="block text-xs font-semibold text-navy mb-1.5">
                Kategori Media
              </label>
              <select
                id="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as MediaCategory)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sabbath-500 focus:outline-none focus:ring-1 focus:ring-sabbath-500 bg-white"
              >
                <option value="umum">Umum</option>
                <option value="ibadah">Ibadah</option>
                <option value="pemuda">Pemuda</option>
                <option value="sekolah_sabat">Sekolah Sabat</option>
                <option value="sosial">Sosial</option>
                <option value="fellowship">Fellowship</option>
              </select>
            </div>

            <div>
              <label htmlFor="album-select" className="block text-xs font-semibold text-navy mb-1.5">
                Pilih Album (Opsional)
              </label>
              <select
                id="album-select"
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sabbath-500 focus:outline-none focus:ring-1 focus:ring-sabbath-500 bg-white"
              >
                <option value="">-- Tanpa Album --</option>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject Age Group & Consent Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 border-t border-slate-100">
            <div>
              <label htmlFor="age-group-select" className="block text-xs font-semibold text-navy mb-1.5">
                Kelompok Usia Subjek Foto
              </label>
              <select
                id="age-group-select"
                value={subjectAgeGroup}
                onChange={(e) => setSubjectAgeGroup(e.target.value as SubjectAgeGroup)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sabbath-500 focus:outline-none focus:ring-1 focus:ring-sabbath-500 bg-white"
              >
                <option value="general">Umum / Dewasa</option>
                <option value="child">Anak-anak (Child)</option>
              </select>
            </div>

            <div>
              <label htmlFor="consent-status-select" className="block text-xs font-semibold text-navy mb-1.5">
                Status Consent / Izin
              </label>
              <select
                id="consent-status-select"
                value={consentStatus}
                onChange={(e) => setConsentStatus(e.target.value as ConsentStatus)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sabbath-500 focus:outline-none focus:ring-1 focus:ring-sabbath-500 bg-white"
              >
                <option value="pending">Pending (Menunggu)</option>
                <option value="approved">Approved (Disetujui)</option>
                <option value="rejected">Rejected (Ditolak)</option>
                <option value="revoked">Revoked (Dicabut)</option>
              </select>
            </div>
          </div>

          {/* Child Protection Notice */}
          {subjectAgeGroup === "child" && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Perlindungan Privasi Anak (*Child Protection*):</p>
                <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-amber-700">
                  Foto dengan subjek anak tidak dapat dipublikasikan ke publik sebelum consent berstatus <strong>Approved</strong>. Aset akan disimpan sebagai Draft.
                </p>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || !file}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-navy hover:bg-navy-800 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Unggah Media</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
