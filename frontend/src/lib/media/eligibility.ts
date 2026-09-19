import type { MediaAsset, MediaAlbum } from "@/types/media";

export function isMediaAssetDownloadEligible(
  asset?: Partial<MediaAsset> | null
): boolean {
  if (!asset) return false;
  if (asset.status !== "published") return false;
  if (asset.consent_status !== "approved") return false;
  if (asset.hidden_at) return false;
  if (asset.public_download_enabled !== true) return false;

  // Child protection invariant
  if (asset.subject_age_group === "child" && asset.consent_status !== "approved") {
    return false;
  }

  return true;
}

export function isMediaAlbumDownloadEligible(
  album?: Partial<MediaAlbum> | null
): boolean {
  if (!album) return false;
  if (album.status !== "published") return false;
  if (album.public_download_enabled !== true) return false;
  return true;
}
