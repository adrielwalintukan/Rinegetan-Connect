"use client";

import React, { useState, useMemo } from "react";
import { Folder, Image as ImageIcon, Calendar, Layers, X, Sparkles } from "lucide-react";
import { ChapterHeading } from "@/components/sections/ChapterHeading";
import { Reveal } from "@/components/motion/Reveal";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaLightbox } from "@/components/media/MediaLightbox";
import { getMediaPublicUrl } from "@/lib/media/url";
import { cn } from "@/lib/utils";
import type { PublicMediaAlbumItem, PublicMediaAssetItem } from "@/lib/public/queries";

export interface MediaPageProps {
  initialAlbums?: PublicMediaAlbumItem[];
  initialAssets?: PublicMediaAssetItem[];
}

const CATEGORIES = [
  "Semua",
  "Ibadah",
  "Pemuda",
  "Sekolah Sabat",
  "Sosial",
  "Fellowship",
  "Umum",
] as const;

export default function MediaPage({
  initialAlbums = [],
  initialAssets = [],
}: MediaPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  const selectedAlbum = useMemo(
    () => initialAlbums.find((a) => a.id === selectedAlbumId) || null,
    [initialAlbums, selectedAlbumId]
  );

  // Filter assets based on active category and selected album
  const filteredAssets = useMemo(() => {
    return initialAssets.filter((asset) => {
      // 1. Album filter
      if (selectedAlbumId) {
        const matchesAlbum = asset.album_assets?.some(
          (aa) => aa.album_id === selectedAlbumId
        );
        if (!matchesAlbum) return false;
      }

      // 2. Category filter
      if (selectedCategory !== "Semua") {
        const targetCategory = selectedCategory.toLowerCase().replace(/\s+/g, "_");
        const matchesCategory = asset.album_assets?.some(
          (aa) => aa.album?.category === targetCategory
        );
        if (!matchesCategory) return false;
      }

      return true;
    });
  }, [initialAssets, selectedAlbumId, selectedCategory]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <section data-testid="media-page" className="py-16 lg:py-24">
      <div className="container-site">
        <ChapterHeading
          number="01"
          eyebrow="Dokumentasi & Galeri"
          title={
            <>
              Galeri foto dan arsip{" "}
              <span className="font-serif italic text-sabbath-600">kegiatan</span>{" "}
              jemaat
            </>
          }
          description="Arsip dokumentasi visual ibadah, pelayanan masyarakat, dan kegiatan keluarga besar GMAHK Jemaat Rinegetan."
        />

        {/* TIER 1: Featured Albums Section */}
        {initialAlbums.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-sabbath-600" />
                <h2 className="text-xl font-semibold tracking-tight text-navy">
                  Album Kegiatan Pilihan
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {initialAlbums.length} Album
              </span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {initialAlbums.map((album, idx) => {
                const coverUrl = getMediaPublicUrl(album.cover?.storage_path);
                const isSelected = selectedAlbumId === album.id;

                return (
                  <Reveal key={album.id} delay={0.05 * idx}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAlbumId(isSelected ? null : album.id);
                      }}
                      className={cn(
                        "group w-full text-left card-surface flex flex-col overflow-hidden transition-all duration-300 rounded-2xl border",
                        isSelected
                          ? "ring-2 ring-sabbath-500 border-sabbath-500 shadow-md"
                          : "hover:border-navy/30 hover:shadow-sm"
                      )}
                    >
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                        <img
                          src={coverUrl}
                          alt={`Sampul album: ${album.title}`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        <span className="chip absolute left-3 top-3 !bg-white/90 shadow-sm capitalize">
                          {album.category.replace(/_/g, " ")}
                        </span>
                        <div className="absolute right-3 bottom-3 flex items-center gap-1.5 bg-navy-950/75 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                          <Layers className="h-3.5 w-3.5" />
                          <span>{album.photo_count} Foto</span>
                        </div>
                      </div>

                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="text-base font-semibold tracking-tight text-navy group-hover:text-sabbath-700 transition-colors">
                          {album.title}
                        </h3>
                        {album.description && (
                          <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {album.description}
                          </p>
                        )}
                        <div className="mt-4 pt-3 border-t border-navy/[0.07] flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(album.occurred_on).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-sabbath-600 font-medium">
                            {isSelected ? "Filter Aktif ✓" : "Lihat Album →"}
                          </span>
                        </div>
                      </div>
                    </button>
                  </Reveal>
                );
              })}
            </div>
          </div>
        )}

        {/* TIER 2: Category Filter Pills Bar & Photo Grid */}
        <div className="mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div
              role="group"
              aria-label="Saring media berdasarkan jenis kategori"
              className="flex flex-wrap gap-2"
            >
              {CATEGORIES.map((type) => (
                <button
                  key={type}
                  type="button"
                  data-testid={`media-filter-${type.toLowerCase().replace(/\s+/g, "-")}`}
                  aria-pressed={selectedCategory === type}
                  onClick={() => setSelectedCategory(type)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs sm:text-[0.8125rem] font-semibold transition-all duration-200",
                    selectedCategory === type
                      ? "border-navy bg-navy text-white shadow-sm"
                      : "border-navy/15 bg-white text-slate-600 hover:border-navy/40 hover:text-navy"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            {selectedAlbum && (
              <div className="flex items-center gap-2 bg-sabbath-50 border border-sabbath-200 text-sabbath-800 text-xs px-3.5 py-1.5 rounded-full self-start">
                <span>
                  Album: <strong>{selectedAlbum.title}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedAlbumId(null)}
                  aria-label="Hapus filter album"
                  className="p-0.5 hover:bg-sabbath-200/60 rounded-full transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Photo Grid or Empty State */}
          {filteredAssets.length === 0 ? (
            <div className="mt-10">
              <EmptyState
                icon={ImageIcon}
                title="Belum Ada Foto Dokumentasi"
                description={
                  selectedAlbum || selectedCategory !== "Semua"
                    ? "Tidak ada foto yang cocok dengan filter atau album yang dipilih. Coba pilih kategori lain atau bersihkan filter."
                    : "Belum ada arsip foto dokumentasi kegiatan yang diterbitkan untuk saat ini."
                }
                actionLabel={
                  selectedAlbum || selectedCategory !== "Semua"
                    ? "Reset Filter"
                    : undefined
                }
                actionHref={
                  selectedAlbum || selectedCategory !== "Semua" ? "#" : undefined
                }
                testId="empty-state-media"
              />
            </div>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAssets.map((asset, index) => {
                const assetUrl = getMediaPublicUrl(asset.storage_path);
                const albumName = asset.album_assets?.[0]?.album?.title;

                return (
                  <Reveal key={asset.id} delay={0.03 * (index % 12)}>
                    <article
                      data-testid={`media-item-${asset.id}`}
                      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-navy/10 bg-slate-900 aspect-[4/3] shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                      onClick={() => openLightbox(index)}
                    >
                      <img
                        src={assetUrl}
                        alt={asset.alt_text}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-95 group-hover:opacity-100"
                      />

                      {/* Gradient overlay for text contrast */}
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 text-white">
                        <p className="text-xs sm:text-sm font-medium line-clamp-2 text-white">
                          {asset.caption || asset.alt_text}
                        </p>
                        {albumName && (
                          <span className="mt-1 text-[0.6875rem] font-mono text-sabbath-300">
                            {albumName}
                          </span>
                        )}
                      </div>

                      {/* Top badges */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-950/60 backdrop-blur-sm text-white">
                          <Sparkles className="h-4 w-4" />
                        </span>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Accessible Lightbox Modal */}
      <MediaLightbox
        isOpen={lightboxOpen}
        currentIndex={lightboxIndex}
        items={filteredAssets}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </section>
  );
}
