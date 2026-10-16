import sharp from "sharp";

export const DERIVATIVE_MAX_WIDTH = 1920;
export const DERIVATIVE_MAX_HEIGHT = 1920;
export const DERIVATIVE_JPEG_QUALITY = 82;

export interface JpegDerivativeResult {
  buffer: Buffer;
  width: number;
  height: number;
  bytes: number;
  mimeType: "image/jpeg";
}

/**
 * Menghasilkan derivatif JPEG teroptimasi untuk web dan membersihkan seluruh metadata EXIF/GPS.
 */
export async function createJpegDerivative(
  inputBuffer: Buffer
): Promise<JpegDerivativeResult> {
  const image = sharp(inputBuffer);

  // Auto-orient berdasarkan EXIF sebelum metadata dibersihkan
  image.rotate();

  // Resize dengan fit inside tanpa pembesaran (no enlargement)
  image.resize({
    width: DERIVATIVE_MAX_WIDTH,
    height: DERIVATIVE_MAX_HEIGHT,
    fit: "inside",
    withoutEnlargement: true,
  });

  // Konversi ke format JPEG dengan kualitas 82, progressive, dan subsampling 4:2:0
  // Membiarkan default tanpa pemanggilan .withMetadata() otomatis menghapus semua EXIF/GPS
  image.jpeg({
    quality: DERIVATIVE_JPEG_QUALITY,
    progressive: true,
    chromaSubsampling: "4:2:0",
  });

  const { data, info } = await image.toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    bytes: data.length,
    mimeType: "image/jpeg",
  };
}
