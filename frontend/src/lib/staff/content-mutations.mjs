/**
 * Server-side mutation and validation rules for staff CMS operations.
 */

export const SUPPORTED_ENTITIES = [
  "announcements",
  "events",
  "departments",
  "schedules",
];

export const VALID_STATUSES = ["draft", "published", "archived"];

/**
 * Validates if the target status is a valid lifecycle status.
 * @param {string | null | undefined} currentStatus
 * @param {string | null | undefined} newStatus
 * @returns {boolean}
 */
export function validateStatusTransition(currentStatus, newStatus) {
  if (!newStatus || typeof newStatus !== "string") {
    return false;
  }
  return VALID_STATUSES.includes(newStatus);
}

/**
 * Validates that permanent deletion includes a meaningful explanation.
 * @param {unknown} reason
 * @returns {{ valid: boolean; reason?: string; message?: string }}
 */
export function validateDeletePayload(reason) {
  if (typeof reason !== "string") {
    return { valid: false, message: "Alasan penghapusan wajib diisi berupa teks" };
  }
  const trimmed = reason.trim();
  if (trimmed.length < 5) {
    return { valid: false, message: "Alasan penghapusan minimal 5 karakter" };
  }
  return { valid: true, reason: trimmed };
}

/**
 * Asserts that the caller has authority to mutate content (Editor or Admin).
 * @param {string} role
 */
export function assertCanMutateStatus(role) {
  if (role !== "editor" && role !== "admin") {
    const error = new Error("not_staff: Hanya staf aktif (Editor atau Admin) yang dapat mengelola konten");
    /** @type {any} */ (error).code = "not_staff";
    throw error;
  }
}

/**
 * Asserts that the caller is an Admin for permanent deletion.
 * @param {string} role
 */
export function assertCanDeletePermanently(role) {
  if (role !== "admin") {
    const error = new Error("not_admin: Hanya Admin yang berwenang melakukan penghapusan permanen");
    /** @type {any} */ (error).code = "not_admin";
    throw error;
  }
}
