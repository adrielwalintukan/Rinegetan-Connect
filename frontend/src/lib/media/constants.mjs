export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_PIXEL_DIMENSION = 6000;
export const MAX_TOTAL_PIXELS = 25_000_000; // 25 Megapixels

export const STORAGE_CAPACITY_BYTES = 1024 * 1024 * 1024; // 1 GB (1,073,741,824 bytes)
export const STORAGE_WARNING_THRESHOLD = 0.70; // 70%
export const STORAGE_FREEZE_THRESHOLD = 0.85; // 85%

export function getStorageQuotaMetrics(usedBytes) {
  const safeUsedBytes = Math.max(0, Number(usedBytes) || 0);
  const percentageUsed = Math.min(
    100,
    Math.round((safeUsedBytes / STORAGE_CAPACITY_BYTES) * 10000) / 100
  );

  const ratio = safeUsedBytes / STORAGE_CAPACITY_BYTES;
  const isWarning = ratio >= STORAGE_WARNING_THRESHOLD;
  const isFrozen = ratio >= STORAGE_FREEZE_THRESHOLD;
  const isExceeded = safeUsedBytes >= STORAGE_CAPACITY_BYTES;
  const remainingBytes = Math.max(0, STORAGE_CAPACITY_BYTES - safeUsedBytes);

  return {
    usedBytes: safeUsedBytes,
    totalCapacityBytes: STORAGE_CAPACITY_BYTES,
    percentageUsed,
    remainingBytes,
    isWarning,
    isFrozen,
    isExceeded,
  };
}
