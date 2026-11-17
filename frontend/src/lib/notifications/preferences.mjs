// frontend/src/lib/notifications/preferences.mjs
// P5-003: category preferences for church notifications.
// Identity is the device/browser subscription (owner decision 2026-11-17), so nothing
// here stores an address or a number. A preference record only says which categories
// this subscription agreed to receive.

export const CATEGORIES = ["pengumuman", "ibadah", "pelajari-alkitab", "sekolah-sabat"];

/** Consent version handed to the audit record. Bump only with approved copy. */
export const CONSENT_VERSION = "2026-11-17";

/** Everything off. A fresh subscription receives nothing until someone opts in. */
export function emptyPreferences() {
  return Object.fromEntries(CATEGORIES.map((category) => [category, false]));
}

/**
 * Keep only known categories and accept only a real boolean `true`.
 * Anything else (strings, numbers, missing keys) is off, so a malformed
 * record can never silently enable delivery.
 * @param {unknown} value
 * @returns {Record<string, boolean>}
 */
export function normalizePreferences(value) {
  const result = emptyPreferences();
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  const record = /** @type {Record<string, unknown>} */ (value);
  for (const category of CATEGORIES) {
    result[category] = record[category] === true;
  }
  return result;
}

/** @param {Record<string, boolean>} prefs */
export function allOff(prefs) {
  const normalized = normalizePreferences(prefs);
  return CATEGORIES.every((category) => normalized[category] === false);
}

/** @param {Record<string, boolean>} prefs */
export function setAllOff(prefs) {
  void prefs;
  return emptyPreferences();
}

/**
 * The single gate every send must pass. Unknown categories and disabled
 * categories both return false.
 * @param {unknown} prefs
 * @param {unknown} category
 */
export function shouldDeliver(prefs, category) {
  if (typeof category !== "string" || !CATEGORIES.includes(category)) return false;
  return normalizePreferences(prefs)[category] === true;
}

/**
 * Audit record for a consent change. Only the enabled categories are kept,
 * never the per-category flags and never any contact detail.
 * @param {Record<string, boolean>} prefs
 * @param {Date} [now]
 */
export function buildConsentRecord(prefs, now = new Date()) {
  const normalized = normalizePreferences(prefs);
  const enabled = CATEGORIES.filter((category) => normalized[category]);
  if (enabled.length === 0) {
    throw new Error("Pilih minimal satu kategori sebelum menyimpan persetujuan.");
  }
  return {
    consent_version: CONSENT_VERSION,
    consented_at: now.toISOString(),
    enabled_categories: enabled,
  };
}
