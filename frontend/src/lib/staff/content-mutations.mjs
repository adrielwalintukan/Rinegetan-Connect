/**
 * Server-side mutation and validation rules for staff CMS operations.
 */

export const SUPPORTED_ENTITIES = [
  "announcements",
  "events",
  "departments",
  "schedules",
  "media_assets",
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

/**
 * Whitelist of allowed database columns per entity type to prevent invalid column errors.
 */
export const ALLOWED_FIELDS = {
  announcements: [
    "title",
    "slug",
    "summary",
    "body",
    "department_id",
    "cover_asset_id",
    "status",
    "published_at",
  ],
  events: [
    "title",
    "slug",
    "summary",
    "body",
    "starts_at",
    "ends_at",
    "all_day",
    "timezone",
    "venue",
    "department_id",
    "cover_asset_id",
    "status",
    "published_at",
  ],
  schedules: [
    "name",
    "slug",
    "day_of_week",
    "start_time",
    "end_time",
    "location",
    "category",
    "status",
  ],
  departments: [
    "name",
    "slug",
    "description",
    "status",
  ],
  media_assets: [
    "hidden_at",
    "hidden_reason",
    "status",
    "alt_text",
    "caption",
    "category",
    "public_download_enabled",
  ],
};

/**
 * Appends +08:00 offset to local YYYY-MM-DDTHH:mm if no offset/Z is present.
 * @param {string} dt
 * @returns {string}
 */
export function normalizeWitaDateTime(dt) {
  const trimmed = dt.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(trimmed)) {
    const withSecs = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
    return `${withSecs}+08:00`;
  }
  return trimmed;
}

/**
 * Sanitizes and normalizes payload for saving an entity.
 * Strips unknown fields (e.g. invalid category on events) and ensures valid timestamps.
 * @param {string} entityType
 * @param {Record<string, unknown>} rawData
 * @returns {Record<string, unknown>}
 */
export function sanitizeSavePayload(entityType, rawData) {
  const allowed = ALLOWED_FIELDS[entityType];
  if (!allowed || !rawData || typeof rawData !== "object") return rawData;

  const result = {};
  for (const key of allowed) {
    if (key in rawData && rawData[key] !== undefined) {
      result[key] = rawData[key];
    }
  }

  // Format events starts_at and ends_at for WITA (UTC+8) and handle summary fallback
  if (entityType === "events") {
    if (!result.summary && rawData.description) {
      result.summary = String(rawData.description).slice(0, 500);
    }
    if (typeof result.starts_at === "string" && result.starts_at) {
      result.starts_at = normalizeWitaDateTime(result.starts_at);
    }
    if (typeof result.ends_at === "string" && result.ends_at) {
      result.ends_at = normalizeWitaDateTime(result.ends_at);
    }
    if (!result.venue) {
      result.venue = "GMAHK Rinegetan";
    }
    if (!result.timezone) {
      result.timezone = "Asia/Makassar";
    }
  }

  if (entityType === "announcements") {
    if (!result.summary && rawData.description) {
      result.summary = String(rawData.description).slice(0, 500);
    }
  }

  if (result.cover_asset_id === "") {
    result.cover_asset_id = null;
  }
  if (result.department_id === "") {
    result.department_id = null;
  }

  return result;
}

