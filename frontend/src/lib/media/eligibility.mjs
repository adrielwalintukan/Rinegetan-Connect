export function isMediaAssetDownloadEligible(asset) {
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

export function isMediaAlbumDownloadEligible(album) {
  if (!album) return false;
  if (album.status !== "published") return false;
  if (album.public_download_enabled !== true) return false;
  return true;
}
