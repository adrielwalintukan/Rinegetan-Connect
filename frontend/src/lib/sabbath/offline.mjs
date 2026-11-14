/** @typedef {{ version: 1, quarterId: string, lessonIds: string[], sizeBytes: number, createdAt: string, label: string }} LocalManifest */

// Issue #53 requires download/offline to stay off until the P4-005 rights gate passes. The gate is a
// constant, not a parameter, so no caller can switch it on by passing a flag.
export const OFFLINE_ENABLED = false;

/** @returns {boolean} */
export function offlineEnabled() {
  return OFFLINE_ENABLED;
}

const quarterIdPattern = /^\d{4}-0[1-4]$/;
const lessonIdPattern = /^\d{2}$/;
const dayKeyPattern = /^(\d{4}-0[1-4])\/(\d{2})\/\d{2}$/;

/** @param {unknown} value @returns {value is string} */
function isQuarterId(value) {
  return typeof value === "string" && quarterIdPattern.test(value);
}

/** @param {unknown} value @returns {value is string[]} */
function isLessonIds(value) {
  return Array.isArray(value) && value.length > 0 &&
    value.every(item => typeof item === "string" && lessonIdPattern.test(item)) &&
    new Set(value).size === value.length;
}

/** @param {unknown} value @returns {value is string} */
function isTimestamp(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value;
}

/** @param {unknown} value @returns {value is number} */
function isSize(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

// Decimal MB with a comma, because the label is read by Indonesian visitors.
function sizeLabel(bytes) {
  return bytes < 1_000_000
    ? `${Math.max(1, Math.round(bytes / 1_000))} KB`
    : `${(bytes / 1_000_000).toFixed(1).replace(".", ",")} MB`;
}

/** Builds the manifest contract from validated ids only. Returns null instead of a partial manifest.
 * @param {{ quarterId: string, lessonIds: string[], sizeBytes: number, createdAt: string, version?: number }} input
 * @returns {LocalManifest | null}
 */
export function createManifest(input) {
  const version = input?.version ?? 1;
  if (!isQuarterId(input?.quarterId) || !isLessonIds(input?.lessonIds) ||
      !isSize(input?.sizeBytes) || !isTimestamp(input?.createdAt) ||
      !Number.isInteger(version) || version < 1) return null;
  return {
    version,
    quarterId: input.quarterId,
    lessonIds: [...input.lessonIds],
    sizeBytes: input.sizeBytes,
    createdAt: input.createdAt,
    label: `${input.quarterId} · ${input.lessonIds.length} pelajaran · ${sizeLabel(input.sizeBytes)}`,
  };
}

/** Storage is a trust boundary: a stored manifest is rebuilt from scratch, never spread in.
 * @param {string | null | undefined} raw
 * @returns {LocalManifest | null}
 */
export function parseManifest(raw) {
  if (typeof raw !== "string") return null;
  let value;
  try { value = JSON.parse(raw); } catch { return null; }
  if (value === null || typeof value !== "object" || Array.isArray(value) || value.version !== 1) return null;
  const manifest = createManifest(value);
  // The label is derived, so a stored label that disagrees means the file was edited.
  return manifest && manifest.label === value.label ? manifest : null;
}

/** @param {LocalManifest | null} stored @param {LocalManifest | null} candidate @returns {boolean} */
export function updateAvailable(stored, candidate) {
  if (!stored || !candidate) return false;
  if (stored.quarterId !== candidate.quarterId) return false;
  return candidate.version > stored.version;
}

/** @param {Record<string, boolean>} progress @param {LocalManifest | null} stored @param {LocalManifest | null} next
 * @returns {Record<string, boolean>}
 */
export function carryProgress(progress, stored, next) {
  const kept = {};
  if (!stored || !next || !progress || typeof progress !== "object") return kept;
  const allowed = new Set(next.lessonIds.map(id => `${next.quarterId}/${id}`));
  for (const [key, value] of Object.entries(progress)) {
    const match = dayKeyPattern.exec(key);
    if (!match || value !== true) continue;
    if (allowed.has(`${match[1]}/${match[2]}`)) kept[key] = true;
  }
  return kept;
}
