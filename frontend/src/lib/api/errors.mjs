/** An error whose message is written for staff and is safe to show as-is. */
export class UserFacingError extends Error {}

const POSTGRES_MESSAGES = {
  "23502": "Ada kolom wajib yang belum diisi.",
  "23503": "Data terkait tidak ditemukan atau masih dipakai data lain.",
  "23505": "Data dengan judul atau slug yang sama sudah ada. Gunakan slug lain.",
  "23514": "Data belum lengkap atau tidak valid. Periksa kembali kolom yang wajib diisi.",
  "22P02": "Format data tidak valid.",
  "42501": "Anda tidak memiliki izin untuk melakukan tindakan ini.",
  PGRST116: "Data tidak ditemukan.",
};

export const GENERIC_ERROR_MESSAGE = "Terjadi kesalahan. Silakan coba lagi beberapa saat lagi.";

/**
 * Turns any thrown value into a message safe for the UI; database text never leaves the server.
 * @param {unknown} error
 * @param {string} [fallback]
 */
export function publicErrorMessage(error, fallback = GENERIC_ERROR_MESSAGE) {
  if (error instanceof UserFacingError) return error.message;
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  return POSTGRES_MESSAGES[code] || fallback;
}

/**
 * Message for a failed fetch in the browser: network failures and non-JSON replies become plain Indonesian.
 * @param {unknown} error
 * @param {string} fallback
 */
export function clientErrorMessage(error, fallback) {
  if (error instanceof TypeError || error instanceof SyntaxError) {
    return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.";
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
