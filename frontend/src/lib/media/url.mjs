// The media bucket is private, so images are served through /api/media/file (storage RLS applies there).
export function getMediaPublicUrl(storagePath) {
  if (!storagePath) {
    return "/adventist-symbol.svg";
  }

  if (storagePath.startsWith("http://") || storagePath.startsWith("https://") || storagePath.startsWith("/")) {
    return storagePath;
  }

  return `/api/media/file/${storagePath}`;
}
