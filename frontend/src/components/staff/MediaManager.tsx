/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  AlertTriangle,
  HardDrive,
  EyeOff,
  Trash2,
  Lock,
} from "lucide-react";
import { MediaUploadDialog } from "./MediaUploadDialog";
import { getMediaPublicUrl } from "@/lib/media/url";
import {
  STORAGE_CAPACITY_BYTES,
  STORAGE_WARNING_THRESHOLD,
  STORAGE_FREEZE_THRESHOLD,
} from "@/lib/media/constants";
import type { MediaAlbum, MediaAsset } from "@/types/media";
import type { ContentStatus } from "@/types/content";

export interface MediaManagerProps {
  initialAssets: MediaAsset[];
  initialAlbums: MediaAlbum[];
  role: "admin" | "editor";
  userEmail: string;
  onNotification: (type: "success" | "error", message: string) => void;
}

export const MediaManager: React.FC<MediaManagerProps> = ({
  initialAssets,
  initialAlbums,
  role,
  onNotification,
}) => {
  const [assets, setAssets] = useState<MediaAsset[]>(initialAssets);
  const [albums] = useState<MediaAlbum[]>(initialAlbums);

  const [searchQuery, setSearchQuery] = useState("");
  const [consentFilter, setConsentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [takedownAsset, setTakedownAsset] = useState<MediaAsset | null>(null);
  const [hiddenReason, setHiddenReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Storage Quota Metrics
  const totalUsedBytes = useMemo(() => {
    return assets.reduce((sum, item) => sum + (Number(item.bytes) || 0), 0);
  }, [assets]);

  const quotaPercent = Math.min(
    100,
    Math.round((totalUsedBytes / STORAGE_CAPACITY_BYTES) * 10000) / 100
  );
  const isWarning = quotaPercent >= STORAGE_WARNING_THRESHOLD * 100;
  const isFrozen = quotaPercent >= STORAGE_FREEZE_THRESHOLD * 100;

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAlt = asset.alt_text.toLowerCase().includes(q);
        const matchesCaption = (asset.caption || "").toLowerCase().includes(q);
        if (!matchesAlt && !matchesCaption) return false;
      }

      if (consentFilter !== "all" && asset.consent_status !== consentFilter) {
        return false;
      }

      if (statusFilter !== "all" && asset.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [assets, searchQuery, consentFilter, statusFilter]);

  // Handle status update (draft/published/archived)
  const handleStatusChange = async (asset: MediaAsset, newStatus: ContentStatus) => {
    // Child Consent Invariant check
    if (
      newStatus === "published" &&
      asset.subject_age_group === "child" &&
      asset.consent_status !== "approved"
    ) {
      onNotification(
        "error",
        "Foto anak wajib memiliki izin (consent approved) sebelum dapat dipublikasikan."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/staff/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "media_assets",
          id: asset.id,
          status: newStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal memperbarui status media");
      }

      setAssets((prev) =>
        prev.map((item) => (item.id === asset.id ? { ...item, status: newStatus } : item))
      );
      onNotification("success", `Status media diubah menjadi ${newStatus}`);
    } catch (err) {
      onNotification("error", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant takedown (hide) flow
  const handleTakedownSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!takedownAsset) return;

    if (hiddenReason.trim().length < 3) {
      onNotification("error", "Alasan penarikan wajib diisi minimal 3 karakter.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/staff/content/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "media_assets",
          id: takedownAsset.id,
          payload: {
            hidden_at: new Date().toISOString(),
            hidden_reason: hiddenReason.trim(),
            status: "draft", // automatically unpublish upon takedown
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyembunyikan media");
      }

      setAssets((prev) =>
        prev.map((item) =>
          item.id === takedownAsset.id
            ? {
                ...item,
                hidden_at: new Date().toISOString(),
                hidden_reason: hiddenReason.trim(),
                status: "draft",
              }
            : item
        )
      );

      onNotification("success", "Foto berhasil ditarik dari tampilan publik");
      setTakedownAsset(null);
      setHiddenReason("");
    } catch (err) {
      onNotification("error", err instanceof Error ? err.message : "Gagal memproses penarikan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Permanent delete (Admin exclusive)
  const handleDelete = async (asset: MediaAsset) => {
    if (role !== "admin") {
      onNotification("error", "Hanya Admin yang dapat menghapus media secara permanen.");
      return;
    }

    const confirmed = window.confirm(
      "Apakah Anda yakin ingin menghapus aset media ini secara permanen?"
    );
    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/staff/content/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "media_assets",
          id: asset.id,
          reason: "Dihapus permanen oleh admin melalui CMS media",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menghapus aset media");
      }

      setAssets((prev) => prev.filter((item) => item.id !== asset.id));
      onNotification("success", "Aset media berhasil dihapus permanen.");
    } catch (err) {
      onNotification("error", err instanceof Error ? err.message : "Gagal menghapus aset");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pilot Quota Progress Card */}
      <div className="card-surface rounded-2xl border border-slate-200 p-5 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                isFrozen
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : isWarning
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-sabbath-50 text-sabbath-700 border border-sabbath-200/60"
              }`}
            >
              <HardDrive className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-navy">
                Kapasitas Penyimpanan Pilot (1 GB)
              </h3>
              <p className="text-xs text-slate-500">
                {(totalUsedBytes / (1024 * 1024)).toFixed(2)} MB terpakai dari{" "}
                {(STORAGE_CAPACITY_BYTES / (1024 * 1024)).toFixed(0)} MB ({quotaPercent}%)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            disabled={isFrozen}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-navy hover:bg-navy-800 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Unggah Foto Baru</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all duration-500 ${
              isFrozen
                ? "bg-red-500"
                : isWarning
                ? "bg-amber-500"
                : "bg-sabbath-500"
            }`}
            style={{ width: `${Math.min(100, quotaPercent)}%` }}
          />
        </div>

        {isFrozen && (
          <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Kapasitas penyimpanan mencapai ambang batas beku (85%). Unggah foto baru dinonaktifkan.
          </p>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari foto berdasarkan alt text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-xs focus:border-sabbath-500 focus:outline-none focus:ring-1 focus:ring-sabbath-500 bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sabbath-500 focus:outline-none focus:ring-1 focus:ring-sabbath-500 bg-white text-slate-700"
          >
            <option value="all">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>

          {/* Consent Filter */}
          <select
            value={consentFilter}
            onChange={(e) => setConsentFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sabbath-500 focus:outline-none focus:ring-1 focus:ring-sabbath-500 bg-white text-slate-700"
          >
            <option value="all">Semua Izin (Consent)</option>
            <option value="approved">Consent Approved</option>
            <option value="pending">Consent Pending</option>
            <option value="rejected">Consent Rejected</option>
            <option value="revoked">Consent Revoked</option>
          </select>
        </div>
      </div>

      {/* Media Asset List */}
      {filteredAssets.length === 0 ? (
        <div className="card-surface rounded-2xl border border-slate-200 p-12 text-center bg-white">
          <p className="text-sm font-semibold text-navy">Tidak ada aset media yang sesuai</p>
          <p className="text-xs text-slate-500 mt-1">
            Coba sesuaikan kata kunci pencarian atau bersihkan filter di atas.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAssets.map((asset) => {
            const imageUrl = getMediaPublicUrl(asset.storage_path);
            const isChild = asset.subject_age_group === "child";
            const canPublish = !isChild || asset.consent_status === "approved";

            return (
              <div
                key={asset.id}
                className="card-surface flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* Thumbnail Header */}
                <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={asset.alt_text}
                    className="h-full w-full object-cover"
                  />

                  {/* Badges overlay */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    <span
                      className={`text-[0.625rem] font-bold px-2 py-0.5 rounded-full capitalize shadow-sm ${
                        asset.status === "published"
                          ? "bg-emerald-600 text-white"
                          : asset.status === "draft"
                          ? "bg-amber-500 text-white"
                          : "bg-slate-500 text-white"
                      }`}
                    >
                      {asset.status}
                    </span>

                    {asset.hidden_at && (
                      <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white shadow-sm flex items-center gap-1">
                        <EyeOff className="h-3 w-3" />
                        <span>Ditarik</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2 right-2">
                    <span
                      className={`text-[0.625rem] font-semibold px-2 py-0.5 rounded-full shadow-sm ${
                        isChild
                          ? "bg-purple-100 text-purple-800 border border-purple-300"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {isChild ? "Subjek: Anak" : "Subjek: Umum"}
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-xs font-semibold text-navy line-clamp-2" title={asset.alt_text}>
                    {asset.alt_text}
                  </p>
                  {asset.caption && (
                    <p className="text-[0.6875rem] text-slate-500 mt-1 line-clamp-1 italic">
                      {asset.caption}
                    </p>
                  )}

                  {/* Metadata Chips */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[0.6875rem]">
                    <span
                      className={`font-medium capitalize ${
                        asset.consent_status === "approved"
                          ? "text-emerald-600"
                          : asset.consent_status === "pending"
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      Consent: {asset.consent_status}
                    </span>

                    <span className="text-slate-400 font-mono">
                      {(Number(asset.bytes) / 1024).toFixed(0)} KB
                    </span>
                  </div>

                  {asset.hidden_reason && (
                    <p className="mt-2 text-[0.6875rem] text-red-600 bg-red-50 p-1.5 rounded-lg border border-red-100">
                      Alasan: {asset.hidden_reason}
                    </p>
                  )}

                  {/* Child Consent Warning */}
                  {isChild && asset.consent_status !== "approved" && (
                    <div className="mt-2 text-[0.6875rem] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-start gap-1.5">
                      <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                      <span>Publikasi dikunci: foto anak wajib memiliki persetujuan consent.</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      {asset.status !== "published" && (
                        <button
                          type="button"
                          disabled={!canPublish || isSubmitting}
                          onClick={() => handleStatusChange(asset, "published")}
                          title={
                            !canPublish
                              ? "Foto anak wajib consent approved sebelum dipublikasikan"
                              : "Publikasikan ke galeri"
                          }
                          className="px-2.5 py-1 text-[0.6875rem] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Terbitkan
                        </button>
                      )}

                      {asset.status === "published" && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleStatusChange(asset, "draft")}
                          className="px-2.5 py-1 text-[0.6875rem] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                        >
                          Jadikan Draft
                        </button>
                      )}

                      {!asset.hidden_at && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setTakedownAsset(asset)}
                          title="Tarik/Sembunyikan foto instan"
                          className="px-2 py-1 text-[0.6875rem] font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Tarik
                        </button>
                      )}
                    </div>

                    {role === "admin" && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleDelete(asset)}
                        aria-label="Hapus aset permanen"
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog Modal */}
      <MediaUploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(newAsset) => {
          setAssets((prev) => [newAsset, ...prev]);
          onNotification("success", "Foto berhasil diunggah dan diproses ke format web teroptimasi.");
        }}
        albums={albums}
      />

      {/* Takedown / Hide Dialog */}
      {takedownAsset && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md card-surface rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-navy flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Tarik Media dari Publik</span>
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan langsung menyembunyikan foto dari galeri publik jemaat dan mengubah statusnya menjadi draft.
            </p>

            <form onSubmit={handleTakedownSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Alasan Penarikan (Wajib, min 3 karakter) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={hiddenReason}
                  onChange={(e) => setHiddenReason(e.target.value)}
                  placeholder="Contoh: Permintaan keberatan privasi dari pihak jemaat yang bersangkutan"
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTakedownAsset(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || hiddenReason.trim().length < 3}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50"
                >
                  {isSubmitting ? "Memproses..." : "Konfirmasi Tarik Foto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
