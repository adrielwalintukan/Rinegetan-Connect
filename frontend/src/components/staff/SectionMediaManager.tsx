/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef } from "react";
import {
  Image as ImageIcon,
  UploadCloud,
  FolderOpen,
  RotateCcw,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IMAGES } from "@/data/content";
import { MediaUploadDialog } from "./MediaUploadDialog";
import { getMediaPublicUrl } from "@/lib/media/url";
import type { MediaAsset, MediaAlbum } from "@/types/media";
import type { SiteSectionMediaMap, SectionMediaKey } from "@/lib/public/queries";
import { clientErrorMessage } from "@/lib/api/errors";
import { Modal, MODAL_BACKDROP } from "@/components/ui/modal";

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
  sectionMedia?: SiteSectionMediaMap;
  onSectionMediaChange?: React.Dispatch<React.SetStateAction<SiteSectionMediaMap>>;
  mediaAssets?: MediaAsset[];
  mediaAlbums?: MediaAlbum[];
}

export const SectionMediaManager: React.FC<SectionMediaManagerProps> = ({
  initialSectionMedia = {},
  sectionMedia: externalSectionMedia,
  onSectionMediaChange,
  mediaAssets = [],
  mediaAlbums = [],
}) => {
  const router = useRouter();
  const [internalSectionMedia, setInternalSectionMedia] = useState<SiteSectionMediaMap>(initialSectionMedia);
  const currentSectionMedia = externalSectionMedia || internalSectionMedia;
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Picker modal state
  const [pickerSectionKey, setPickerSectionKey] = useState<SectionMediaKey | null>(null);

  // Upload dialog state
  const [uploadSectionKey, setUploadSectionKey] = useState<SectionMediaKey | null>(null);
  const activeUploadingSectionRef = useRef<SectionMediaKey | null>(null);

  // Published & eligible assets for picker
  const eligibleAssets = mediaAssets.filter(
    (a) => a.status === "published" && a.consent_status === "approved" && !a.hidden_at
  );

  const handleSelectAsset = async (sectionKey: SectionMediaKey, asset: MediaAsset) => {
    try {
      setSavingKey(sectionKey);
      setPickerSectionKey(null);

      const currentPos = currentSectionMedia[sectionKey]?.object_position || "center";
      const res = await fetch("/api/staff/settings/section-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_key: sectionKey,
          asset_id: asset.id,
          custom_alt_text: asset.alt_text,
          custom_caption: asset.caption,
          object_position: currentPos,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Gagal memperbarui gambar seksi.");
      }

      const mediaUrl = getMediaPublicUrl(asset.storage_path);
      const updatedItem = {
        section_key: sectionKey,
        asset_id: asset.id,
        image_url: mediaUrl,
        url: mediaUrl,
        alt_text: asset.alt_text,
        caption: asset.caption,
        object_position: currentPos,
      };

      if (onSectionMediaChange) {
        onSectionMediaChange((prev) => ({
          ...prev,
          [sectionKey]: updatedItem,
        }));
      } else {
        setInternalSectionMedia((prev) => ({
          ...prev,
          [sectionKey]: updatedItem,
        }));
      }

      router.refresh();
      toast.success(`Gambar untuk seksi berhasil diperbarui.`);
    } catch (err: unknown) {
      const msg = clientErrorMessage(err, "Terjadi kesalahan.");
      toast.error(msg);
    } finally {
      setSavingKey(null);
    }
  };

  const handleUpdatePosition = async (sectionKey: SectionMediaKey, position: string) => {
    const current = currentSectionMedia[sectionKey];
    if (!current || !current.asset_id) return;
    try {
      setSavingKey(sectionKey);
      const res = await fetch("/api/staff/settings/section-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_key: sectionKey,
          asset_id: current.asset_id,
          custom_alt_text: current.alt_text,
          custom_caption: current.caption,
          object_position: position,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Gagal memperbarui posisi gambar.");
      }

      const updatedItem = {
        ...current,
        object_position: position,
      };

      if (onSectionMediaChange) {
        onSectionMediaChange((prev) => ({
          ...prev,
          [sectionKey]: updatedItem,
        }));
      } else {
        setInternalSectionMedia((prev) => ({
          ...prev,
          [sectionKey]: updatedItem,
        }));
      }

      router.refresh();
      toast.success("Posisi tampilan gambar berhasil diperbarui.");
    } catch (err: unknown) {
      toast.error(clientErrorMessage(err, "Gagal mengubah posisi gambar."));
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Gagal mereset gambar seksi.");
      }

      if (onSectionMediaChange) {
        onSectionMediaChange((prev) => {
          const copy = { ...prev };
          delete copy[sectionKey];
          return copy;
        });
      } else {
        setInternalSectionMedia((prev) => {
          const copy = { ...prev };
          delete copy[sectionKey];
          return copy;
        });
      }

      router.refresh();
      toast.success(`Seksi dikembalikan ke gambar bawaan.`);
    } catch (err: unknown) {
      const msg = clientErrorMessage(err, "Terjadi kesalahan.");
      toast.error(msg);
    } finally {
      setSavingKey(null);
    }
  };

  const handleUploadSuccess = async (newAsset: MediaAsset) => {
    const targetKey = activeUploadingSectionRef.current || uploadSectionKey;
    activeUploadingSectionRef.current = null;
    setUploadSectionKey(null);
    if (!targetKey) return;
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
          const current = currentSectionMedia[config.key];
          const isCustom = Boolean(current && current.image_url);
          const activeSrc = isCustom ? current.image_url : config.defaultSrc;
          const activeAlt = isCustom ? current.alt_text : config.defaultAlt;
          const activeCaption = isCustom ? current.caption : config.defaultCaption;
          const activePosition = current?.object_position || "center";
          const isBusy = savingKey === config.key;

          const positionClass =
            activePosition === "contain"
              ? "object-contain"
              : activePosition === "bottom"
              ? "object-cover object-bottom"
              : activePosition === "top"
              ? "object-cover object-top"
              : "object-cover object-center";

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
                    className={`w-full h-full ${positionClass}`}
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {isCustom ? (
                      <span className="chip bg-emerald-500 text-white font-semibold shadow-sm text-xs">
                        Kustom Aktif
                      </span>
                    ) : (
                      <span className="chip bg-navy-900/70 text-slate-200 backdrop-blur-sm text-xs">
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
                    {isCustom && (
                      <div className="pt-2 border-t border-navy/5 flex flex-col gap-1.5">
                        <span className="text-[0.6875rem] font-semibold text-slate-700">
                          Penyesuaian Tampilan (Fokus Foto):
                        </span>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { id: "top", label: "Atas" },
                            { id: "center", label: "Tengah" },
                            { id: "bottom", label: "Bawah" },
                            { id: "contain", label: "Utuh (Fit)" },
                          ].map((pos) => {
                            const isSelected = activePosition === pos.id;
                            return (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() => handleUpdatePosition(config.key, pos.id)}
                                disabled={isBusy}
                                className={`py-1 px-1 text-[0.6875rem] font-medium rounded-lg border transition text-center ${
                                  isSelected
                                    ? "bg-navy text-white border-navy shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                {pos.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
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
                  onClick={() => {
                    activeUploadingSectionRef.current = config.key;
                    setUploadSectionKey(config.key);
                  }}
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
      <Modal
        isOpen={Boolean(pickerSectionKey)}
        onClose={() => setPickerSectionKey(null)}
        className={MODAL_BACKDROP}
        label="Pilih foto dari galeri media"
      >
        {pickerSectionKey && (
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
                        <div className="absolute inset-0 bg-navy-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
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
        )}
      </Modal>

      {/* Direct Upload Dialog */}
      <MediaUploadDialog
        key={uploadSectionKey || "closed"}
        isOpen={Boolean(uploadSectionKey)}
        onClose={() => {
          activeUploadingSectionRef.current = null;
          setUploadSectionKey(null);
        }}
        onSuccess={handleUploadSuccess}
        albums={mediaAlbums}
        defaultConsent="approved"
        autoPublish={true}
      />
    </div>
  );
};
