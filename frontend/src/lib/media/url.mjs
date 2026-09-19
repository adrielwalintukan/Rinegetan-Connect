export function getMediaPublicUrl(storagePath) {
  if (!storagePath) {
    return "/images/placeholder-media.jpg";
  }

  if (
    storagePath.startsWith("http://") ||
    storagePath.startsWith("https://") ||
    storagePath.startsWith("/")
  ) {
    return storagePath;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = storagePath.startsWith("/") ? storagePath.slice(1) : storagePath;

  return `${cleanBase}/storage/v1/object/public/media/${cleanPath}`;
}
