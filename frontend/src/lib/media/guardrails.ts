import sharp, { type Metadata } from "sharp";

export const ALLOWED_MIME_TYPES: readonly string[] = [
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

export interface StorageQuotaMetrics {
  usedBytes: number;
  totalCapacityBytes: number;
  percentageUsed: number;
  remainingBytes: number;
  isWarning: boolean;
  isFrozen: boolean;
  isExceeded: boolean;
}

export type GuardrailValidationResult =
  | {
      valid: true;
      width: number;
      height: number;
      format?: string;
    }
  | {
      valid: false;
      error:
        | "invalid_file_type"
        | "file_too_large"
        | "invalid_image_buffer"
        | "dimensions_exceeded";
      message: string;
    };

/**
 * Menghitung persentase dan ambang batas kuota penyimpanan pilot 1 GB.
 */
export function getStorageQuotaMetrics(usedBytes: number): StorageQuotaMetrics {
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

/**
 * Memvalidasi guardrails upload gambar (MIME, ukuran, dan dimensi piksel).
 */
export async function validateUploadGuardrails(
  buffer: Buffer,
  mimeType: string,
  byteLength: number
): Promise<GuardrailValidationResult> {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: "invalid_file_type",
      message: "Hanya format JPEG, PNG, dan WebP yang didukung",
    };
  }

  if (byteLength > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      error: "file_too_large",
      message: "Ukuran file melebihi batas maksimal 15 MB",
    };
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    return {
      valid: false,
      error: "invalid_image_buffer",
      message: "File gambar rusak atau tidak dapat dibaca",
    };
  }

  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const totalPixels = width * height;

  if (
    width > MAX_PIXEL_DIMENSION ||
    height > MAX_PIXEL_DIMENSION ||
    totalPixels > MAX_TOTAL_PIXELS
  ) {
    return {
      valid: false,
      error: "dimensions_exceeded",
      message:
        "Dimensi gambar melebihi batas maksimal 6.000 piksel atau 25 megapiksel",
    };
  }

  return {
    valid: true,
    width,
    height,
    format: metadata.format,
  };
}
