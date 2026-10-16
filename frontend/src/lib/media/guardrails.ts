import sharp, { type Metadata } from "sharp";

export * from "./constants";
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_PIXEL_DIMENSION,
  MAX_TOTAL_PIXELS,
} from "./constants";

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
