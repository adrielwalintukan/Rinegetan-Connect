/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import {
  Image as ImageIcon,
  UploadCloud,
  FolderOpen,
  RotateCcw,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { IMAGES } from "@/data/content";
import { MediaUploadDialog } from "./MediaUploadDialog";
import { getMediaPublicUrl } from "@/lib/media/url";
import type { MediaAsset, MediaAlbum } from "@/types/media";
import type { SiteSectionMediaMap, SectionMediaKey } from "@/lib/public/queries";

interface SectionConfig {
  key: SectionMediaKey;
  title: string;
  description: string;
  defaultSrc: string;
  defaultAlt: string;
  defaultCaption?: string;
  aspectRatio: string;
}

const SECTION_CONFIGS: SectionConfig[] = [
  {
    key: "home_hero",
    title: "Hero Beranda (Puncak Halaman Utama)",
    description: "Gambar utama pada puncak beranda yang menampilkan dokumentasi ibadah sabat jemaat.",
    defaultSrc: IMAGES.hero.src,
    defaultAlt: IMAGES.hero.alt,
    defaultCaption: IMAGES.hero.caption,
    aspectRatio: "aspect-[16/9]",
  },
  {
    key: "home_welcome",
    title: "Sambutan Beranda (Selamat Datang)",
    description: "Foto pada seksi 'Selamat Datang di GMAHK Rinegetan' di samping poin-poin pelayanan.",
    defaultSrc: IMAGES.fellowship.src,
    defaultAlt: IMAGES.fellowship.alt,
    aspectRatio: "aspect-[4/3]",
  },
  {
    key: "sekolah_sabat",
    title: "Halaman Sekolah Sabat",
    description: "Foto dokumentasi kelas dan diskusi Alkitab pada halaman rute /sekolah-sabat.",
    defaultSrc: IMAGES.bibleStudy.src,
    defaultAlt: IMAGES.bibleStudy.alt,
    aspectRatio: "aspect-[16/9]",
  },
  {
    key: "tentang_kami",
    title: "Halaman Tentang Kami",
    description: "Foto komunitas dan pelayanan masyarakat pada halaman rute /tentang-kami.",
    defaultSrc: IMAGES.community.src,
    defaultAlt: IMAGES.community.alt,
    aspectRatio: "aspect-[16/9]",
  },
];

interface SectionMediaManagerProps {
  initialSectionMedia?: SiteSectionMediaMap;
  mediaAssets?: MediaAsset[];
  mediaAlbums?: MediaAlbum[];
}

export const SectionMediaManager: React.FC<SectionMediaManagerProps> = ({
  initialSectionMedia = {},
  mediaAssets = [],
  mediaAlbums = [],
}) => {
  const [sectionMedia, setSectionMedia] = useState<SiteSectionMediaMap>(initialSectionMedia);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Picker modal state
  const [pickerSectionKey, setPickerSectionKey] = useState<SectionMediaKey | null>(null);

  // Upload dialog state
  const [uploadSectionKey, setUploadSectionKey] = useState<SectionMediaKey | null>(null);

  // Published & eligible assets for picker
  const eligibleAssets = mediaAssets.filter(
    (a) => a.status === "published" && a.consent_status === "approved" && !a.hidden_at
  );

  const handleSelectAsset = async (sectionKey: SectionMediaKey, asset: MediaAsset) => {
    try {
      setSavingKey(sectionKey);
      setPickerSectionKey(null);

      const res = await fetch("/api/staff/settings/section-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_key: sectionKey,
          asset_id: asset.id,
          custom_alt_text: asset.alt_text,
          custom_caption: asset.caption,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal memperbarui gambar seksi.");
      }

      setSectionMedia((prev) => ({
        ...prev,
        [sectionKey]: {
          section_key: sectionKey,
          asset_id: asset.id,
          image_url: getMediaPublicUrl(asset.storage_path),
          alt_text: asset.alt_text,
          caption: asset.caption,
        },
      }));

      toast.success(`Gambar untuk seksi berhasil diperbarui.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      toast.error(msg);
    } finally {
      setSavingKey(null);
    }
  };

  const handleResetToDefault = async (sectionKey: SectionMediaKey) => {
    try {
      setSavingKey(sectionKey);
      const res = await fetch("/api/staff/settings/section-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_key: sectionKey,
          reset: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal mereset gambar seksi.");
      }

      setSectionMedia((prev) => {
        const copy = { ...prev };
        delete copy[sectionKey];
        return copy;
      });

      toast.success(`Seksi dikembalikan ke gambar bawaan.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      toast.error(msg);
    } finally {
      setSavingKey(null);
    }
  };

  const handleUploadSuccess = async (newAsset: MediaAsset) => {
    if (!uploadSectionKey) return;
    const targetKey = uploadSectionKey;
    setUploadSectionKey(null);
    await handleSelectAsset(targetKey, newAsset);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-navy">
          Pengelolaan Banner & Foto Seksi Halaman
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Ubah foto dan teks pendukung pada bagian utama website publik tanpa harus mengubah source code.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {SECTION_CONFIGS.map((config) => {
          const current = sectionMedia[config.key];
          const isCustom = Boolean(current && current.image_url);
          const activeSrc = isCustom ? current.image_url : config.defaultSrc;
          const activeAlt = isCustom ? current.alt_text : config.defaultAlt;
          const activeCaption = isCustom ? current.caption : config.defaultCaption;
          const isBusy = savingKey === config.key;

          return (
            <div
              key={config.key}
              data-testid={`section-card-${config.key}`}
              className="card-surface rounded-2xl border border-navy/10 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Image Preview Header */}
                <div className={`relative w-full ${config.aspectRatio} bg-slate-900 overflow-hidden`}>
                  <img
                    src={activeSrc}
                    alt={activeAlt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {isCustom ? (
                      <span className="chip bg-emerald-500 text-white font-semibold shadow-sm text-xs">
                        Kustom Aktif
                      </span>
                    ) : (
                      <span className="chip bg-navy-950/70 text-slate-200 backdrop-blur-sm text-xs">
                        Gambar Bawaan (Default)
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-5">
                  <h3 className="text-base font-semibold text-navy">
                    {config.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {config.description}
                  </p>

                  <div className="mt-3 pt-3 border-t border-navy/5 space-y-1.5 text-xs text-slate-500">
                    <p>
                      <strong>Alt Text:</strong> {activeAlt}
                    </p>
                    {activeCaption && (
                      <p>
                        <strong>Caption:</strong> {activeCaption}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-5 pt-0 flex flex-wrap items-center gap-2 border-t border-navy/5 mt-4">
                <button
                  type="button"
                  onClick={() => setPickerSectionKey(config.key)}
                  disabled={isBusy}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 rounded-lg"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>Pilih dari Galeri</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadSectionKey(config.key)}
                  disabled={isBusy}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 rounded-lg text-sabbath-700 hover:text-sabbath-800"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Unggah Baru</span>
                </button>

                {isCustom && (
                  <button
                    type="button"
                    onClick={() => handleResetToDefault(config.key)}
                    disabled={isBusy}
                    title="Kembalikan ke gambar bawaan asli"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                  >
                    {isBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gallery Picker Modal */}
      {pickerSectionKey && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pilih foto dari galeri media"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 backdrop-blur-sm p-4"
        >
          <div className="card-surface rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-navy/20 overflow-hidden">
            <div className="p-5 border-b border-navy/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-navy">
                  Pilih Foto dari Galeri Media
                </h3>
                <p className="text-xs text-slate-500">
                  Hanya foto yang berstatus diterbitkan dan memiliki persetujuan yang dapat dipilih.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerSectionKey(null)}
                className="p-1 text-slate-400 hover:text-navy rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {eligibleAssets.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  <ImageIcon className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p>Belum ada foto yang berstatus diterbitkan di galeri.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {eligibleAssets.map((asset) => {
                    const url = getMediaPublicUrl(asset.storage_path);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleSelectAsset(pickerSectionKey, asset)}
                        className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-navy/10 hover:border-sabbath-500 focus:outline-none focus:ring-2 focus:ring-sabbath-400 text-left bg-slate-900"
                      >
                        <img
                          src={url}
                          alt={asset.alt_text}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-navy-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Check className="h-6 w-6" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-navy/10 flex justify-end">
              <button
                type="button"
                onClick={() => setPickerSectionKey(null)}
                className="btn-secondary text-xs"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Upload Dialog */}
      <MediaUploadDialog
        isOpen={Boolean(uploadSectionKey)}
        onClose={() => setUploadSectionKey(null)}
        onSuccess={handleUploadSuccess}
        albums={mediaAlbums}
      />
    </div>
  );
};
