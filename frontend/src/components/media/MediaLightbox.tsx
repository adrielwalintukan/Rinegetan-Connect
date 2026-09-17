/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { getMediaPublicUrl } from "@/lib/media/url";
import type { PublicMediaAssetItem } from "@/lib/public/queries";

export interface MediaLightboxProps {
  isOpen: boolean;
  currentIndex: number;
  items: PublicMediaAssetItem[];
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  isOpen,
  currentIndex,
  items,
  onClose,
  onNavigate,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const currentItem = items[currentIndex];

  const handlePrev = useCallback(() => {
    if (items.length <= 1) return;
    const nextIdx = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
    onNavigate(nextIdx);
  }, [currentIndex, items.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (items.length <= 1) return;
    const nextIdx = currentIndex === items.length - 1 ? 0 : currentIndex + 1;
    onNavigate(nextIdx);
  }, [currentIndex, items.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Lock background scroll when open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || !currentItem) {
    return null;
  }

  const imageUrl = getMediaPublicUrl(currentItem.storage_path);
  const albumInfo = currentItem.album_assets?.[0]?.album;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Penampil Foto"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/90 backdrop-blur-md p-4 sm:p-6 select-none transition-opacity duration-300"
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      {/* Top action bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-20">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs sm:text-sm text-slate-300 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
            {currentIndex + 1} dari {items.length}
          </span>
          {albumInfo?.title && (
            <span className="hidden sm:inline text-xs text-slate-300 bg-white/10 px-3 py-1 rounded-full">
              Album: {albumInfo.title}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup penampil foto"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-sabbath-400"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Buttons */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Foto sebelumnya"
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-all focus:outline-none focus:ring-2 focus:ring-sabbath-400 z-20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Foto selanjutnya"
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-all focus:outline-none focus:ring-2 focus:ring-sabbath-400 z-20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Main Image Container */}
      <div className="relative max-w-5xl max-h-[80vh] flex flex-col items-center justify-center z-10">
        <img
          src={imageUrl}
          alt={currentItem.alt_text}
          className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-300"
        />

        {/* Caption & Metadata Footer */}
        <div className="mt-3 text-center max-w-2xl px-4">
          <p className="text-sm sm:text-base font-medium text-white">
            {currentItem.caption || currentItem.alt_text}
          </p>
          {currentItem.alt_text !== currentItem.caption && currentItem.caption && (
            <p className="text-xs text-slate-400 mt-1">
              {currentItem.alt_text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
